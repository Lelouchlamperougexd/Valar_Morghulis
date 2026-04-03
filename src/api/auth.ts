import api from './index';
import type { User } from '../context/AuthContext';

// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
  phone: string;
}

export interface RegisterCompanyPayload {
  city: string;
  company_email: string;
  company_name: string;
  company_phone: string;
  company_type: 'agency' | 'developer';
  first_name: string;
  invite_token?: string;
  job_title: string;
  last_name: string;
  password: string;
  password_confirmation: string;
  registration_number: string;
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: User;
}

export type RegisterResponse = User & { token: string };

// ─── API Calls ────────────────────────────────────────────────────────────────

/** POST /authentication/token — user login */
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/authentication/token', payload);
  return res.data;
}

/** POST /authentication/admin/token — admin / moderator login */
export async function loginAdmin(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/authentication/admin/token', payload);
  return res.data;
}

/** POST /authentication/user — register regular user */
export async function registerUser(payload: RegisterUserPayload): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/authentication/user', payload);
  return res.data;
}

/** POST /authentication/company — register agency / developer */
export async function registerCompany(payload: RegisterCompanyPayload): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/authentication/company', payload);
  return res.data;
}

/** GET /authentication/me — get current user profile */
export async function getMe(): Promise<User> {
  const res = await api.get<User>('/authentication/me');
  return res.data;
}

/** Helper — extract a human-readable error message from axios errors */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { data?: unknown; status?: number } };
    const data = axiosErr.response?.data;
    if (typeof data === 'string' && data.length > 0) return data;
    if (data && typeof data === 'object' && 'message' in data) {
      return String((data as { message: unknown }).message);
    }
    const status = axiosErr.response?.status;
    if (status === 401) return 'Неверный email или пароль';
    if (status === 403) return 'Доступ запрещён';
    if (status === 400) return 'Проверьте правильность заполненных полей';
  }
  return 'Произошла ошибка. Попробуйте ещё раз.';
}
