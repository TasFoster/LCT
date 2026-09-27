"""Контракт 3: EconInput -> EconOutput. Формулы Александры (экономика.py,
2026-09-28), перенесённые на канонические датаклассы contracts/econ_io.py —
сама логика не менялась при переносе, только источник EconInput/EconOutput/
SensitivityPoint (были собственные dataclass здесь же, теперь общий контракт).

Только stdlib, никакого pydantic/FastAPI — Александра пишет чистые функции
над этими датаклассами и не должна знать об остальном стеке (см. docstring
contracts/econ_io.py). Обёртка над API — economics/wrapper.py.
"""

from __future__ import annotations

from dataclasses import replace

from contracts.econ_io import EconInput, EconOutput, SensitivityPoint


def _calc_capex(inp: EconInput) -> dict[str, float]:
    """Считает CAPEX по статьям и итог."""
    base = (
        inp.equipment_cost_total
        + inp.infrastructure_cost_total
        + inp.software_cost_total
        + inp.integration_cost_total
        + inp.commissioning_cost_total
        + inp.training_cost_total
    )
    reserve = base * inp.reserve_ratio
    return {
        "equipment": inp.equipment_cost_total,
        "infrastructure": inp.infrastructure_cost_total,
        "software": inp.software_cost_total,
        "integration": inp.integration_cost_total,
        "commissioning": inp.commissioning_cost_total,
        "training": inp.training_cost_total,
        "reserve": reserve,
        "total": base + reserve,
    }


def _calc_annual_payroll(inp: EconInput) -> float:
    """Годовой ФОТ замещаемого персонала с налогами."""
    return inp.staff_count * inp.staff_salary_per_month * 12.0 * (1.0 + inp.staff_tax_rate)


def _calc_opex(inp: EconInput) -> float:
    """Годовой OPEX (обслуживание + энергия + связь + расходники)."""
    return (
        inp.maintenance_cost_per_year
        + inp.energy_cost_per_year
        + inp.connectivity_cost_per_year
        + inp.consumables_cost_per_year
    )


def _calc_financing(inp: EconInput, capex_total: float) -> tuple[float, float, float, str]:
    """Как тип финансирования превращает стоимость оборудования в денежный поток.

    Возвращает (capex_upfront, annual_financing_cost, financing_term_years, note):
    - capex_upfront — сколько платится единовременно в год 0 (для own_funds — весь
      CAPEX; для credit/leasing/raas — 0, потому что оборудование не выкупается сразу).
    - annual_financing_cost — во сколько обходится финансирование в год, ПОКА длится
      срок кредита/лизинга/контракта RaaS; после этого срока — снова 0 (учтено в NPV
      понедельно по годам, см. _calc_npv).
    - financing_term_years — на сколько лет растянут этот платёж (для own_funds — 0).
    - note — человекочитаемое пояснение допущения, идёт в assumptions_text.

    Допущения (нет реальных данных — коэффициенты явные, не спрятанные):
    - credit/leasing: аннуитетный платёж по стандартной формуле, ставка = financing_rate,
      срок = financing_term_years. Ставка 0% -> равномерное погашение (P/n).
    - raas: собственного CAPEX нет вообще, вместо него — плата провайдеру, размазывающая
      стоимость оборудования на срок контракта (financing_term_years, иначе горизонт
      расчёта) плюс наценка провайдера. financing_rate в этом режиме — НЕ ставка по
      кредиту, а именно наценка провайдера сверх стоимости оборудования (переиспользуем
      то же поле контракта, а не заводим отдельное — семантика зависит от financing_type).
    """
    if inp.financing_type in ("credit", "leasing"):
        term = inp.financing_term_years
        if term <= 0:
            return capex_total, 0.0, 0.0, "financing_term_years не задан — считаем как собственные средства"
        rate = inp.financing_rate
        if rate > 0:
            annuity = capex_total * rate / (1.0 - (1.0 + rate) ** -term)
        else:
            annuity = capex_total / term
        kind = "кредита" if inp.financing_type == "credit" else "лизинга"
        note = f"оплата за счёт {kind}: аннуитет {_fmt(annuity)} ₽/год в течение {term:.0f} лет под {rate*100:.1f}% годовых вместо единовременного CAPEX"
        return 0.0, annuity, term, note
    if inp.financing_type == "raas":
        term = inp.financing_term_years if inp.financing_term_years > 0 else inp.horizon_years
        markup = inp.financing_rate  # см. докстринг: в режиме raas это наценка провайдера, не ставка по кредиту
        annual_fee = (capex_total / term) * (1.0 + markup)
        note = f"RaaS: оборудование не выкупается, {_fmt(annual_fee)} ₽/год провайдеру ({term:.0f}-летний контракт, наценка {markup*100:.0f}% сверх стоимости оборудования)"
        return 0.0, annual_fee, term, note
    return capex_total, 0.0, 0.0, "оплата из собственных средств, единовременно"


