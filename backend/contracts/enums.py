"""Общие перечисления для всех контрактов. Новый тип объекта/решения/сценария —
это новое значение enum + новая ветка данных, а не изменение существующих
моделей (расширяемость без переработки ядра, п. 4.2.6 ТЗ)."""

from enum import Enum


class ObjectType(str, Enum):
    WAREHOUSE = "warehouse"
    AIRPORT = "airport"
    MEDICAL = "medical"


class AvailabilityStatus(str, Enum):
    AVAILABLE = "available"
    LIMITED = "limited"
    DISCONTINUED = "discontinued"
    UPCOMING = "upcoming"


class AcquisitionModel(str, Enum):
    PURCHASE = "purchase"
    LEASING = "leasing"
    RAAS = "raas"


class NavigationType(str, Enum):
    LIDAR_SLAM = "lidar_slam"
    VISUAL_SLAM = "visual_slam"
    MAGNETIC_TAPE = "magnetic_tape"
    QR_MARKERS = "qr_markers"
    WIRE_GUIDED = "wire_guided"
    OTHER = "other"


class CompatibilityVerdict(str, Enum):
    ALLOWED = "allowed"
    FORBIDDEN = "forbidden"
    WARNING = "warning"
    NEEDS_REVIEW = "needs_review"


class MatchStatus(str, Enum):
    RECOMMENDED = "recommended"
    NEEDS_REVIEW = "needs_review"
    EXCLUDED = "excluded"


class ZoneType(str, Enum):
    STORAGE = "storage"
    OPERATION = "operation"
    CHARGING = "charging"
    RESTRICTED = "restricted"
    TRANSIT = "transit"


class RobotState(str, Enum):
    IDLE = "idle"
    MOVING = "moving"
    LOADING = "loading"
    UNLOADING = "unloading"
    CHARGING = "charging"
    BLOCKED = "blocked"


class FinancingType(str, Enum):
    OWN_FUNDS = "own_funds"
    CREDIT = "credit"
    LEASING = "leasing"
    RAAS = "raas"


class ScenarioKind(str, Enum):
    BASELINE = "baseline"
    PURCHASE = "purchase"
    RAAS = "raas"
    CUSTOM = "custom"


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    CALCULATED = "calculated"
    ARCHIVED = "archived"
