import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent';

export function Chip({ tone = 'neutral', plain, children }: { tone?: Tone; plain?: boolean; children: ReactNode }) {
  const cls = ['chip', tone !== 'neutral' && `chip--${tone}`, plain && 'chip--plain'].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}

interface CardProps {
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Card({ title, actions, footer, flush, children, className, id }: CardProps) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`} id={id}>
      {(title || actions) && (
        <header className="card__head">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      <div className={`card__body${flush ? ' card__body--flush' : ''}`}>{children}</div>
      {footer && <footer className="card__foot">{footer}</footer>}
    </section>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}

export function Stat({ label, value, sub, accent }: StatProps) {
  return (
    <div className={`stat${accent ? ' stat--accent' : ''}`}>
      <span className="label">{label}</span>
      <span className="stat__value">{value}</span>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

interface AlertProps {
  tone?: 'info' | 'warn' | 'danger' | 'ok';
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

export function Alert({ tone = 'info', title, children, action }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <div className="alert__body">
        {title && <strong>{title}</strong>}
        {children && <span className="muted">{children}</span>}
      </div>
      {action}
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = '◇', title, children, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      {children && <p style={{ maxWidth: '52ch' }}>{children}</p>}
      {action}
    </div>
  );
}

interface StubProps {
  title: string;
  owner?: string;
  children?: ReactNode;
  planned: string[];
  contracts?: string[];
  minHeight?: number;
}

/**
 * Честная заглушка для частей, которые делаются отдельно (2D-редактор, 3D,
 * симуляция): что здесь будет, кто делает, на каких данных.
 */
export function Stub({ title, owner, children, planned, contracts, minHeight }: StubProps) {
  return (
    <div className="stub" style={minHeight ? { minHeight } : undefined}>
      <span className="stub__badge">Заглушка</span>
      <h2>{title}</h2>
      {children && <p className="muted" style={{ maxWidth: '72ch' }}>{children}</p>}
      <div className="stack stack--sm">
        <span className="label">Что здесь будет</span>
        <ul>
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {(owner || contracts) && (
        <div className="row" style={{ gap: 20 }}>
          {owner && (
            <span className="muted">
              Делает: <strong style={{ color: 'var(--ink)' }}>{owner}</strong>
            </span>
          )}
          {contracts && (
            <span className="muted">
              Данные: <span className="mono">{contracts.join(', ')}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-head">
      <div className="page-head__text">
        {eyebrow && <span className="label">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}

export function Progress({ value, tone }: { value: number; tone?: 'ok' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`progress${tone ? ` progress--${tone}` : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Bar({ value, tone }: { value: number; tone?: 'ok' | 'warn' | 'accent' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`bar${tone ? ` bar--${tone}` : ''}`} aria-hidden>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label?: string;
}

export function Segmented<T extends string>({ value, onChange, options, label }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Подпись «данные — заглушка» на экранах с моковыми данными. */
export function MockNote({ children = 'Демонстрационные данные — до подключения API' }: { children?: ReactNode }) {
  return (
    <span className="chip chip--warn chip--plain" title="Экран работает на моковых данных">
      {children}
    </span>
  );
}
