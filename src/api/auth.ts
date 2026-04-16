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

// Backend wraps ALL successful responses in { data: ... }
interface BackendEnvelope<T> {
  data: T;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Register returns UserWithToken — user fields + token at top level (also in data envelope)
export interface RegisterResponse {
  token: string;
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: User['role'];
  company_id?: number;
  role_id?: number;
  phone?: string;
  job_title?: string;
  country?: string;
  is_active?: boolean;
  push_opt_in?: boolean;
  created_at?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/** POST /authentication/token — universal login for all roles */
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<BackendEnvelope<AuthResponse>>('/authentication/token', payload);
  return res.data.data;
}

/** POST /authentication/admin/token — admin / moderator login */
export async function loginAdmin(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<BackendEnvelope<AuthResponse>>('/authentication/admin/token', payload);
  return res.data.data;
}

/** POST /authentication/user — register regular user */
export async function registerUser(payload: RegisterUserPayload): Promise<RegisterResponse> {
  const res = await api.post<BackendEnvelope<RegisterResponse>>('/authentication/user', payload);
  return res.data.data;
}

/** POST /authentication/company — register agency / developer */
export async function registerCompany(payload: RegisterCompanyPayload): Promise<RegisterResponse> {
  const res = await api.post<BackendEnvelope<RegisterResponse>>('/authentication/company', payload);
  return res.data.data;
}

/** GET /authentication/me — get current user profile */
export async function getMe(): Promise<User> {
  const res = await api.get<BackendEnvelope<User>>('/authentication/me');
  return res.data.data;
}

// ─── Error Handling ───────────────────────────────────────────────────────────

/** Extract a human-readable error message from axios / backend errors */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { data?: unknown; status?: number } };
    const data = axiosErr.response?.data;
    const status = axiosErr.response?.status;

    // Always show friendly message for server errors — never leak raw backend text
    if (status === 500) return 'Ошибка сервера. Попробуйте позже';

    // Backend error format: { "error": "some message" }
    if (data && typeof data === 'object' && 'error' in data) {
      const msg = String((data as { error: unknown }).error);
      if (msg === 'unauthorized') return 'Неверный email или пароль';
      if (msg === 'forbidden') return 'Доступ запрещён';
      if (msg === 'not found') return 'Пользователь не найден';
      if (msg.includes('duplicate') || msg.includes('already exists')) return 'Пользователь с таким email уже существует';
      if (msg.length > 0 && msg.length < 200) return msg;
    }

    // Fallback by status code
    if (status === 401) return 'Неверный email или пароль';
    if (status === 403) return 'Доступ запрещён';
    if (status === 400) return 'Проверьте правильность заполненных полей';
    if (status === 429) return 'Слишком много попыток. Подождите немного';
  }

  // Network error (no response at all)
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    if (msg.includes('Network Error') || msg.includes('ERR_')) {
      return 'Нет соединения с сервером. Проверьте подключение';
    }
  }

  return 'Произошла ошибка. Попробуйте ещё раз.';
}
