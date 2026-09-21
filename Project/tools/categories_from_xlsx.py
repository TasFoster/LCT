"""Справочник категорий Артёма (xlsx) -> categories.json для редактора.

Запуск из папки ЛЦТ:
    python tools/categories_from_xlsx.py Книга1.xlsx editor2d/src/catalog/categories.json

Колонки xlsx: Название категории | К чему относится | Короткое описание | Пример.
В таблице нет id, поэтому id получается транслитерацией названия. Когда у Артёма
появятся свои id, их нужно брать из таблицы, а эту функцию убрать.
"""

import json
import re
import sys
from datetime import datetime, timezone

import openpyxl

TRANSLIT = dict(zip(
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p",
     "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya"],
))

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


def main(src: str, dst: str) -> None:
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
            "applies_to": applies_to,
            "description": description,
            "examples": [e.strip() for e in str(examples or "").split(",") if e.strip()],
        }
        if kind == "place_zone":
            item["zone_type"] = ZONE_TYPES.get(name, "operation")
        if kind == "place_point":
            item["point_kind"] = "charging" if name == "Точка зарядки" else "operation"
        categories.append(item)

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


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
