import { useState } from 'react';
import { useSession } from '../../features/auth/session';
import { Alert, Button, Card, Checkbox, PageHeader, TextField } from '../../shared/ui';

/** Профиль: имя, организация, e-mail, пароль, уведомления. */
export function ProfilePage() {
  const { userName, role } = useSession();
  const [name, setName] = useState(userName ?? '');
  const [org, setOrg] = useState('ООО «Логистик Групп»');
  const [email, setEmail] = useState('petrov@example.ru');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [notify, setNotify] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);

  const passError = next && next.length < 8 ? 'Не короче 8 символов' : null;

  return (
    <div className="page page--narrow">
      <PageHeader title="Профиль" description={role === 'admin' ? 'Администратор каталога' : 'Пользователь'} />

      {saved && <Alert tone="ok" title={saved}>Заглушка: изменения не уходят на сервер.</Alert>}

      <Card title="Личные данные" footer={<div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" onClick={() => setSaved('Данные сохранены')}>Сохранить</Button></div>}>
        <div className="form-grid">
          <TextField label="Имя и фамилия" required value={name} onChange={setName} autoComplete="name" />
          <TextField label="Организация" value={org} onChange={setOrg} autoComplete="organization" />
          <TextField label="E-mail" required type="email" value={email} onChange={setEmail} autoComplete="email" hint="на него приходят уведомления о готовности расчёта" />
        </div>
      </Card>

      <Card title="Пароль" footer={<div className="row" style={{ justifyContent: 'flex-end' }}><Button disabled={!current || !next || Boolean(passError)} onClick={() => { setSaved('Пароль изменён'); setCurrent(''); setNext(''); }}>Сменить пароль</Button></div>}>
        <div className="form-grid">
          <TextField label="Текущий пароль" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
          <TextField label="Новый пароль" type="password" value={next} onChange={setNext} autoComplete="new-password" error={passError} hint="не короче 8 символов" />
        </div>
      </Card>

      <Card title="Уведомления">
        <Checkbox checked={notify} onChange={setNotify}>
          Письмо, когда долгий расчёт или симуляция завершены
        </Checkbox>
      </Card>
    </div>
  );
}
