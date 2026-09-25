import { Progress } from '../shared/ui';

/** Статус долгого расчёта: не блокирует экран, со страницы можно уйти. */
export function CalcStatus({ progress, label }: { progress: number; label: string }) {
  const left = Math.max(1, Math.round(((100 - progress) / 100) * 40));
  return (
    <div className="calc-status" role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      <strong>{label}</strong>
      <Progress value={progress} />
      <span className="muted num">осталось ~{left} с · можно уйти со страницы, результат сохранится</span>
    </div>
  );
}
