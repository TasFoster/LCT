import { Placeholder } from '../../shared/ui/Placeholder';

export function ForbiddenPage() {
  return <Placeholder title="Нет доступа" purpose="Раздел доступен только администраторам каталога." />;
}

export function NotFoundPage() {
  return <Placeholder title="Страница не найдена" purpose="Проверьте ссылку или вернитесь к списку проектов." />;
}
