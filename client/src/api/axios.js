import axios from 'axios'

const BASE_URL = 'https://splitora-api.onrender.com/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('splitora_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('splitora_refresh_token')
        if (!refreshToken) {
          window.location.href = '/login'
          return Promise.reject(error)
        }
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const newToken = res.data.data?.accessToken || res.data.accessToken
        localStorage.setItem('splitora_token', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (err) {
        localStorage.removeItem('splitora_token')
        localStorage.removeItem('splitora_refresh_token')
        window.location.href = '/login'
        return Promise.reject(err)
      }
    }
    return Promise.reject(error)
  }
)

export default api
