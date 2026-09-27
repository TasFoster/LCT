"""Демо-скрипт: прогоняет run_matching на иллюстративных fixtures.py и
печатает/сохраняет MatchResult — способ увидеть результат подбора без
реального API-слоя, которого пока нет (по образцу simulation/demo.py).

Запуск из Project/backend/:
    python -m matching.demo путь_к_файлу.json
    python -m matching.demo   # без аргумента — печатает JSON в stdout
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from .fixtures import DEMO_CATALOG, DEMO_PROJECT_INPUT, DEMO_RULES
from .service import run_matching


def main() -> None:
    result = run_matching(DEMO_PROJECT_INPUT, DEMO_CATALOG, DEMO_RULES, project_id="demo-project")
    output = result.model_dump_json(indent=2)
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(output, encoding="utf-8")
        summary = ", ".join(f"{c.catalog_item_id}={c.status.value}:{c.score}" for c in result.candidates)
        print(f"{len(result.candidates)} кандидатов ({summary}) -> {sys.argv[1]}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
