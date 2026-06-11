import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      return response.data;
    }
    return response.data;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/employee/login', data),
  getProfile: () => api.get('/auth/profile'),
  requestOTP: (data) => api.post('/auth/otp/request', data),
  verifyOTP: (data) => api.post('/auth/otp/verify', data),
  resetPassword: (data) => api.post('/auth/password/reset', data),
  uploadProfileImage: async (formData) => {
    const token = await AsyncStorage.getItem('@auth_token');
    const response = await fetch(`${API_URL}/auth/upload-profile-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data;
  },
};

export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  getToday: () => api.get('/attendance/me/today'),
  getHistory: (params) => api.get('/attendance/history', { params }),
  getSummary: (params) => api.get('/attendance/summary', { params }),
};

export const customersAPI = {
  search: (phone) => api.get(`/customers?search=${phone}`),
  searchByMobile: (phone) => api.get(`/customers/search-mobile/${phone}`),
  findOrCreate: (data) => api.post('/customers/find-or-create', data),
  create: (data) => api.post('/customers', data),
  getById: (id) => api.get(`/customers/${id}`),
};

export const servicesAPI = {
  getAll: () => api.get('/services'),
  getByBranch: (branchId) => api.get(`/services?branch_id=${branchId}`),
};

export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  getDailyRevenue: (params) => api.get('/invoices/daily-revenue', { params }),
  getMonthlyRevenue: (params) => api.get('/invoices/monthly-revenue', { params }),
};

export const expensesAPI = {
  create: (data) => api.post('/expenses', data),
  getAll: (params) => api.get('/expenses', { params }),
  getSummary: (params) => api.get('/expenses/summary', { params }),
};

export const branchesAPI = {
  getAll: (params) => api.get('/branches', { params }),
  getById: (id) => api.get(`/branches/${id}`),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
};

export const reportsAPI = {
  getDailyCollection: (params) => api.get('/reports/daily-collection', { params }),
};

export default api;
