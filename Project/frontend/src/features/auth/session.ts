import { create } from 'zustand';

export type UserRole = 'guest' | 'user' | 'admin';

interface SessionState {
  role: UserRole;
  userName: string | null;
  /** Заглушка до появления реальной авторизации (backend-glue). */
  signInAs: (role: UserRole, userName?: string) => void;
  signOut: () => void;
}

const KEY = 'robocalc-session';
const DEFAULT_NAME = 'Иван Петров';

/**
 * Начальная роль: ?as=user|admin в адресе (для проверки экранов и скриншотов),
 * иначе — сохранённая в этой вкладке, иначе гость. Уйдёт вместе с заглушкой.
 */
function initial(): Pick<SessionState, 'role' | 'userName'> {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('as');
    if (fromUrl === 'user' || fromUrl === 'admin') return { role: fromUrl, userName: DEFAULT_NAME };
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Pick<SessionState, 'role' | 'userName'> | null;
    if (saved && (saved.role === 'user' || saved.role === 'admin')) return saved;
  } catch {
    /* хранилище недоступно — начинаем гостем */
  }
  return { role: 'guest', userName: null };
}

function persist(state: Pick<SessionState, 'role' | 'userName'>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* приватный режим — сессия просто не переживёт перезагрузку */
  }
}

export const useSession = create<SessionState>((set) => ({
  ...initial(),
  signInAs: (role, userName = DEFAULT_NAME) => {
    const next = { role, userName: role === 'guest' ? null : userName };
    persist(next);
    set(next);
  },
  signOut: () => {
    const next = { role: 'guest' as const, userName: null };
    persist(next);
    set(next);
  },
}));
