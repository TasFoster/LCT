import type { ReactNode } from 'react';

interface PlaceholderProps {
  title: string;
  /** Что этот экран делает — из docs/architecture/pages.md */
  purpose: string;
  /** Контракты, на которых он строится */
  contracts?: string[];
  children?: ReactNode;
}

/** Временная заглушка экрана: держит маршрут и напоминает, что здесь будет. */
export function Placeholder({ title, purpose, contracts, children }: PlaceholderProps) {
  return (
    <section className="placeholder">
      <h1>{title}</h1>
      <p>{purpose}</p>
      {contracts && contracts.length > 0 && (
        <p className="placeholder__contracts">Данные: {contracts.join(', ')}</p>
      )}
      {children}
    </section>
  );
}
