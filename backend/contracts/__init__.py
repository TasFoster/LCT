"""9 контрактов между модулями/людьми LCT. Полная таблица с назначением
и направлением каждого контракта — во вкладке "Контракты" файла
"Диаграмма модулей.drawio".

1. CatalogItem              Артём -> Стас
2. CompatibilityRule        Артём -> Стас (matching)
3. EconInput / EconOutput   Александра -> Стас (econWrapper), см. econ_io.py
4. ProjectInput             Владимиров -> Стас
5. MatchResult              Стас -> фронт, econWrapper, simulation
6. TopologyConfig           Алексей <-> Владимиров, -> Стас (simulation)
7. SimulationTimeline       Стас -> Алексей
8. ScenarioInput/EconomicsResult   Стас (econWrapper) -> Владимиров
9. ProjectRecord            Владимиров (backend-glue) <-> БД, -> фронт
"""

from .catalog import (
    Applicability,
    CatalogItem,
    DataQuality,
    EconomicsInfo,
    Identification,
    Infrastructure,
    TechnicalSpecs,
)
from .compatibility import CompatibilityRule, RuleCondition
from .econ_io import EconInput, EconOutput
from .econ_io import SensitivityPoint as EconSensitivityPoint
from .economics import EconomicsResult, ScenarioInput, SensitivityResultPoint
from .enums import (
    AcquisitionModel,
    AvailabilityStatus,
    CompatibilityVerdict,
    FinancingType,
    MatchStatus,
    NavigationType,
    ObjectType,
    ProjectStatus,
    RobotState,
    ScenarioKind,
    ZoneType,
)
from .matching import MatchCandidate, MatchFactor, MatchResult, SelectedEquipment
from .project_input import AirportParams, MedicalParams, ObjectParams, ProjectInput, WarehouseParams
from .records import ProjectRecord, ProjectVersion
from .simulation import Bottleneck, SimulationKPI, SimulationTimeline, TimelineFrame
from .topology import OperationPoint, Point2D, RobotPlacement, Route, TopologyConfig, Zone

__all__ = [
    "Applicability",
    "CatalogItem",
    "DataQuality",
    "EconomicsInfo",
    "Identification",
    "Infrastructure",
    "TechnicalSpecs",
    "CompatibilityRule",
    "RuleCondition",
    "EconInput",
    "EconOutput",
    "EconSensitivityPoint",
    "EconomicsResult",
    "ScenarioInput",
    "SensitivityResultPoint",
    "AcquisitionModel",
    "AvailabilityStatus",
    "CompatibilityVerdict",
    "FinancingType",
    "MatchStatus",
    "NavigationType",
    "ObjectType",
    "ProjectStatus",
    "RobotState",
    "ScenarioKind",
    "ZoneType",
    "MatchCandidate",
    "MatchFactor",
    "MatchResult",
    "SelectedEquipment",
    "AirportParams",
    "MedicalParams",
    "ObjectParams",
    "ProjectInput",
    "WarehouseParams",
    "ProjectRecord",
    "ProjectVersion",
    "Bottleneck",
    "SimulationKPI",
    "SimulationTimeline",
    "TimelineFrame",
    "OperationPoint",
    "Point2D",
    "RobotPlacement",
    "Route",
    "TopologyConfig",
    "Zone",
]
