import axios from "axios";

const baseURL =
  window.location.hostname === "localhost"
    ? "http://localhost:8080/api"
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data?.message?.toLowerCase().includes("expired")
    ) {
      alert("Sesi kamu sudah habis. Silakan login ulang.");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
