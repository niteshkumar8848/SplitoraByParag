import axios from 'axios'
<<<<<<< HEAD
import { API_BASE_URL as BASE_URL } from '../config/api'
=======

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api'

>>>>>>> 29ca58f (SignIn with google added)
const api = axios.create({ baseURL: BASE_URL, timeout: 60000, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('splitora_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}, (error) => Promise.reject(error))
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('splitora_refresh_token')
        if (!refreshToken) { window.location.href = '/login'; return Promise.reject(error) }
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const newToken = res.data.data?.accessToken || res.data.accessToken
        localStorage.setItem('splitora_token', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('splitora_token')
        localStorage.removeItem('splitora_refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
export default api
