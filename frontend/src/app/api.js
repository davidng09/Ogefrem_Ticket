const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost/Ogefrem/api'

export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  })

  if (options.rawResponse) {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    const message = data.message || 'Erreur API'
    throw new Error(message)
  }
  return data
}

export function apiUrl(path) {
  return `${API_BASE}${path}`
}

export async function downloadFile(path, filename) {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export { API_BASE }
