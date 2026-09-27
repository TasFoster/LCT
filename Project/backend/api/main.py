"""HTTP-слой поверх уже готовых движков (matching/, simulation/) и реального
каталога — минимальный срез API, нужный фронту прямо сейчас (2026-09-28,
«Соедени бек и фронт по API»).

Осознанно НЕ включает: создание/чтение проектов, версии записи, авторизацию —
это контракт 9 (ProjectRecord), зона ответственности Владимирова
(backend-glue ↔ БД, см. корневой CLAUDE.md). Проекты, параметры и план
объекта по-прежнему живут в моке фронта (features/projectApi/mockServer.ts);
здесь — только то, что уже полностью реализовано в этом репозитории и не
требует хранения состояния между запросами: подбор и симуляция принимают
весь вход в теле запроса и отдают результат синхронно, каталог — из уже
загруженного CSV.

Запуск (см. CLAUDE.md, «Команды разработки»):
    cd Project/backend
    uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from catalog.loader import load_catalog
from contracts import CatalogItem, MatchResult, ProjectInput, Scene, SimulationTimeline
from contracts.economics import EconomicsResult, ScenarioInput
from contracts.matching import SelectedEquipment
from economics.wrapper import run_economics
from matching.fixtures import DEMO_RULES
from matching.service import run_matching
from simulation.service import run_simulation

app = FastAPI(title="ROBOCALC API (минимальный срез: catalog/matching/simulation/economics)", version="0.1.0")

# Vite dev server фронта — 127.0.0.1 и localhost порознь, т.к. браузер их не отождествляет.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Каталог читается один раз при старте процесса — 223 позиции, файл организатора
# не меняется во время работы сервера (см. catalog/loader.py).
_CATALOG: list[CatalogItem] = load_catalog()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/catalog", response_model=list[CatalogItem])
def get_catalog() -> list[CatalogItem]:
    return _CATALOG


@app.post("/api/matching/run", response_model=MatchResult)
def post_matching_run(project_input: ProjectInput) -> MatchResult:
    """Подбор по реальному каталогу (223 позиции) + категориальным правилам
    Артёма (matching/category_rules.py, лениво грузится внутри run_matching).
    DEMO_RULES — иллюстративные числовые правила: реального набора от Артёма
    ещё нет (см. CLAUDE.md, «Подбор и ранжирование: matching», открытый
    вопрос №2) — но это не мешает вернуть честный, не выдуманный результат по
    оставшимся факторам скоринга."""
    return run_matching(project_input, _CATALOG, DEMO_RULES, project_id=project_input.id)


class SimulationRunRequest(BaseModel):
    scene: Scene
    project_input: ProjectInput
    scenario_id: str = "default"


@app.post("/api/simulation/run", response_model=SimulationTimeline)
def post_simulation_run(req: SimulationRunRequest) -> SimulationTimeline:
    """Прогон симуляции на плане пользователя. Синхронно — NFT (≤60с на
    пересчёт) выполняется с запасом на демо-датасетах, отдельного async-job
    слоя (в отличие от `shared/api/endpoints/scene.ts: SimulationRunEndpoint`)
    пока не требуется."""
    return run_simulation(
        req.scene,
        req.project_input.params,
        project_id=req.project_input.id,
        scenario_id=req.scenario_id,
    )


class EconomicsRunRequest(BaseModel):
    scenario: ScenarioInput
    selected_equipment: list[SelectedEquipment]


@app.post("/api/economics/run", response_model=EconomicsResult)
def post_economics_run(req: EconomicsRunRequest) -> EconomicsResult:
    """econWrapper (контракт 8): ScenarioInput + состав оборудования -> EconomicsResult
    по формулам Александры (economics/calculator.py). Стоимость оборудования — из
    реального каталога по `selected_equipment`; статьи, которых в каталоге нет
    (инфраструктура/энергия/связь/пусконаладка/обучение), — документированные
    допущения в economics/wrapper.py, переопределяемые через
    `scenario.assumptions_overrides`."""
    return run_economics(req.scenario, req.selected_equipment, _CATALOG)
