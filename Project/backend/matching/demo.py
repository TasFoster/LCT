"""Демо-скрипт: прогоняет run_matching и печатает/сохраняет MatchResult —
способ увидеть результат подбора без реального API-слоя, которого пока нет
(по образцу simulation/demo.py).

По умолчанию — на РЕАЛЬНОМ каталоге (catalog.loader.load_catalog(), 223
позиции из catalog_export_v4.csv) с реальной таксономией категорий Артёма
(category_rules.CategoryTaxonomy) и иллюстративным ProjectInput/DEMO_RULES
(fixtures.py — числовых бизнес-правил от Артёма пока нет, см. CLAUDE.md,
"Подбор и ранжирование: matching", открытый вопрос №3). Флаг --fixtures
прогоняет старый полностью иллюстративный демо-каталог (3 придуманные
позиции) — для отладки самого движка в изоляции от реальных данных.

Запуск из Project/backend/:
    python -m matching.demo путь_к_файлу.json
    python -m matching.demo                 # без файла — печатает JSON в stdout
    python -m matching.demo --fixtures out.json
"""

from __future__ import annotations

import sys
from pathlib import Path

from catalog.loader import load_catalog

from .fixtures import DEMO_CATALOG, DEMO_PROJECT_INPUT, DEMO_RULES
from .service import run_matching


def main() -> None:
    args = sys.argv[1:]
    use_fixtures = "--fixtures" in args
    args = [a for a in args if a != "--fixtures"]

    catalog = DEMO_CATALOG if use_fixtures else load_catalog()
    result = run_matching(DEMO_PROJECT_INPUT, catalog, DEMO_RULES, project_id="demo-project")
    output = result.model_dump_json(indent=2)
    if args:
        Path(args[0]).write_text(output, encoding="utf-8")
        counts: dict[str, int] = {}
        for c in result.candidates:
            counts[c.status.value] = counts.get(c.status.value, 0) + 1
        print(f"{len(result.candidates)} кандидатов ({counts}) -> {args[0]}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
