import axios from "axios";

const ACCESS_TOKEN_KEY = "splitora_token";
const REFRESH_TOKEN_KEY = "splitora_refresh_token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let isRefreshing = false;
let pendingRequests = [];

const resolvePendingRequests = (newToken) => {
  pendingRequests.forEach((callback) => callback(newToken));
  pendingRequests = [];
};

const clearAuthAndRedirect = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.location.href = "/login";
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/auth/refresh")) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error("Missing refresh token");
      }

      const refreshResponse = await api.post("/auth/refresh", {
        refreshToken,
      });

      const newAccessToken = refreshResponse?.data?.data?.accessToken;
      if (!newAccessToken) {
        throw new Error("Invalid refresh response");
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      resolvePendingRequests(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      pendingRequests = [];
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
