const API_URL = "https://yh-message-app-fullstack.onrender.com"

const authHeader = (token) =>
  token ? { Authorization: `Bearer ${token}` } : {}

export const getMessages = async () => {
  const res = await fetch(`${API_URL}/messages`)
  return res.json()
}

export const postMessage = async (text, token) => {
  const res = await fetch(`${API_URL}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ message: text }),
  })
  if (res.status === 401) return { unauthorized: true }
  return res.json()
}

export const editMessage = async (id, text, token) => {
  const res = await fetch(`${API_URL}/messages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ editedMessage: text }),
  })
  if (res.status === 401) return { unauthorized: true }
  return res.json()
}

export const deleteMessage = async (id, token) => {
  const res = await fetch(`${API_URL}/messages/${id}`, {
    method: "DELETE",
    headers: authHeader(token),
  })
  if (res.status === 401) return { unauthorized: true }
}

export const login = async (loginVal, password) => {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginVal, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || "Something went wrong")
  return data
}

export const register = async (username, email, password) => {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || "Something went wrong")
  return data
}
