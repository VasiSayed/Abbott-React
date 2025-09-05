import axios from "axios";
import type { AxiosRequestConfig } from "axios";

/** augment axios config to allow { skipAuth: true } */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

/** attach token to requests unless explicitly disabled or hitting /api/auth/* */
api.interceptors.request.use((config) => {
  const url = config.url || "";
  if (config.skipAuth || url.startsWith("/api/auth/")) {
    return config;
  }
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

/** small helper to persist tokens */
export function setTokens(tokens: { access?: string; refresh?: string }) {
  if (tokens.access) localStorage.setItem("access_token", tokens.access);
  if (tokens.refresh) localStorage.setItem("refresh_token", tokens.refresh);
}
export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

/* ---------- types (unchanged) ---------- */
export type Expert = {
  id: string;
  name: string;
  role?: string | null;
  description?: string;
  photo_url?: string | null;
  order: number;
};

export type EventDTO = {
  id: string;
  code: string;
  title: string | null;
  description: string | null;
  link: string;
  color?: number | null;
  color_hex?: string | null;
  banner_url?: string | null;
  start_at: string;
  end_at: string;
  is_current: boolean;
  is_live_now: boolean;
  window_opens_at: string;
  experts: Expert[];
};

export type Registration = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  hospital: string;
  speciality: string;
  event: string;
  timestamp: string;
  checkbox_selections?: string;
};

export type DashboardMetrics = {
  total_registrations: number;
  upcoming_meetings: number;
  past_7_days_registrations: number;
  reports_generated: number;
};

export type AnalyticsData = {
  daily_registrations: Array<{ date: string; count: number }>;
  weekly_registrations: Array<{ week: string; count: number }>;
  specialty_distribution: Array<{
    specialty: string;
    count: number;
    percentage: number;
  }>;
  hospital_participation: Array<{ hospital: string; count: number }>;
};

/* ---------- simple APIs ---------- */
export const getEvent = (code: string) =>
  api.get<EventDTO>(`/api/events/${encodeURIComponent(code)}/`);

export const openEvent = (code: string) =>
  api.post<{ ok: boolean; link?: string; message?: string; event?: EventDTO }>(
    `/api/events/${encodeURIComponent(code)}/open/`
  );

/* ---------- auth ---------- */
export const authAPI = {
  /** accepts { username, password } OR { email, password } */
  login: (credentials: {
    username?: string;
    email?: string;
    password: string;
  }) =>
    api.post<{ access: string; refresh: string }>(
      "/api/auth/token/",
      credentials,
      { skipAuth: true } as AxiosRequestConfig
    ),

  /** OPTIONAL: adjust if your register endpoint differs or returns a different shape */
  register: (payload: {
    username: string;
    email: string;
    password: string;
    name?: string;
  }) =>
    api.post<{ access?: string; refresh?: string }>(
      "/api/auth/register/",
      payload,
      { skipAuth: true } as AxiosRequestConfig
    ),

  refresh: (refresh: string) =>
    api.post<{ access: string }>(
      "/api/auth/token/refresh/",
      { refresh },
      { skipAuth: true }
    ),

  verify: (token: string) =>
    api.post("/api/auth/token/verify/", { token }, { skipAuth: true }),

  getCurrentUser: () => api.get("/api/auth/me/"),

  logout: () => {
    clearTokens();
    return Promise.resolve();
  },
};

/* ---------- the rest of your APIs stay as-is ---------- */
// ... eventsAPI, registrationsAPI, analyticsAPI, reportsAPI, profilesAPI, expertsAPI, logsAPI
