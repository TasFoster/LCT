"""Контракт 5: оркестрация — ProjectInput + каталог + правила -> MatchResult.

Единственная точка входа для остального бэкенда (когда появится API-слой):
один вызов, на входе реальные контракты 1/2/4, на выходе готовый MatchResult
(контракт 5) для фронта, econWrapper и simulation. econWrapper/simulation
дальше работают с MatchResult.selected_equipment — но его заполняет
пользователь на фронте (см. run_matching), а не этот модуль: matching даёт
ранжированный список кандидатов с оценкой количества на каждого, а не
готовый финальный состав флота.
"""

from __future__ import annotations

from datetime import datetime, timezone

from contracts import CatalogItem, CompatibilityRule, MatchCandidate, MatchResult, MatchStatus, ProjectInput

from .quantity import estimate_quantity
from .scoring import score_candidate


def _with_quantity(candidate: MatchCandidate, item: CatalogItem, project_input: ProjectInput) -> MatchCandidate:
    if candidate.status == MatchStatus.EXCLUDED:
        return candidate
    quantity = estimate_quantity(item, project_input)
    if quantity is None:
        return candidate
    return candidate.model_copy(update={"quantity_if_selected": quantity})


def run_matching(
    project_input: ProjectInput,
    catalog: list[CatalogItem],
    rules: list[CompatibilityRule],
    *,
    project_id: str,
) -> MatchResult:
    """Один прогон подбора: для каждой позиции каталога считает вердикт
    правил совместимости + explainable score (scoring.py) и, если позиция не
    исключена, оценку требуемого количества (quantity.py). Кандидаты
    отсортированы по убыванию score — но выбор итогового состава
    (selected_equipment) делает пользователь на фронте, matching его за него
    не решает."""
    candidates = [
        _with_quantity(score_candidate(item, project_input, rules), item, project_input) for item in catalog
    ]
    candidates.sort(key=lambda c: c.score, reverse=True)

    return MatchResult(
        id=f"match-{project_input.id}",
        project_id=project_id,
        project_input_id=project_input.id,
        generated_at=datetime.now(timezone.utc),
        candidates=candidates,
    )
