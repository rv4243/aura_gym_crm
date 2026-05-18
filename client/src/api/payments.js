import api from './axios.js';
export const getPayments   = (params) => api.get('/payments', { params });
export const createPayment = (data)   => api.post('/payments', data);
export const updatePayment = (id, data) => api.put(`/payments/${id}`, data);
