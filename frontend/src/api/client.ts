
import Constants from "expo-constants";
const configuredBackend =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  Constants.expoConfig?.extra?.backendUrl;

const apiRoot = `${String(configuredBackend ?? "").replace(/\/$/, "")}/api`;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
) {
  if (!configuredBackend) {
    throw new ApiError("Backend URL is not configured", 0);
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    detail?: string;
  };

  if (!response.ok) {
    throw new ApiError(
      payload.detail ?? "Something went wrong",
      response.status,
    );
  }

  return payload as T;
}