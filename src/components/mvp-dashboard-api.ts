export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await res.json()) as {
    success: boolean;
    data?: T;
    error?: { message: string };
  };

  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message || "Error de API");
  }

  return payload.data;
}
