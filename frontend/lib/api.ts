import { ApiErrorResponse, InstagramAccount, InstagramAuthUrlResponse } from "@/types";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  retryable?: boolean;
  status: number;

  constructor(message: string, code: string = "API_ERROR", status: number = 500, retryable?: boolean) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorData: ApiErrorResponse | null = null;
      try {
        errorData = await res.json();
      } catch {
        // failed to parse JSON error
      }

      if (errorData?.error) {
        throw new ApiError(
          errorData.error.message,
          errorData.error.code,
          res.status,
          errorData.error.retryable
        );
      }

      if ((errorData as any)?.detail) {
        const detail = (errorData as any).detail;
        const msg = typeof detail === "string" ? detail : JSON.stringify(detail);
        throw new ApiError(msg, "HTTP_ERROR", res.status);
      }

      throw new ApiError(`Request failed with status ${res.status}`, "HTTP_ERROR", res.status);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      (error as Error).message || "Network request failed",
      "NETWORK_ERROR",
      0,
      true
    );
  }
}

export const instagramApi = {
  getAuthUrl: (brandId: string, token?: string | null) =>
    apiRequest<InstagramAuthUrlResponse>(`/api/v1/integrations/instagram/auth-url?brand_id=${brandId}`, {}, token),

  mockConnect: (brandId: string, username: string = "@mybrand", facebookPageName?: string, token?: string | null) =>
    apiRequest<InstagramAccount>(
      "/api/v1/integrations/instagram/mock-connect",
      {
        method: "POST",
        body: JSON.stringify({ brand_id: brandId, username, facebook_page_name: facebookPageName }),
      },
      token
    ),

  getAccount: (brandId: string, token?: string | null) =>
    apiRequest<InstagramAccount>(`/api/v1/integrations/instagram/account/${brandId}`, {}, token),

  disconnectAccount: (brandId: string, token?: string | null) =>
    apiRequest<{ status: string; message: string }>(
      `/api/v1/integrations/instagram/account/${brandId}`,
      { method: "DELETE" },
      token
    ),
};

