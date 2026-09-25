import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../../features/wizard/store';
import { createProject } from '../../features/projectApi';
import { OBJECT_TYPES } from '../../shared/mock/dictionaries';
import { OBJECT_ICON } from '../../shared/mock/projects';
import { ROUTES } from '../../shared/config/routes';
import type { ObjectType } from '../../shared/types/contracts';
import { Button, ButtonLink, Card, PageHeader, TextField } from '../../shared/ui';

/** Новый проект: только название и тип — дальше сразу шаг 2 визарда. */
export function NewProjectPage() {
  const navigate = useNavigate();
  const update = useWizardStore((s) => s.update);
  const complete = useWizardStore((s) => s.complete);
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [type, setType] = useState<ObjectType | null>(null);
  const [tried, setTried] = useState(false);

  const nameError = tried && !name.trim() ? 'Назовите проект — так его будет проще найти в списке' : null;
  const typeError = tried && !type ? 'Выберите тип объекта' : null;

  const [creating, setCreating] = useState(false);

  const submit = async () => {
    setTried(true);
    if (!name.trim() || !type) return;
    setCreating(true);
    // POST /api/projects — запись проекта создаётся сразу, дальше части досылаются в неё по id
    const state = await createProject({ name: name.trim(), object_type: type, site: site.trim() || null });
    const id = state.project_id;
    update(id, { objectType: type, projectName: name.trim(), projectSite: site.trim() });
    complete(id, 'object');
    navigate(ROUTES.wizardStep(id, 'params'));
  };

  return (
    <div className="page page--narrow">
      <PageHeader eyebrow="Новый проект" title="Что будем считать?" description="Название и тип объекта. Всё остальное спросим по шагам — черновик сохраняется автоматически." />

      <Card>
        <form
          className="stack stack--lg"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid--2">
            <TextField label="Название проекта" required value={name} onChange={setName} placeholder="Например, Склад в Химках" error={nameError} />
            <TextField label="Площадка" value={site} onChange={setSite} placeholder="Город, адрес или корпус" hint="необязательно, для поиска в списке" />
          </div>

          <div className="stack stack--sm">
            <span className="field__label">
              Тип объекта<span className="field__req">*</span>
            </span>
            <div className="grid grid--3">
              {OBJECT_TYPES.map((o) => (
                <button key={o.value} type="button" className="choice" aria-pressed={type === o.value} onClick={() => setType(o.value)}>
                  <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden>
                    {OBJECT_ICON[o.value]}
                  </span>
                  <strong>{o.label}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {o.description}
                  </span>
                </button>
              ))}
            </div>
            {typeError && <span className="field__error">{typeError}</span>}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <ButtonLink to={ROUTES.projects} variant="ghost">
              Отмена
            </ButtonLink>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? 'Создаём…' : 'Создать и заполнить параметры →'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
