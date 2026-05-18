import api from './axios.js';

// Upload a photo — sends multipart/form-data
export const uploadMemberPhoto = (id, file) => {
  const form = new FormData();
  form.append('photo', file);
  return api.post(`/members/${id}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteMemberPhoto = (id) => api.delete(`/members/${id}/photo`);
