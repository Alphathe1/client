const BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "lempire_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* storage unavailable */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: string,
  ) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data: T;
  token?: string;
  error?: string;
  field?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiEnvelope<T>> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : null,
    });
  } catch {
    throw new ApiError("Impossible de joindre le serveur. Vérifiez votre connexion.", 0);
  }

  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok) {
    throw new ApiError(json.error ?? json.message ?? "Une erreur est survenue", res.status, json.field);
  }
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path).then((r) => r.data),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
}
