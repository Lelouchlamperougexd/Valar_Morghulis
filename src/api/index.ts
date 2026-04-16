import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Автоматически добавляет токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Логирование ошибок в dev режиме
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error(
        '[API Error]',
        error?.config?.method?.toUpperCase(),
        error?.config?.url,
        '→',
        error?.response?.status,
        error?.response?.data
      );
    }
    return Promise.reject(error);
  }
);

export default api;