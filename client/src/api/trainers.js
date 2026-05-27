import api from './axios.js';
export const getTrainers    = (params)     => api.get('/trainers', { params: { ...params, _t: Date.now() } });
export const createTrainer  = (data)       => api.post('/trainers', data);
export const updateTrainer  = (id, data)   => api.put(`/trainers/${id}`, data);
export const deleteTrainer  = (id)         => api.delete(`/trainers/${id}`);
