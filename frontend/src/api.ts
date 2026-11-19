export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError extends Error {
  status: number;
  details?: unknown;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
}

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "wshub:access_token";
const REFRESH_KEY = "wshub:refresh_token";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(session: Session | null) {
  if (session) {
    localStorage.setItem(TOKEN_KEY, session.access_token);
    localStorage.setItem(REFRESH_KEY, session.refresh_token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

async function parseResponse(response: Response) {
  if (response.status === 204) return null;
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    error.details = body?.details;
    throw error;
  }
  return body;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean; raw?: boolean } = {},
): Promise<T> {
  const { auth = true, raw = false, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);
  if (body && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const makeRequest = () => fetch(`${API_BASE}${path}`, {
    ...rest,
    signal: rest.signal ?? AbortSignal.timeout(20_000),
    body,
    headers: requestHeaders,
  });

  let response = await makeRequest();
  if (response.status === 401 && auth) {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      try {
        const refreshed = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          signal: AbortSignal.timeout(20_000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshBody = await parseResponse(refreshed);
        if (refreshBody?.data?.session) setSession(refreshBody.data.session);
        if (getAccessToken()) {
          requestHeaders.set("Authorization", `Bearer ${getAccessToken()}`);
          response = await makeRequest();
        }
      } catch {
        setSession(null);
      }
    }
  }

  const parsed = await parseResponse(response);
  if (raw) return parsed as T;
  if (parsed?.meta) return parsed as T;
  return (parsed?.data ?? parsed) as T;
}

export const authApi = {
  signup: (body: { email: string; password: string; fullName: string; phone?: string; accountType?: "user" | "business_owner"; memberType?: "founder" | "business" | "investor" | "mentor" | "student" | "professional" }) =>
    apiRequest<{ user: { id: string; email: string }; session: Session | null; emailConfirmationRequired: boolean }>("/api/auth/signup", { method: "POST", body: JSON.stringify(body), auth: false }),
  login: (email: string, password: string) =>
    apiRequest<{ user: { id: string; email: string }; session: Session }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }), auth: false }),
  refresh: (refreshToken: string) =>
    apiRequest<{ session: Session }>("/api/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }), auth: false }),
  logout: () => apiRequest<{ message: string }>("/api/auth/logout", { method: "POST", body: "{}" }),
  resendVerification: (email: string) => apiRequest<unknown>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }), auth: false }),
  forgotPassword: (email: string) => apiRequest<unknown>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }), auth: false }),
  resetPassword: (password: string, recoveryToken?: string) => apiRequest<unknown>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ password }), auth: !recoveryToken, headers: recoveryToken ? { Authorization: `Bearer ${recoveryToken}` } : undefined }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<unknown>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  me: () => apiRequest<any>("/api/auth/me"),
};

export type DirectoryBusiness = { id: string; name: string; slug: string; logo_url?: string; city?: string; description?: string };
export type DirectoryMember = { id: string; member_type: string; full_name: string; username?: string; email?: string; phone?: string; avatar_url?: string; bio?: string; city?: string; country?: string; social_links?: Record<string, string>; created_at: string; businesses: DirectoryBusiness[] };
export const directoryApi = {
  founders: (page = 1, limit = 18) => apiRequest<{ data: DirectoryMember[]; meta: ApiMeta }>(`/api/directory/founders?page=${page}&limit=${limit}`, { auth: false }),
  investors: (page = 1, limit = 18) => apiRequest<{ data: DirectoryMember[]; meta: ApiMeta }>(`/api/directory/investors?page=${page}&limit=${limit}`, { auth: false }),
  // apiRequest unwraps the common { data: ... } envelope already.
  member: (id: string) => apiRequest<DirectoryMember>(`/api/directory/members/${encodeURIComponent(id)}`, { auth: false }),
};

export const homeApi = {
  get: () => apiRequest<any>("/api/home", { auth: false }),
  categories: () => apiRequest<any[]>("/api/home/categories", { auth: false }),
  search: (q: string) => apiRequest<any>(`/api/home/search?q=${encodeURIComponent(q)}`, { auth: false }),
};

export const profileApi = {
  get: () => apiRequest<any>("/api/profile"),
  update: (body: Record<string, unknown>) => apiRequest<any>("/api/profile", { method: "PATCH", body: JSON.stringify(body) }),
  uploadAvatar: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<any>("/api/profile/avatar", { method: "POST", body });
  },
  remove: () => apiRequest<unknown>("/api/profile", { method: "DELETE" }),
  public: (username: string) => apiRequest<any>(`/api/profile/public/${encodeURIComponent(username)}`, { auth: false }),
  favorites: (page = 1, limit = 12) => apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/profile/favorites?page=${page}&limit=${limit}`),
  notifications: (page = 1, limit = 12, unread = false) =>
    apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/profile/notifications?page=${page}&limit=${limit}${unread ? "&unread=true" : ""}`),
  markNotificationsRead: (ids?: string[]) => apiRequest<unknown>("/api/profile/notifications/read", { method: "PATCH", body: JSON.stringify(ids ? { ids } : {}) }),
};

