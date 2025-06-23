import axios from "axios";

const baseURL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Gagal mengambil token dari cookies:", error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
