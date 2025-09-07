// api.ts
import axios from "axios";
import type { AxiosRequestConfig } from "axios";

// 1) Extend Axios config to allow skipAuth flag
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

// 2) Small helper to check JWT expiry
const isJwtExpired = (token: string) => {
  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(atob(payload));
    if (!exp) return true;
    return Date.now() / 1000 >= exp; // seconds
  } catch {
    return true;
  }
};

// Create API instance
export const api = axios.create({
  baseURL:"http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  
  if (config.skipAuth) return config;
  const token = localStorage.getItem("access_token");
  if (token && !isJwtExpired(token)) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  } else if (token) {
    // drop stale token so public GETs can work anonymously
    localStorage.removeItem("access_token");
  }
  return config;
});

// ────────────────────────────────────────────────────────────────
// Types
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
  title: string;
  description: string;
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

// ────────────────────────────────────────────────────────────────
// Simple public API functions should skip auth

export const getEvent = (code: string) =>
  api.get<EventDTO>(`/api/events/${encodeURIComponent(code)}/`, {
    skipAuth: true,
  });

export const openEvent = (code: string) =>
  api.post<{ ok: boolean; link?: string; message?: string; event?: EventDTO }>(
    `/api/events/${encodeURIComponent(code)}/open/`,
    null,
    { skipAuth: true }
  );

// ────────────────────────────────────────────────────────────────
// Auth APIs
export const authAPI = {
  login: (credentials: {
    username?: string;
    email?: string;
    password: string;
  }) =>
    api.post<{ access: string; refresh: string }>(
      "/api/auth/token/",
      credentials
    ),

  refresh: (refresh: string) =>
    api.post<{ access: string }>("/api/auth/token/refresh/", { refresh }),

  verify: (token: string) => api.post("/api/auth/token/verify/", { token }),

  getCurrentUser: () => api.get("/api/api/auth/me/"),
};


export const usersAPI = {
  nonStaff: () => api.get("/api/user-non-staff/"),
};


// ────────────────────────────────────────────────────────────────
// Events APIs
export const eventsAPI = {
  // PUBLIC reads → skipAuth: true
  list: (params?: { status?: "live" | "upcoming" | "past"; limit?: number }) =>
    api.get<EventDTO[]>("/api/events/", { params, skipAuth: true }),

  // Admin creates/updates/deletes keep auth
  create: (data: Partial<EventDTO>) => api.post<EventDTO>("/api/events/", data),

  // joinAuth: (code: string) =>
  //   api.post<{
  //     ok: boolean;
  //     link?: string;
  //     message?: string;
  //     event?: EventDTO;
  //   }>(`/api/events/${encodeURIComponent(code)}/join/`),



  joinAuth: (code: string) =>
    axios.post(`/api/events/${code}/join/`, {}, { validateStatus: () => true }),

  registerAndJoin: (
    code: string,
    payload: {
      name: string;
      mobile: string;
      email: string;
      hospital: string;
      speciality: string;
      accept_policy: boolean;
      accept_recording: boolean;
      contact_optin?: "Yes" | "No";
    }
  ) =>
    api.post<{
      ok: boolean;
      link?: string;
      message?: string;
      tokens?: { access: string; refresh: string };
      event?: EventDTO;
    }>(`/api/events/${encodeURIComponent(code)}/register/`, payload, {
      skipAuth: true, // public endpoint
    }),

  get: (code: string) =>
    api.get<EventDTO>(`/api/events/${encodeURIComponent(code)}/`, {
      skipAuth: true,
    }),

  update: (code: string, data: Partial<EventDTO>) =>
    api.patch<EventDTO>(`/api/events/${encodeURIComponent(code)}/`, data),

  delete: (code: string) =>
    api.delete(`/api/events/${encodeURIComponent(code)}/`),

  uploadBanner: (code: string, banner: File) => {
    const formData = new FormData();
    formData.append("banner", banner);
    return api.patch(`/api/events/${encodeURIComponent(code)}/`, formData);
  },

  upcoming: (limit?: number) =>
    api.get<EventDTO[]>("/api/events/upcoming/", {
      params: { limit },
      skipAuth: true,
    }),

  featured: (code: string) =>
    api.get<EventDTO>("/api/events/featured/", {
      params: { code },
      skipAuth: true,
    }),

  open: (code: string) =>
    api.post<{
      ok: boolean;
      link?: string;
      message?: string;
      event?: EventDTO;
    }>(`/api/events/${encodeURIComponent(code)}/open/`, null, {
      skipAuth: true,
    }),

  // Admin-only
  analytics: (code: string) =>
    api.get(`/api/events/${encodeURIComponent(code)}/analytics/`),
};

// ────────────────────────────────────────────────────────────────
// Registrations APIs (keep auth for writes; reads can be public if you want)
export const registrationsAPI = {
  list: (params?: {
    code?: string;
    event?: string;
    date_from?: string;
    date_to?: string;
    specialty?: string;
    limit?: number;
    offset?: number;
  }) => api.get<Registration[]>("/api/joins/", { params }), // add skipAuth:true if this should be public

  create: (data: { user: number; event: string }) =>
    api.post("/api/joins/", data),

  get: (id: string) => api.get<Registration>(`/api/joins/${id}/`),

  update: (id: string, data: Partial<Registration>) =>
    api.patch<Registration>(`/api/joins/${id}/`, data),

  delete: (id: string) => api.delete(`/api/joins/${id}/`),
};

// ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get<DashboardMetrics>("/api/analytics/dashboard/"),
  getAnalytics: (params?: {
    start_date?: string;
    end_date?: string;
    event?: string;
  }) => api.get<AnalyticsData>("/api/analytics/", { params }),
};

// ────────────────────────────────────────────────────────────────
export const reportsAPI = {
  list: () => api.get("/api/reports/"),
  create: (data: {
    title: string;
    report_type: string;
    start_at: string;
    end_at: string;
    include_all: boolean;
    created_by: number;
  }) => api.post("/api/reports/", data),
  get: (id: string) => api.get(`/api/reports/${id}/`),
  update: (id: string, data: any) => api.patch(`/api/reports/${id}/`, data),
  delete: (id: string) => api.delete(`/api/reports/${id}/`),
  uploadFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.patch(`/api/reports/${id}/`, formData);
  },
};

// ────────────────────────────────────────────────────────────────
export const profilesAPI = {
  list: () => api.get("/api/profiles/"),
  create: (data: {
    user: number;
    hospital: string;
    speciality: string;
    phone: string;
  }) => api.post("/api/profiles/", data),
  get: (id: string) => api.get(`/api/profiles/${id}/`),
  update: (id: string, data: any) => api.patch(`/api/profiles/${id}/`, data),
  delete: (id: string) => api.delete(`/api/profiles/${id}/`),
};

// ────────────────────────────────────────────────────────────────
export const expertsAPI = {
  list: () => api.get<Expert[]>("/api/experts/"),
  create: (data: FormData) => api.post<Expert>("/api/experts/", data),
  get: (id: string) => api.get<Expert>(`/api/experts/${id}/`),
  update: (id: string, data: any) =>
    api.patch<Expert>(`/api/experts/${id}/`, data),
  delete: (id: string) => api.delete(`/api/experts/${id}/`),
};

// ────────────────────────────────────────────────────────────────
export const logsAPI = {
  list: (params?: {
    code?: string;
    event?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  }) => api.get("/api/logs/", { params }),
  get: (id: string) => api.get(`/api/logs/${id}/`),
};


