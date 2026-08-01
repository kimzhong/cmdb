import { create } from 'zustand';
import { authApi, type User } from '@/api/auth';

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  clear: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('cmdb.token'),
  user: null,
  setSession: (token, user) => {
    localStorage.setItem('cmdb.token', token);
    set({ token, user });
  },
  clear: () => {
    localStorage.removeItem('cmdb.token');
    set({ token: null, user: null });
  },
  loadFromStorage: () => {
    const token = localStorage.getItem('cmdb.token');
    if (token) {
      // 试着拉一下 me
      authApi.me().then((u) => set({ user: u as User })).catch(() => undefined);
    }
  },
}));
