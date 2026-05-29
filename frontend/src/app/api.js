const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost/Ogefrem/api'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    const message = data.message || 'Erreur API'
    throw new Error(message)
  }
  return data
}

export { API_BASE }