def _calc_npv(
    base_annual_effect: float,
    capex_upfront: float,
    annual_financing_cost: float,
    financing_term_years: float,
    discount_rate: float,
    horizon_years: float,
) -> float:
    """NPV на горизонте. Пока действует финансирование (financing_term_years),
    эффект каждого года уменьшен на annual_financing_cost — после погашения
    восстанавливается до base_annual_effect."""
    if discount_rate <= -1.0:
        discount_rate = 0.0
    npv = -capex_upfront
    for t in range(1, int(horizon_years) + 1):
        effect_t = base_annual_effect - annual_financing_cost if t <= financing_term_years else base_annual_effect
        npv += effect_t / ((1.0 + discount_rate) ** t)
    return npv


def _calc_roi(annual_effect: float, capex_total: float, horizon_years: float) -> float:
    """ROI за горизонт, %."""
    if capex_total <= 0:
        return 0.0
    return ((annual_effect * horizon_years) - capex_total) / capex_total * 100.0


def _calc_payback(annual_effect: float, capex_total: float) -> float | None:
    """Срок окупаемости. None, если эффект <= 0."""
    if annual_effect <= 0 or capex_total <= 0:
        return None
    return capex_total / annual_effect


def calculate_economics(inp: EconInput) -> EconOutput:
    warnings: list[str] = []

    # --- CAPEX: стоимость владения оборудованием, не зависит от способа оплаты ---
    capex = _calc_capex(inp)
    capex_total = capex["total"]

    # --- Финансирование: как эта стоимость превращается в денежный поток ---
    capex_upfront, annual_financing_cost, financing_term, financing_note = _calc_financing(inp, capex_total)
    if inp.financing_type in ("credit", "leasing") and inp.financing_term_years <= 0:
        warnings.append(
            f"financing_type={inp.financing_type!r}, но financing_term_years не задан — "
            "расчёт выполнен как для собственных средств."
        )

    # --- ФОТ замещаемого персонала ---
    annual_payroll = _calc_annual_payroll(inp)

    # --- OPEX эксплуатации робота (без учёта финансирования) ---
    opex_annual = _calc_opex(inp)

    # "Базовый" эффект — без финансирования; annual_effect — с учётом текущего платежа
    # по кредиту/лизингу/RaaS. Пока действует срок финансирования, эффект ниже базового,
    # после погашения возвращается к базовому — это честно учтено в NPV по годам
    # (_calc_npv), а payback/ROI/TCO ниже считаются по эффекту ВО ВРЕМЯ платежа —
    # консервативная оценка (не завышает выгоду в первые годы).
    annual_effect_base = annual_payroll - opex_annual
    annual_effect = annual_effect_base - annual_financing_cost

    if capex_upfront > 0:
        payback_years = _calc_payback(annual_effect, capex_upfront)
        roi_pct = _calc_roi(annual_effect, capex_upfront, inp.horizon_years)
    else:
        # credit/leasing/raas: единовременного вложения нет — "срок окупаемости" в
        # классическом смысле не применим, эффект реализуется сразу с 1-го года
        # (в этом и состоит смысл таких схем — не запирать капитал). ROI в этом случае
        # считаем относительно стоимости владения оборудованием (capex_total), чтобы
        # сценарии можно было сравнивать между собой по одной шкале.
        payback_years = 0.0 if annual_effect > 0 else None
        roi_pct = _calc_roi(annual_effect, capex_total, inp.horizon_years)

    tco_total = capex_upfront + (opex_annual + annual_financing_cost) * inp.horizon_years
    npv = _calc_npv(
        annual_effect_base, capex_upfront, annual_financing_cost, financing_term, inp.discount_rate, inp.horizon_years
    )

    opex_delta_vs_baseline = opex_annual + annual_financing_cost

    if annual_effect <= 0:
        warnings.append("Годовой экономический эффект отрицательный: OPEX роботов превышает экономию на ФОТ.")
    if payback_years is not None and payback_years > inp.horizon_years:
        warnings.append(
            f"Срок окупаемости ({payback_years:.2f} лет) превышает горизонт расчёта ({inp.horizon_years} лет)."
        )
    if inp.horizon_years < 5:
        warnings.append("Горизонт расчёта меньше 5 лет — по ТЗ рекомендуется минимум 5.")
    if inp.load_factor < 0.3:
        warnings.append(f"Низкий коэффициент загрузки ({inp.load_factor:.2f}) — роботы будут простаивать.")
    if inp.staff_count == 0:
        warnings.append("Количество замещаемых сотрудников = 0. Экономия на ФОТ не учитывается.")

    sensitivity = _calc_sensitivity(inp)

    assumptions_text = _build_assumptions_text(
        inp,
        capex,
        annual_payroll,
        opex_annual,
        annual_effect,
        payback_years,
        roi_pct,
        tco_total,
        npv,
        financing_note,
        annual_financing_cost,
        capex_upfront,
    )

    return EconOutput(
        capex_equipment=capex["equipment"],
        capex_infrastructure=capex["infrastructure"],
        capex_software=capex["software"],
        capex_integration=capex["integration"],
        capex_commissioning=capex["commissioning"],
        capex_training=capex["training"],
        capex_reserve=capex["reserve"],
        capex_total=capex_total,
        opex_annual=opex_annual,
        opex_delta_vs_baseline=opex_delta_vs_baseline,
        annual_effect=annual_effect,
        payback_years=payback_years,
        roi_pct=roi_pct,
        tco_total=tco_total,
        npv=npv,
        sensitivity=sensitivity,
        assumptions_text=assumptions_text,
        warnings=warnings,
    )


