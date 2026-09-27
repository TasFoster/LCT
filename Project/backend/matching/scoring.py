"""Score/status/explainable-факторы для одного кандидата (контракт 5:
MatchCandidate). Формула — MVP команды (готовой в ТЗ нет), сама
задокументирована здесь и видна пользователю через factors/reasons (см.
CLAUDE.md, "все формулы... обязаны быть видны пользователю").

compatibility (вес 0.5) — по вердиктам сработавших CompatibilityRule: любой
FORBIDDEN обнуляет score и переводит в EXCLUDED (остальные факторы в этом
случае не считаются — сумма factors.contribution всегда равна score, без
факторов, которые не то повлияли, не то нет); WARNING/NEEDS_REVIEW/нехватка
данных снижают compatibility и не пускают выше NEEDS_REVIEW; отсутствие
сработавших правил не значит "всё проверено" — это отдельная пометка в
reasons, score всё равно считается по вторичным факторам.
availability (0.2) / data_quality (0.15) / applicability (0.15) — вторичные
факторы качества самой позиции каталога, не про пригодность к конкретной
задаче (это уже compatibility).
"""

from __future__ import annotations

from contracts import (
    CatalogItem,
    CompatibilityRule,
    CompatibilityVerdict,
    MatchCandidate,
    MatchFactor,
    MatchStatus,
    ProjectInput,
)

from .rules import RuleOutcome, evaluate_rule

_AVAILABILITY_SCORE = {"available": 1.0, "limited": 0.6, "upcoming": 0.3, "discontinued": 0.0}
_CONFIDENCE_SCORE = {"verified": 1.0, "partial": 0.6, "unverified": 0.3}

COMPATIBILITY_WEIGHT = 0.5
AVAILABILITY_WEIGHT = 0.2
DATA_QUALITY_WEIGHT = 0.15
APPLICABILITY_WEIGHT = 0.15


def score_candidate(item: CatalogItem, project_input: ProjectInput, rules: list[CompatibilityRule]) -> MatchCandidate:
    reasons: list[str] = []
    forbidden_hit = False
    warning_hit = False
    unknown_hit = False
    applied_count = 0

    for rule in rules:
        outcome = evaluate_rule(rule, item, project_input)
        if outcome is RuleOutcome.NOT_APPLICABLE:
            continue
        if outcome is RuleOutcome.UNKNOWN:
            unknown_hit = True
            reasons.append(f"требует проверки: {rule.reason} (нет данных для правила {rule.id!r})")
            continue
        applied_count += 1
        reasons.append(rule.reason)
        if rule.verdict == CompatibilityVerdict.FORBIDDEN:
            forbidden_hit = True
        elif rule.verdict in (CompatibilityVerdict.WARNING, CompatibilityVerdict.NEEDS_REVIEW):
            warning_hit = True

    if applied_count == 0 and not unknown_hit:
        reasons.append("нет применимых правил совместимости для этого объекта — оценка только по общим факторам каталога")

    if forbidden_hit:
        factors = [
            MatchFactor(
                name="Совместимость с объектом",
                weight=COMPATIBILITY_WEIGHT,
                contribution=0.0,
                note="жёсткое ограничение (forbidden) — остальные факторы не учитываются, score обнулён",
            )
        ]
        return MatchCandidate(
            catalog_item_id=item.id,
            status=MatchStatus.EXCLUDED,
            score=0.0,
            factors=factors,
            reasons=reasons,
        )

    compatibility_value = 0.5 if (warning_hit or unknown_hit) else 1.0
    factors = [
        MatchFactor(
            name="Совместимость с объектом",
            weight=COMPATIBILITY_WEIGHT,
            contribution=COMPATIBILITY_WEIGHT * compatibility_value,
            note=f"сработало правил: {applied_count}"
            + (", есть предупреждения/непроверенные пункты" if (warning_hit or unknown_hit) else ""),
        )
    ]

    availability = _AVAILABILITY_SCORE.get(item.identification.availability_status.value, 0.3)
    factors.append(
        MatchFactor(
            name="Доступность решения",
            weight=AVAILABILITY_WEIGHT,
            contribution=AVAILABILITY_WEIGHT * availability,
            note=item.identification.availability_status.value,
        )
    )

    confidence = _CONFIDENCE_SCORE.get(item.data_quality.confidence, 0.3)
    factors.append(
        MatchFactor(
            name="Качество данных каталога",
            weight=DATA_QUALITY_WEIGHT,
            contribution=DATA_QUALITY_WEIGHT * confidence,
            note=item.data_quality.confidence,
        )
    )

    object_type_value = project_input.object_type.value
    if not item.applicability.supported_object_types:
        applicability, applicability_note = 0.5, "у позиции не указаны поддерживаемые типы объектов — нейтральная оценка"
    elif object_type_value in item.applicability.supported_object_types:
        applicability, applicability_note = 1.0, f"заявлена поддержка {object_type_value}"
    else:
        applicability, applicability_note = 0.0, f"поддержка {object_type_value} не заявлена явно"
    factors.append(
        MatchFactor(
            name="Заявленная применимость",
            weight=APPLICABILITY_WEIGHT,
            contribution=APPLICABILITY_WEIGHT * applicability,
            note=applicability_note,
        )
    )

    score = round(max(0.0, min(1.0, sum(f.contribution for f in factors))), 4)
    status = MatchStatus.NEEDS_REVIEW if (warning_hit or unknown_hit) else MatchStatus.RECOMMENDED

    return MatchCandidate(
        catalog_item_id=item.id,
        status=status,
        score=score,
        factors=factors,
        reasons=reasons,
    )
