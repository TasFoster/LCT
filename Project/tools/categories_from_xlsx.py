"""Справочник категорий Артёма (xlsx) -> categories.json для редактора.

Запуск из папки Project:
    python tools/categories_from_xlsx.py Книга1.xlsx editor2d/src/catalog/categories.json ../артём-стас.ods

Колонки xlsx: Название категории | К чему относится | Короткое описание | Пример.
В таблице нет id, поэтому id получается транслитерацией названия. Когда у Артёма
появятся свои id, их нужно брать из таблицы, а эту функцию убрать.

С `--dictionary=путь.json` тот же справочник дополнительно выгружается в форме,
принятой в визарде Владимирова (разделами: equipment_categories, working_zones,
point_kinds, tasks, environments) — чтобы форма и редактор читали один список.

Третий аргумент необязательный — та же таблица Артёма в .ods, где категории
разложены по разделам («1. Склад и внутрискладская логистика», «8. Авиационные
системы» и т.д.). Из неё берётся поле group: по нему редактор разбивает
оборудование в палитре. Категории, которых в .ods нет, получают group = null.
"""

import json
import re
import sys
import zipfile
from datetime import datetime, timezone

import openpyxl

TRANSLIT = dict(zip(
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p",
     "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya"],
))

# Как та же категория называется в справочнике визарда (Владимиров,
# contracts/dictionaries/categories.json): id категории Артёма -> его id.
# Нужно, чтобы форма и редактор понимали друг друга: в данных может прийти
# любое из названий, а означают они одно и то же. Список сверяется при
# генерации: несуществующий id категории или повтор чужого id — ошибка.
EXTERNAL_IDS = {
    # оборудование
    "amr": ["amr"],
    "robot_shtabeler": ["stacker"],
    "robot_tyagach": ["tug"],
    "bespilotnyy_pogruzchik": ["forklift"],
    "robot_uborschik": ["cleaner"],
    "statsionarnaya_sistema_umnogo_hraneniya": ["asrs"],
    "robot_sortirovschik": ["sorter"],
    "robot_kurer": ["delivery"],
    # зоны и точки: у визарда это «рабочие зоны» формы
    "zona_priemki": ["receiving"],
    "zona_hraneniya": ["storage"],
    "zona_komplektatsii": ["picking"],
    "zona_otgruzki": ["shipping"],
    "post_upakovki": ["packing"],
    "tochka_zaryadki": ["charging"],
}

# «Зона …» из группы «точка на плане» -> тип зоны по контракту сцены (по умолчанию operation)
ZONE_TYPES = {
    "Зона хранения": "storage",
    "Зона стерильности": "restricted",
    "Зона маневрирования": "transit",
    "Зона стоянки": "transit",
    "Зона ожидания": "transit",
}


def make_id(name: str) -> str:
    s = "".join(TRANSLIT.get(ch, ch) for ch in name.lower())
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def classify(name: str, applies_to: str, description: str) -> str:
    """Во что категория превращается в редакторе."""
    a = applies_to.lower()
    if a == "оборудование":
        return "software" if name.startswith("ПО") else "equipment"
    if a == "характеристика":
        return "characteristic"
    if a == "точка на плане":
        return "place_zone" if name.startswith("Зона") else "place_point"
    # «точка на плане / и то и другое»: условия среды описаны как «Работа …», остальное — задачи
    return "environment" if description.startswith("Работа") else "task"


def read_groups(path: str) -> dict[str, str]:
    """Название категории -> раздел таблицы (.ods). Раздел — строка, где заполнена
    только первая ячейка и она начинается с номера: «1. Склад и внутрискладская логистика»."""
    xml = zipfile.ZipFile(path).read("content.xml").decode("utf-8")
    xml = xml.replace("</table:table-row>", "\n").replace("</table:table-cell>", "|")
    groups: dict[str, str] = {}
    section = None
    for line in re.sub(r"<[^>]+>", "", xml).split("\n"):
        cells = [c.strip() for c in line.split("|")]
        if not cells or not cells[0]:
            continue
        if len(cells) < 3 or not cells[1]:
            if re.match(r"^\d+\.\s", cells[0]):
                section = cells[0]
            continue
        if cells[0] != "Название категории" and section:
            groups.setdefault(cells[0], section)
    if not groups:
        sys.exit(f"в {path} не нашлось ни одной категории с разделом — проверь формат файла")
    return groups


