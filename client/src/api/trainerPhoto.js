import api from './axios.js';

export const uploadTrainerPhoto = (id, file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.post(`/trainers/${id}/photo`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteTrainerPhoto = (id) => api.delete(`/trainers/${id}/photo`);