export const businessApi = {
  list: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
    return apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/businesses${query.size ? `?${query}` : ""}`, { auth: false });
  },
  mine: () => apiRequest<any[]>("/api/businesses/mine"),
  create: (body: Record<string, unknown>) => apiRequest<any>("/api/businesses", { method: "POST", body: JSON.stringify(body) }),
  get: (idOrSlug: string) => apiRequest<any>(`/api/businesses/${encodeURIComponent(idOrSlug)}`, { auth: false }),
  getMine: (id: string) => apiRequest<any>(`/api/businesses/${encodeURIComponent(id)}`),
  trackView: (id: string) => apiRequest<unknown>(`/api/businesses/${encodeURIComponent(id)}/view`, { method: "POST", auth: false }),
  update: (id: string, body: Record<string, unknown>) => apiRequest<any>(`/api/businesses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => apiRequest<unknown>(`/api/businesses/${id}`, { method: "DELETE" }),
  publish: (id: string) => apiRequest<any>(`/api/businesses/${id}/publish`, { method: "POST", body: "{}" }),
  unpublish: (id: string) => apiRequest<any>(`/api/businesses/${id}/unpublish`, { method: "POST", body: "{}" }),
  uploadLogo: (id: string, file: File) => {
    const body = new FormData(); body.append("file", file);
    return apiRequest<any>(`/api/businesses/${id}/logo`, { method: "POST", body });
  },
  uploadCover: (id: string, file: File) => {
    const body = new FormData(); body.append("file", file);
    return apiRequest<any>(`/api/businesses/${id}/cover`, { method: "POST", body });
  },
  services: {
    list: (id: string) => apiRequest<any[]>(`/api/businesses/${id}/services`, { auth: false }),
    create: (id: string, body: Record<string, unknown>) => apiRequest<any>(`/api/businesses/${id}/services`, { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, serviceId: string, body: Record<string, unknown>) => apiRequest<any>(`/api/businesses/${id}/services/${serviceId}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string, serviceId: string) => apiRequest<unknown>(`/api/businesses/${id}/services/${serviceId}`, { method: "DELETE" }),
  },
  reviews: {
    list: (id: string, page = 1, limit = 12) => apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/businesses/${id}/reviews?page=${page}&limit=${limit}`, { auth: false }),
    submit: (id: string, rating: number, comment?: string) => apiRequest<any>(`/api/businesses/${id}/reviews`, { method: "POST", body: JSON.stringify({ rating, comment }) }),
    removeMine: (id: string) => apiRequest<unknown>(`/api/businesses/${id}/reviews/mine`, { method: "DELETE" }),
  },
  addFavorite: (id: string) => apiRequest<{ isFavorite: boolean }>(`/api/businesses/${id}/favorite`, { method: "POST", body: "{}" }),
  removeFavorite: (id: string) => apiRequest<{ isFavorite: boolean }>(`/api/businesses/${id}/favorite`, { method: "DELETE" }),
};

export const paymentApi = {
  plans: () => apiRequest<any[]>("/api/payments/plans", { auth: false }),
  listingFeeCheckout: (businessId: string) => apiRequest<any>("/api/payments/listing-fee/checkout", { method: "POST", body: JSON.stringify({ businessId }) }),
  checkout: (planCode: string, businessId: string) =>
    apiRequest<any>("/api/payments/checkout", { method: "POST", body: JSON.stringify({ planCode, businessId }) }),
  verify: (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) =>
    apiRequest<{ status: string; message: string }>("/api/payments/verify", { method: "POST", body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) }),
  history: (page = 1, limit = 12) => apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/payments/history?page=${page}&limit=${limit}`),
  subscription: (businessId: string) => apiRequest<any>(`/api/payments/subscription/${encodeURIComponent(businessId)}`),
};

export const adminApi = {
  stats: () => apiRequest<any>("/api/admin/stats"),
  users: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
    return apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/admin/users${query.size ? `?${query}` : ""}`);
  },
  setUserRole: (id: string, role: "user" | "business_owner" | "admin") => apiRequest<any>(`/api/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  approveUser: (id: string, status: "approved" | "rejected", note?: string) => apiRequest<any>(`/api/admin/users/${id}/approval`, { method: "PATCH", body: JSON.stringify({ status, note }) }),
  businesses: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
    return apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/admin/businesses${query.size ? `?${query}` : ""}`);
  },
  updateBusiness: (id: string, body: Record<string, unknown>) => apiRequest<any>(`/api/admin/businesses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeReview: (id: string) => apiRequest<unknown>(`/api/admin/reviews/${id}`, { method: "DELETE" }),
  payments: (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
    return apiRequest<{ data: any[]; meta: ApiMeta }>(`/api/admin/payments${query.size ? `?${query}` : ""}`);
  },
};

export const healthApi = {
  get: () => apiRequest<{ status: string; time: string }>("/health", { auth: false }),
};
