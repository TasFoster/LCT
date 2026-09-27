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

from .category_rules import CategoryTaxonomy
from .quantity import estimate_quantity
from .scoring import score_candidate

_default_taxonomy: CategoryTaxonomy | None = None


def _load_default_taxonomy() -> CategoryTaxonomy:
    global _default_taxonomy
    if _default_taxonomy is None:
        _default_taxonomy = CategoryTaxonomy.load()
    return _default_taxonomy


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
    taxonomy: CategoryTaxonomy | None = None,
) -> MatchResult:
    """Один прогон подбора: для каждой позиции каталога считает вердикт
    правил совместимости (числовых CompatibilityRule + категориальных правил
    Артёма из compatibility_tree.json) + explainable score (scoring.py) и,
    если позиция не исключена, оценку требуемого количества (quantity.py).
    Кандидаты отсортированы по убыванию score — но выбор итогового состава
    (selected_equipment) делает пользователь на фронте, matching его за него
    не решает.

    taxonomy=None (по умолчанию) лениво грузит общий словарь
    contracts/dictionaries/compatibility_tree.json один раз на процесс —
    передавай свой экземпляр только в тестах/демо, где нужен контроль над
    деревом категорий."""
    active_taxonomy = taxonomy if taxonomy is not None else _load_default_taxonomy()
    candidates = [
        _with_quantity(score_candidate(item, project_input, rules, active_taxonomy), item, project_input)
        for item in catalog
    ]
    candidates.sort(key=lambda c: c.score, reverse=True)

    return MatchResult(
        id=f"match-{project_input.id}",
        project_id=project_id,
        project_input_id=project_input.id,
        generated_at=datetime.now(timezone.utc),
        candidates=candidates,
    )
