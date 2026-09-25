import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CATALOG } from '../../shared/mock/catalog';
import {
  ACQUISITION_LABEL,
  AVAILABILITY_LABEL,
  CONFIDENCE_LABEL,
  NAVIGATION_LABEL,
  OBJECT_TYPES,
  PROCESSES,
  SOLUTION_TYPES,
} from '../../shared/mock/dictionaries';
import { ROUTES } from '../../shared/config/routes';
import type { AcquisitionModel, AvailabilityStatus, CatalogItem, NavigationType } from '../../shared/types/contracts';
import type { DataConfidence } from '../../shared/mock/dictionaries';
import { Alert, Button, ButtonLink, Card, MockNote, NumberField, SelectField, TagsField, TextField } from '../../shared/ui';

function blank(): CatalogItem {
  return {
    id: '',
    identification: { manufacturer: '', product_name: '', solution_type: 'amr', purpose: '', country: 'Россия', availability_status: 'available' },
    technical: { payload_kg: null, dimensions_mm: null, speed_mps: null, throughput_per_hour: null, autonomy_hours: null, positioning_accuracy_mm: null, navigation_type: null, operating_conditions: null },
    infrastructure: { aisle_width_mm: null, charging_type: null, connectivity: null, integration_notes: null, service_model: null },
    economics: { equipment_cost: null, software_cost: null, implementation_cost: null, maintenance_cost_per_year: null, acquisition_model: 'purchase', service_life_years: null },
    applicability: { supported_object_types: [], supported_processes: [], limitations: [], case_studies: [] },
    data_quality: { source: '', source_url: null, last_updated: new Date().toISOString().slice(0, 10), confidence: 'unverified' },
    tags: [],
    attributes: {},
  };
}

const SECTIONS = [
  { id: 'ident', title: 'Идентификация' },
  { id: 'tech', title: 'Технические характеристики' },
  { id: 'infra', title: 'Инфраструктура' },
  { id: 'econ', title: 'Экономика' },
  { id: 'apply', title: 'Применимость' },
  { id: 'quality', title: 'Качество данных' },
];

