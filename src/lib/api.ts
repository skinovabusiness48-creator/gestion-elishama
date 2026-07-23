// Helpers côté client pour appeler l'API
export async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) {
    let msg = `Erreur ${res.status}`
    try {
      const data = await res.json()
      msg = data.error || data.message || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function photoUrl(path?: string | null): string {
  if (!path) return ""
  if (path.startsWith("http") || path.startsWith("/")) return path
  return `/uploads/${path}`
}
