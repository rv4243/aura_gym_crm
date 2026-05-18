import api from './axios.js';
export const getPlans   = ()        => api.get('/plans/all');
export const createPlan = (data)    => api.post('/plans', data);
export const updatePlan = (id, data)=> api.put(`/plans/${id}`, data);
export const deletePlan = (id)      => api.delete(`/plans/${id}`);
