import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message: string | null = null;
    let data: unknown | null = null;

    try {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json = (await res.json()) as any;
        data = json;
        if (typeof json?.message === "string" && json.message.trim() !== "") {
          message = json.message;
        } else {
          message = JSON.stringify(json);
        }
      } else {
        const text = await res.text();
        const trimmed = String(text ?? "").trim();
        if (trimmed) {
          try {
            const maybeJson = JSON.parse(trimmed);
            data = maybeJson;
            if (typeof maybeJson?.message === "string" && maybeJson.message.trim() !== "") {
              message = maybeJson.message;
            } else {
              message = trimmed;
            }
          } catch {
            message = trimmed;
          }
        }
      }
    } catch {
      // ignore
    }

    const err: any = new Error(message || res.statusText || "Request failed");
    err.status = res.status;
    if (data != null) err.data = data;
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    cache: "no-store",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function apiRequestFormData(
  method: string,
  url: string,
  formData: FormData,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    body: formData,
    credentials: "include",
    cache: "no-store",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
