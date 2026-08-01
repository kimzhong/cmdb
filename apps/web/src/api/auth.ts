import { http } from './client';

export interface User {
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    http.post<{ token: string; user: User }>('/auth/login', { username, password }),
  me: () => http.get<User>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post<{ ok: boolean }>('/auth/change-password', { oldPassword, newPassword }),
  register: (data: { username: string; password: string; role: User['role']; displayName?: string }) =>
    http.post<User>('/auth/register', data),
};
