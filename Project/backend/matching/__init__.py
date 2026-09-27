"""Контракт 5: реализация подбора и ранжирования (matching).

Вход: ProjectInput (контракт 4) + список CatalogItem (контракт 1) + список
CompatibilityRule (контракт 2). Выход: MatchResult (контракт 5) — фронту,
econWrapper и simulation.

rules.py / scoring.py / quantity.py / service.py / fixtures.py / demo.py —
см. docstring каждого файла. Реальных данных каталога (223 позиции
catalog_export_v4.csv) и реального набора CompatibilityRule от Артёма пока
нет — fixtures.py и demo.py работают на иллюстративных примерах, отмеченных
как таковые (по аналогии с simulation/fixtures.py)."""