def _apply_delta(inp: EconInput, param: str, delta_pct: float) -> EconInput:
    if not hasattr(inp, param):
        return inp
    current = getattr(inp, param)
    if isinstance(current, (int, float)):
        new_value = current * (1.0 + delta_pct)
        if isinstance(current, int):
            new_value = int(round(new_value))
        return replace(inp, **{param: new_value})
    return inp


def _calc_sensitivity(inp: EconInput) -> list[SensitivityPoint]:
    """Пересчёт при ±delta по каждому параметру — той же логикой (включая
    финансирование), что и основной расчёт, иначе чувствительность для
    credit/leasing/raas-сценариев считалась бы как для собственных средств."""
    points: list[SensitivityPoint] = []
    for param in inp.sensitivity_params:
        for delta in (+inp.sensitivity_delta_pct, -inp.sensitivity_delta_pct):
            modified = _apply_delta(inp, param, delta)
            capex_total = _calc_capex(modified)["total"]
            capex_upfront, annual_financing_cost, _term, _note = _calc_financing(modified, capex_total)
            annual_payroll = _calc_annual_payroll(modified)
            opex_annual = _calc_opex(modified)
            annual_effect = annual_payroll - opex_annual - annual_financing_cost
            if capex_upfront > 0:
                payback = _calc_payback(annual_effect, capex_upfront)
                roi = _calc_roi(annual_effect, capex_upfront, modified.horizon_years)
            else:
                payback = 0.0 if annual_effect > 0 else None
                roi = _calc_roi(annual_effect, capex_total, modified.horizon_years)
            points.append(
                SensitivityPoint(
                    parameter=param,
                    delta_pct=delta,
                    resulting_payback_years=payback,
                    resulting_roi_pct=roi,
                    resulting_annual_effect=annual_effect,
                )
            )
    return points


def _fmt(x: float) -> str:
    return f"{x:,.0f}".replace(",", " ")


