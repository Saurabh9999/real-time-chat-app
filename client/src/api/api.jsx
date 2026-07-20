import axios from "axios";

const api = axios.create({
  // baseURL: "http://localhost:3000/api",
  baseURL: "https://real-time-chat-app-vcad.onrender.com/",
});

api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
  console.log("config-data:", config);
  return config;
});

api.interceptors.response.use((response) => {
  console.log("response-data:", response);
  return response;
});

export default api;