#: Разделы справочника визарда: как он называет то, что у Артёма отличается видом (kind)
DICTIONARY_SECTIONS = [
    ("equipment_categories", "equipment"),
    ("working_zones", "place_zone"),
    ("point_kinds", "place_point"),
    ("tasks", "task"),
    ("environments", "environment"),
]


def write_dictionary(categories: list[dict], dst: str) -> None:
    """Тот же справочник в форме, принятой в визарде (contracts/dictionaries/categories.json):
    разделами, с главным id и списком других названий той же категории.

    Главный id — английский, если он уже заведён у Владимирова (тогда наш транслит уходит
    в aliases); у остальных категорий главным остаётся транслит из таблицы Артёма, потому
    что английского названия для них никто не утверждал — придумывать его скрипту нельзя.
    """
    out: dict = {
        "$comment": (
            "Собран скриптом tools/categories_from_xlsx.py из таблицы Артёма — руками не править. "
            "id — главное название категории, aliases — как её же называют в другом справочнике; "
            "и то и другое означает одну категорию. group — раздел таблицы Артёма."
        ),
        "version": 3,
        "source": "Книга1.xlsx + артём-стас.ods",
    }
    for section, kind in DICTIONARY_SECTIONS:
        items = []
        for c in categories:
            if c["kind"] != kind:
                continue
            external = c["aliases"]
            main_id = external[0] if external else c["id"]
            other = [a for a in ([c["id"]] + external[1:] if external else []) if a != main_id]
            item = {"id": main_id, "label": c["name"], "aliases": other, "group": c["group"]}
            if kind == "place_zone":
                item["zone_type"] = c["zone_type"]
            if kind == "place_point":
                item["point_kind"] = c["point_kind"]
            items.append(item)
        out[section] = items
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"справочник для визарда -> {dst}: " + ", ".join(f"{s} {len(out[s])}" for s, _ in DICTIONARY_SECTIONS))


def main(src: str, dst: str, groups_src: str | None = None, dictionary_dst: str | None = None) -> None:
    groups = read_groups(groups_src) if groups_src else {}
    ws = openpyxl.load_workbook(src, data_only=True).active
    rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r and r[0]]

    categories, seen = [], set()
    for name, applies_to, description, examples in rows:
        name, applies_to = str(name).strip(), str(applies_to or "").strip()
        description = str(description or "").strip()
        cid = make_id(name)
        if cid in seen:
            sys.exit(f"повторяющийся id {cid!r} у категории {name!r}")
        seen.add(cid)

        kind = classify(name, applies_to, description)
        item = {
            "id": cid,
            "name": name,
            "kind": kind,
            "group": groups.get(name),  # раздел таблицы Артёма; null — в .ods такой строки нет
            "aliases": EXTERNAL_IDS.get(cid, []),  # те же категории в справочнике визарда
            "applies_to": applies_to,
            "description": description,
            "examples": [e.strip() for e in str(examples or "").split(",") if e.strip()],
        }
        if kind == "place_zone":
            item["zone_type"] = ZONE_TYPES.get(name, "operation")
        if kind == "place_point":
            item["point_kind"] = "charging" if name == "Точка зарядки" else "operation"
        categories.append(item)

    # сверяем таблицу соответствий: опечатка в ней тихо разорвала бы связь формы и редактора
    unknown = [cid for cid in EXTERNAL_IDS if cid not in seen]
    if unknown:
        sys.exit(f"в EXTERNAL_IDS есть id, которых нет в таблице: {unknown}")
    used: dict[str, str] = {}
    for cid, external in EXTERNAL_IDS.items():
        for e in external:
            if e in used:
                sys.exit(f"чужой id {e!r} указан сразу у {used[e]!r} и {cid!r}")
            used[e] = cid

    out = {
        "source": src.replace("\\", "/").split("/")[-1],
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "categories": categories,
    }
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    counts: dict[str, int] = {}
    for c in categories:
        counts[c["kind"]] = counts.get(c["kind"], 0) + 1
    print(f"{len(categories)} категорий -> {dst}: {counts}")
    if dictionary_dst:
        write_dictionary(categories, dictionary_dst)
    if groups:
        no_group = [c["name"] for c in categories if not c["group"]]
        print(f"разделов: {len(set(groups.values()))}; без раздела: {no_group or 'нет'}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--dictionary")]
    flag = next((a for a in sys.argv[1:] if a.startswith("--dictionary=")), None)
    if len(args) not in (2, 3):
        sys.exit(__doc__)
    main(args[0], args[1], args[2] if len(args) == 3 else None, flag.split("=", 1)[1] if flag else None)
