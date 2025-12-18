import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000', // Backend URL
});

// Add a request interceptor to attach the Token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getRecommendations = async (text, topN = 10) => {
  const response = await API.post('/recommendations/', { text, top_n: topN });
  return response.data;
};

// --- AUTH ---
export const login = async (email, password) => {
  const response = await API.post('/auth/login', { email, password });
  return response.data;
};

export const signup = async (email, full_name, password) => {
  const response = await API.post('/users/', { email, full_name, password });
  return response.data;
};

export const getMe = async () => {
  const response = await API.get('/users/me');
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await API.put('/users/me', data);
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await API.put('/users/me/password', {
    current_password: currentPassword,
    new_password: newPassword
  });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await API.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, code, new_password) => {
  const response = await API.post('/auth/reset-password', { email, code, new_password });
  return response.data;
};

// --- PLAYLISTS ---
export const createPlaylist = async (name, songs) => {
  const response = await API.post('/playlists/', { name, songs });
  return response.data;
};

export const getUserPlaylists = async () => {
  const response = await API.get('/playlists/');
  return response.data;
};

export const deletePlaylist = async (id) => {
  const response = await API.delete(`/playlists/${id}`);
  return response.data;
};

export const renamePlaylist = async (id, name) => {
  const response = await API.patch(`/playlists/${id}/rename`, { name });
  return response.data;
};

export const combinePlaylists = async (name, playlistIds, deleteOriginals = false) => {
  const response = await API.post('/playlists/combine', { name, playlist_ids: playlistIds, delete_originals: deleteOriginals });
  return response.data;
};

// --- SPOTIFY ---
export const getSpotifyAuthUrl = async () => {
  const response = await API.get('/spotify/auth/url');
  return response.data;
};

export const exportToSpotify = async (playlistId) => {
  const response = await API.post('/spotify/export', { playlist_id: playlistId });
  return response.data;
};


export const removeSongFromPlaylist = async (playlistId, songIndex) => {
  const response = await API.delete(`/playlists/${playlistId}/songs/${songIndex}`);
  return response.data;
};

export default API;
