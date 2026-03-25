import api from './axios'
export const loginUser = async (data) => (await api.post('/auth/login', data)).data
export const googleLoginUser = async (data) => (await api.post('/auth/google', data)).data
export const registerUser = async (data) => (await api.post('/auth/register', data)).data
export const logoutUser = async (token) => (await api.post('/auth/logout', { refreshToken: token })).data
export const getMe = async () => (await api.get('/auth/me')).data
export const refreshAccessToken = async (token) => (await api.post('/auth/refresh', { refreshToken: token })).data
export const updateProfile = async (data) => (await api.put('/auth/profile', data)).data
export const changePassword = async (data) => (await api.put('/auth/password', data)).data
export const uploadAvatar = async (formData) => {
  const response = await api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}
