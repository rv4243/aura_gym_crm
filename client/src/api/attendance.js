import api from './axios.js';
export const getAttendance    = (params) => api.get('/attendance', { params });
export const markAttendance   = (data)   => api.post('/attendance', data);
export const bulkAttendance   = (data)   => api.post('/attendance/bulk', data);
export const deleteAttendance = (id)     => api.delete(`/attendance/${id}`);
