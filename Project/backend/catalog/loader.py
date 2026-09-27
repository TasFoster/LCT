"""Контракт 1: `catalog_export_v4.csv` (223 реальные позиции, файл организатора
хакатона) -> `CatalogItem`. Заменяет иллюстративные `matching/fixtures.py` на
реальные данные — matching перестаёт ранжировать 3 придуманные позиции.

Что структурировано честно (есть в CSV как отдельная колонка):
- identification: производитель, название, страна (RU — все компании в
  датасете российские, см. Регион), статус доступности (см. _STATUS ниже).
- economics.equipment_cost: цена изделия, распарсена из "2 700 000,00".
- applicability.case_studies: колонка "Кейсы", если не пустая.

Что НЕ структурировано (сознательно, не гадаем): TechnicalSpecs целиком
(payload_kg, speed_mps и т.д.) — в CSV нет числовых ТТХ отдельными колонками,
только иногда упомянуты внутри свободного текста названия/описания
("Ronavi H1500 (грузоподъемность до 1500 кг)"). Парсить это регуляркой из
непредсказуемого текста — ненадёжно и не в духе контракта ("не гадать
недостающие данные"). Поэтому TechnicalSpecs = None везде,
`data_quality.confidence = "unverified"` — это ЧЕСТНОЕ состояние: позиция в
каталоге есть, но проверить её по ТТХ-правилам совместимости нельзя (matching
корректно пометит такие кандидаты "needs_review", а не тихо пропустит и не
придумает цифры, см. rules.py: RuleOutcome.UNKNOWN).

`applicability.supported_object_types` оставлено пустым — колонка "Отрасль"
(9 значений: Торговля и услуги/Промышленность/Транспорт и логистика/ТЭК/
Сельское хозяйство/Безопасность/Строительство/ЖКХ/Лесное хозяйство) не
сопоставлена один-в-один с ObjectType (warehouse/airport/medical) — это
продуктовая развилка команды, не техническое решение (см. CLAUDE.md). Отрасль,
Регион, УГТ ("Рын Потенциал") сохранены как есть в `tags`/`attributes` —
никакие данные не теряются, просто не участвуют в структурированных полях,
пока команда не решит про маппинг.
"""

from __future__ import annotations

import csv
import re
from datetime import date
from pathlib import Path

from contracts import (
    AcquisitionModel,
    Applicability,
    AvailabilityStatus,
    CatalogItem,
    DataQuality,
    EconomicsInfo,
    Identification,
    Infrastructure,
    TechnicalSpecs,
)

CATALOG_CSV_PATH = Path(__file__).resolve().parents[3] / "Датасет" / "Датасет" / "catalog_export_v4.csv"
DATASET_DOWNLOADED = date(2026, 9, 25)  # см. CLAUDE.md, "Данные для хакатона"

_STATUS = {
    "operation": AvailabilityStatus.AVAILABLE,
    "piloting": AvailabilityStatus.LIMITED,
    "rnd": AvailabilityStatus.UPCOMING,
}

_TYPE_LABEL = {
    "brs": "Робототехническая система",
    "bas": "БАС",
    "software": "ПО",
}


def _parse_price(raw: str) -> float | None:
    """"2 700 000,00" -> 2700000.0. Пустая строка/мусор -> None (не 0 — 0 ₽
    выглядел бы как «бесплатно», а не «неизвестно»)."""
    if not raw or not raw.strip():
        return None
    cleaned = re.sub(r"[\s\xa0]", "", raw).replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _num_or_str(raw: str) -> float | str:
    """"8" -> 8.0, "4.00" -> 4.0 — так TRL/рыночный потенциал сравнимы
    операторами lt/gt в будущих правилах, а не только на равенство строк."""
    try:
        return float(raw.strip())
    except (ValueError, AttributeError):
        return raw


def _solution_type(row: dict[str, str]) -> str:
    """Подтип (пуст у 36% строк) -> Тип (пуст у 30%) -> ярлык по общему типу
    brs/bas/software — так у каждой позиции всегда есть хоть какая-то метка."""
    return row["Подтип"].strip() or row["Тип"].strip() or _TYPE_LABEL.get(row["тип"], row["тип"])


def load_catalog(csv_path: Path = CATALOG_CSV_PATH) -> list[CatalogItem]:
    with open(csv_path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f, delimiter=";"))

    items = []
    for row in rows:
        case_studies = [row["Кейсы"].strip()] if row["Кейсы"].strip() else []
        tags = [f"тип:{row['тип']}", f"статус:{row['статус']}"]
        if row["Отрасль"].strip():
            tags.append(f"отрасль:{row['Отрасль'].strip()}")

        items.append(
            CatalogItem(
                id=row["id"],
                identification=Identification(
                    manufacturer=row["компания"].strip() or "не указан",
                    product_name=row["Название"].strip(),
                    solution_type=_solution_type(row),
                    purpose=row["описание"].strip() or row["Сценарий"].strip(),
                    country="RU",
                    availability_status=_STATUS.get(row["статус"], AvailabilityStatus.LIMITED),
                ),
                technical=TechnicalSpecs(),  # см. докстринг модуля — честно пусто, не гадаем
                infrastructure=Infrastructure(),
                economics=EconomicsInfo(
                    equipment_cost=_parse_price(row["Цена изделия"]),
                    acquisition_model=AcquisitionModel.PURCHASE,
                ),
                applicability=Applicability(case_studies=case_studies),
                data_quality=DataQuality(
                    source="catalog_export_v4.csv",
                    last_updated=DATASET_DOWNLOADED,
                    confidence="unverified",
                ),
                tags=tags,
                attributes={
                    "industry": row["Отрасль"].strip(),
                    "region": row["Регион"].strip(),
                    "trl": _num_or_str(row["УГТ"]),
                    "market_potential": _num_or_str(row["Рын Потенциал"]),
                    "type_raw": row["Тип"].strip(),
                    "subtype_raw": row["Подтип"].strip(),
                },
            )
        )
    return items
