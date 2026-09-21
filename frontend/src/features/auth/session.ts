import { create } from 'zustand';

export type UserRole = 'guest' | 'user' | 'admin';

interface SessionState {
  role: UserRole;
  userName: string | null;
  /** Заглушка до появления реальной авторизации (backend-glue). */
  signInAs: (role: UserRole, userName?: string) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>((set) => ({
  role: 'guest',
  userName: null,
  signInAs: (role, userName = 'Иван Петров') =>
    set({ role, userName: role === 'guest' ? null : userName }),
  signOut: () => set({ role: 'guest', userName: null }),
}));
