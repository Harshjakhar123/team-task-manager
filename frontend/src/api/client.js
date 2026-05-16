import axios from 'axios'

// Same-origin /api works for both `npm run dev` (Vite proxy) and the
// single-service Railway deploy. Override with VITE_API_BASE_URL only when the
// frontend is hosted separately from the API.
const baseURL = (import.meta.env.VITE_API_BASE_URL || '') + '/api'

const api = axios.create({ baseURL })

const TOKEN_KEY = 'ttm_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Surface a clean message and auto-logout on expired sessions.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      setToken(null)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

// Pull a human-readable message out of a FastAPI error response.
export function errorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail[0]?.msg || fallback
  }
  return error?.message || fallback
}

export default api