def _build_assumptions_text(
    inp: EconInput,
    capex: dict[str, float],
    annual_payroll: float,
    opex_annual: float,
    annual_effect: float,
    payback_years: float | None,
    roi_pct: float,
    tco_total: float,
    npv: float,
    financing_note: str,
    annual_financing_cost: float,
    capex_upfront: float,
) -> str:
    lines: list[str] = []
    lines.append(f"Расчёт выполнен для горизонта {inp.horizon_years:.0f} лет.")
    lines.append("")
    lines.append("CAPEX (единовременные затраты):")
    lines.append(f"  Оборудование: {_fmt(capex['equipment'])} ₽")
    lines.append(f"  Инфраструктура: {_fmt(capex['infrastructure'])} ₽")
    lines.append(f"  ПО: {_fmt(capex['software'])} ₽")
    lines.append(f"  Интеграция: {_fmt(capex['integration'])} ₽")
    lines.append(f"  Пусконаладка: {_fmt(capex['commissioning'])} ₽")
    lines.append(f"  Обучение: {_fmt(capex['training'])} ₽")
    lines.append(f"  Резерв ({inp.reserve_ratio*100:.0f}%): {_fmt(capex['reserve'])} ₽")
    lines.append(f"  Итого CAPEX: {_fmt(capex['total'])} ₽")
    lines.append("")
    lines.append("OPEX (годовые затраты):")
    lines.append(f"  Обслуживание: {_fmt(inp.maintenance_cost_per_year)} ₽/год")
    lines.append(f"  Электроэнергия: {_fmt(inp.energy_cost_per_year)} ₽/год")
    lines.append(f"  Связь: {_fmt(inp.connectivity_cost_per_year)} ₽/год")
    lines.append(f"  Расходники: {_fmt(inp.consumables_cost_per_year)} ₽/год")
    lines.append(f"  Итого OPEX: {_fmt(opex_annual)} ₽/год")
    lines.append("")
    lines.append("Экономия на ФОТ замещаемого персонала:")
    lines.append(f"  Сотрудников: {inp.staff_count} чел.")
    lines.append(f"  Зарплата gross: {_fmt(inp.staff_salary_per_month)} ₽/мес")
    lines.append(f"  Страховые взносы: {inp.staff_tax_rate*100:.0f}%")
    lines.append(f"  Годовой ФОТ: {_fmt(annual_payroll)} ₽/год")
    lines.append("")
    lines.append("Финансирование:")
    lines.append(f"  {financing_note}")
    lines.append("")
    lines.append("Годовой экономический эффект:")
    if annual_financing_cost > 0:
        lines.append(
            f"  ФОТ − OPEX − платёж по финансированию = {_fmt(annual_payroll)} − {_fmt(opex_annual)} "
            f"− {_fmt(annual_financing_cost)} = {_fmt(annual_effect)} ₽/год (пока действует финансирование)"
        )
    else:
        lines.append(f"  ФОТ − OPEX = {_fmt(annual_payroll)} − {_fmt(opex_annual)} = {_fmt(annual_effect)} ₽/год")
    lines.append("")
    if capex_upfront <= 0:
        lines.append(
            "Срок окупаемости: не применим — единовременного вложения нет "
            f"({'эффект реализуется с 1-го года' if annual_effect > 0 else 'эффект отрицательный'})."
        )
    elif payback_years is not None:
        lines.append("Срок окупаемости:")
        lines.append(f"  CAPEX / эффект = {_fmt(capex_upfront)} / {_fmt(annual_effect)} = {payback_years:.2f} лет")
    else:
        lines.append("Срок окупаемости: не достижим (эффект ≤ 0).")
    lines.append("")
    lines.append(
        f"ROI за {inp.horizon_years:.0f} лет: {roi_pct:.1f}%"
        + (" (относительно стоимости владения оборудованием, т.к. единовременного вложения нет)" if capex_upfront <= 0 else "")
    )
    lines.append(f"TCO на горизонте: {_fmt(tco_total)} ₽")
    lines.append(f"NPV при ставке дисконтирования {inp.discount_rate*100:.0f}%: {_fmt(npv)} ₽")
    lines.append("")
    lines.append("Допущения:")
    lines.append("  - Инфляция зарплат и OPEX не учитывалась.")
    lines.append("  - Остаточная стоимость оборудования не учитывалась.")
    lines.append("  - Налог на прибыль не учитывался (эффект до налогообложения).")
    lines.append(f"  - Коэффициент загрузки оборудования: {inp.load_factor:.2f}.")
    lines.append(f"  - Часы работы в год: {_fmt(inp.operating_hours_per_year)}.")
    lines.append(f"  - Анализ чувствительности: ±{inp.sensitivity_delta_pct*100:.0f}% по {len(inp.sensitivity_params)} параметрам.")
    return "\n".join(lines)