/** Карточка позиции каталога: шесть групп полей CatalogItem. */
export function AdminCatalogItemPage() {
  const { itemId = 'new' } = useParams();
  const isNew = itemId === 'new';
  const source = CATALOG.find((c) => c.id === itemId);
  const [item, setItem] = useState<CatalogItem>(() => structuredClone(source ?? blank()));
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState(false);

  type Groups = Omit<CatalogItem, 'id' | 'tags' | 'attributes'>;
  const set = <G extends keyof Groups>(group: G, patch: Partial<Groups[G]>) => {
    setSaved(false);
    setItem((x) => ({ ...x, [group]: { ...x[group], ...patch } }));
  };

  const errors = {
    manufacturer: !item.identification.manufacturer.trim() ? 'Обязательное поле' : null,
    product_name: !item.identification.product_name.trim() ? 'Обязательное поле' : null,
    purpose: !item.identification.purpose.trim() ? 'Обязательное поле' : null,
    source: !item.data_quality.source.trim() ? 'Укажите, откуда данные' : null,
  };
  const e = (k: keyof typeof errors) => (tried ? errors[k] : null);

  if (!isNew && !source) {
    return (
      <div className="page">
        <Alert tone="danger" title="Позиция не найдена" action={<ButtonLink to={ROUTES.adminCatalog}>К каталогу</ButtonLink>} />
      </div>
    );
  }

  const n = (v: number | null) => v;
  const s = (v: string | null) => v ?? '';
  const orNull = (v: string) => (v.trim() ? v : null);

  return (
    <div className="page">
      <nav className="faint">
        <Link to={ROUTES.adminCatalog}>Позиции каталога</Link> / {isNew ? 'новая' : item.id}
      </nav>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{isNew ? 'Новая позиция' : item.identification.product_name}</h1>
          <p className="muted">Пустые необязательные поля не мешают подбору — позиция просто не пройдёт проверки, где это поле нужно.</p>
        </div>
        <div className="page-head__actions">
          <MockNote />
        </div>
      </div>

      {saved && <Alert tone="ok" title="Сохранено">Заглушка: изменения не уходят на сервер.</Alert>}
      {tried && Object.values(errors).some(Boolean) && <Alert tone="danger" title="Заполните обязательные поля">Они отмечены красным.</Alert>}

      <div className="step-3col" style={{ gridTemplateColumns: '220px minmax(0, 1fr)' }}>
        <nav className="card sticky-side" style={{ top: 'calc(var(--header-h) + 16px)' }} aria-label="Группы полей">
          <div className="card__body sections-nav">
            {SECTIONS.map((sec) => (
              <a key={sec.id} href={`#g-${sec.id}`}>
                {sec.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="stack">
          <Card title="Идентификация" id="g-ident">
            <div className="form-grid">
              <TextField label="Производитель" required value={item.identification.manufacturer} onChange={(v) => set('identification', { manufacturer: v })} error={e('manufacturer')} />
              <TextField label="Наименование" required value={item.identification.product_name} onChange={(v) => set('identification', { product_name: v })} error={e('product_name')} />
              <SelectField label="Тип решения" required value={item.identification.solution_type} options={SOLUTION_TYPES} onChange={(v) => set('identification', { solution_type: v })} hint="из единого справочника categories.json" />
              <TextField label="Страна" required value={item.identification.country} onChange={(v) => set('identification', { country: v })} />
              <TextField label="Назначение" required wide value={item.identification.purpose} onChange={(v) => set('identification', { purpose: v })} error={e('purpose')} hint="процесс, под который решение подходит" />
              <SelectField
                label="Доступность"
                required
                value={item.identification.availability_status}
                options={(Object.keys(AVAILABILITY_LABEL) as AvailabilityStatus[]).map((k) => ({ value: k, label: AVAILABILITY_LABEL[k] }))}
                onChange={(v) => set('identification', { availability_status: v as AvailabilityStatus })}
              />
            </div>
          </Card>

          <Card title="Технические характеристики" id="g-tech">
            <div className="form-grid">
              <NumberField label="Грузоподъёмность" unit="кг" value={n(item.technical.payload_kg)} onChange={(v) => set('technical', { payload_kg: v })} />
              <TextField label="Габариты Д×Ш×В" unit="мм" value={s(item.technical.dimensions_mm)} onChange={(v) => set('technical', { dimensions_mm: orNull(v) })} placeholder="1150 × 780 × 320" />
              <NumberField label="Максимальная скорость" unit="м/с" value={n(item.technical.speed_mps)} onChange={(v) => set('technical', { speed_mps: v })} />
              <NumberField label="Производительность" unit="оп./ч" value={n(item.technical.throughput_per_hour)} onChange={(v) => set('technical', { throughput_per_hour: v })} />
              <NumberField label="Автономность" unit="ч" value={n(item.technical.autonomy_hours)} onChange={(v) => set('technical', { autonomy_hours: v })} />
              <NumberField label="Точность позиционирования" unit="мм" value={n(item.technical.positioning_accuracy_mm)} onChange={(v) => set('technical', { positioning_accuracy_mm: v })} />
              <SelectField
                label="Тип навигации"
                value={item.technical.navigation_type ?? ''}
                placeholder="Не указан"
                options={(Object.keys(NAVIGATION_LABEL) as NavigationType[]).map((k) => ({ value: k, label: NAVIGATION_LABEL[k] }))}
                onChange={(v) => set('technical', { navigation_type: v as NavigationType })}
              />
              <TextField label="Условия эксплуатации" value={s(item.technical.operating_conditions)} onChange={(v) => set('technical', { operating_conditions: orNull(v) })} placeholder="+5…+40 °C, без пыли" />
            </div>
          </Card>

          <Card title="Инфраструктура" id="g-infra">
            <div className="form-grid">
              <NumberField label="Минимальная ширина прохода" unit="мм" value={n(item.infrastructure.aisle_width_mm)} onChange={(v) => set('infrastructure', { aisle_width_mm: v })} hint="используется правилами совместимости" />
              <TextField label="Тип зарядки" value={s(item.infrastructure.charging_type)} onChange={(v) => set('infrastructure', { charging_type: orNull(v) })} />
              <TextField label="Требования к связи" value={s(item.infrastructure.connectivity)} onChange={(v) => set('infrastructure', { connectivity: orNull(v) })} />
              <TextField label="Модель сервиса" value={s(item.infrastructure.service_model)} onChange={(v) => set('infrastructure', { service_model: orNull(v) })} />
              <TextField label="Заметки по интеграции" wide value={s(item.infrastructure.integration_notes)} onChange={(v) => set('infrastructure', { integration_notes: orNull(v) })} />
            </div>
          </Card>

          <Card title="Экономика" id="g-econ">
            <div className="form-grid">
              <NumberField label="Стоимость оборудования" unit="₽ с НДС" value={n(item.economics.equipment_cost)} onChange={(v) => set('economics', { equipment_cost: v })} />
              <NumberField label="ПО и лицензии" unit="₽" value={n(item.economics.software_cost)} onChange={(v) => set('economics', { software_cost: v })} />
              <NumberField label="Внедрение и интеграция" unit="₽" value={n(item.economics.implementation_cost)} onChange={(v) => set('economics', { implementation_cost: v })} />
              <NumberField label="Обслуживание" unit="₽/год" value={n(item.economics.maintenance_cost_per_year)} onChange={(v) => set('economics', { maintenance_cost_per_year: v })} />
              <SelectField
                label="Модель приобретения"
                value={item.economics.acquisition_model}
                options={(Object.keys(ACQUISITION_LABEL) as AcquisitionModel[]).map((k) => ({ value: k, label: ACQUISITION_LABEL[k] }))}
                onChange={(v) => set('economics', { acquisition_model: v as AcquisitionModel })}
              />
              <NumberField label="Срок службы" unit="лет" value={n(item.economics.service_life_years)} onChange={(v) => set('economics', { service_life_years: v })} />
            </div>
          </Card>

          <Card title="Применимость" id="g-apply">
            <div className="form-grid">
              <TagsField
                label="Типы объектов"
                wide
                value={item.applicability.supported_object_types.map((t) => OBJECT_TYPES.find((o) => o.value === t)?.label ?? t)}
                suggestions={OBJECT_TYPES.map((o) => o.label)}
                onChange={(labels) => set('applicability', { supported_object_types: labels.map((l) => OBJECT_TYPES.find((o) => o.label === l)?.value ?? l) })}
              />
              <TagsField label="Процессы" wide value={item.applicability.supported_processes} suggestions={PROCESSES} onChange={(v) => set('applicability', { supported_processes: v })} />
              <TagsField label="Ограничения применения" wide value={item.applicability.limitations} onChange={(v) => set('applicability', { limitations: v })} placeholder="Впишите и нажмите Enter" />
              <TagsField label="Внедрения" wide value={item.applicability.case_studies} onChange={(v) => set('applicability', { case_studies: v })} placeholder="Впишите и нажмите Enter" />
            </div>
          </Card>

          <Card title="Качество данных" id="g-quality">
            <div className="form-grid">
              <TextField label="Источник" required value={item.data_quality.source} onChange={(v) => set('data_quality', { source: v })} error={e('source')} placeholder="Сайт производителя, каталог оргов…" />
              <TextField label="Ссылка на источник" value={s(item.data_quality.source_url)} onChange={(v) => set('data_quality', { source_url: orNull(v) })} placeholder="https://" />
              <TextField label="Дата актуализации" type="date" required value={item.data_quality.last_updated} onChange={(v) => set('data_quality', { last_updated: v })} />
              <SelectField
                label="Достоверность"
                required
                value={item.data_quality.confidence}
                options={(Object.keys(CONFIDENCE_LABEL) as DataConfidence[]).map((k) => ({ value: k, label: CONFIDENCE_LABEL[k] }))}
                onChange={(v) => set('data_quality', { confidence: v as DataConfidence })}
                hint="непроверенные позиции в подборе получают статус «Требует проверки»"
              />
            </div>
          </Card>

          <div className="card row row--between" style={{ position: 'sticky', bottom: 0, padding: '12px 18px', boxShadow: 'var(--shadow-2)' }}>
            <ButtonLink to={ROUTES.adminCatalog} variant="ghost">
              Отмена
            </ButtonLink>
            <div className="row">
              {!isNew && (
                <Button variant="danger" onClick={() => setSaved(true)}>
                  Снять с публикации
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => {
                  setTried(true);
                  if (!Object.values(errors).some(Boolean)) setSaved(true);
                }}
              >
                {isNew ? 'Добавить в каталог' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
