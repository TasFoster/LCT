"""Контракт 1: CatalogItem. Граница Артём -> Стас (catalog/matching).

Обязательные группы полей взяты из раздела "Каталог решений" в CLAUDE.md.
tags/attributes — схемо-управляемое расширение: новое ТТХ или новый тип
решения добавляется как данные, а не как новая колонка/класс.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from .enums import AcquisitionModel, AvailabilityStatus, NavigationType


class Identification(BaseModel):
    manufacturer: str
    product_name: str
    solution_type: str = Field(
        ..., description="Тип решения из справочника: AMR, FMR, робот-штабелер, робот-тягач, робот-уборщик, беспилотный погрузчик, AutoStore и т.п."
    )
    purpose: str = Field(..., description="Назначение / процесс, под который решение подобрано")
    country: str
    availability_status: AvailabilityStatus


class TechnicalSpecs(BaseModel):
    payload_kg: Optional[float] = Field(None, description="Грузоподъёмность, кг")
    dimensions_mm: Optional[str] = Field(None, description="Габариты Д×Ш×В, мм")
    speed_mps: Optional[float] = Field(None, description="Максимальная скорость, м/с")
    throughput_per_hour: Optional[float] = Field(None, description="Производительность, операций/час")
    autonomy_hours: Optional[float] = Field(None, description="Автономность работы от заряда, ч")
    positioning_accuracy_mm: Optional[float] = Field(None, description="Точность позиционирования, мм")
    navigation_type: Optional[NavigationType] = None
    operating_conditions: Optional[str] = Field(None, description="Температура/влажность/пыль и т.п.")


class Infrastructure(BaseModel):
    aisle_width_mm: Optional[float] = Field(None, description="Минимальная ширина прохода, мм")
    charging_type: Optional[str] = None
    connectivity: Optional[str] = Field(None, description="Требования к связи (Wi-Fi, 5G и т.п.)")
    integration_notes: Optional[str] = None
    service_model: Optional[str] = Field(None, description="Модель сервисного обслуживания")


class EconomicsInfo(BaseModel):
    equipment_cost: Optional[float] = Field(None, description="Ориентировочная стоимость оборудования, ₽, с НДС")
    software_cost: Optional[float] = Field(None, description="Стоимость ПО/лицензий, ₽")
    implementation_cost: Optional[float] = Field(None, description="Стоимость внедрения/интеграции, ₽")
    maintenance_cost_per_year: Optional[float] = Field(None, description="Стоимость обслуживания, ₽/год")
    acquisition_model: AcquisitionModel = AcquisitionModel.PURCHASE
    service_life_years: Optional[float] = Field(None, description="Срок службы, лет")


class Applicability(BaseModel):
    supported_object_types: list[str] = Field(default_factory=list, description="Отрасли/типы объектов")
    supported_processes: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    case_studies: list[str] = Field(default_factory=list, description="Ссылки/описания внедрений")


class DataQuality(BaseModel):
    source: str = Field(..., description="Источник данных: каталог оргов, сайт производителя и т.п.")
    source_url: Optional[str] = None
    last_updated: date
    confidence: str = Field("unverified", description="verified / partial / unverified")


class CatalogItem(BaseModel):
    id: str
    identification: Identification
    technical: TechnicalSpecs
    infrastructure: Infrastructure
    economics: EconomicsInfo
    applicability: Applicability
    data_quality: DataQuality
    tags: list[str] = Field(default_factory=list, description="Теги для фильтрации в matching и topology")
    attributes: dict[str, str | float | int | bool] = Field(
        default_factory=dict, description="Доп. характеристики без изменения схемы (расширяемость каталога)"
    )
