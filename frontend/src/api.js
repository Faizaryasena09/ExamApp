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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Cek apakah token masih ada. Jika tidak, berarti proses logout sudah berjalan.
    const tokenExists = document.cookie.split('; ').some(item => item.trim().startsWith('token='));

    if (
      error.response &&
      error.response.status === 401 &&
      tokenExists // Hanya jalankan jika token masih ada
    ) {
      // Hapus semua cookie
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
          let cookie = cookies[i];
          let eqPos = cookie.indexOf("=");
          let name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
      
      alert("Sesi Anda telah berakhir. Silakan login kembali.");
      window.location.href = "/"; // Arahkan ke halaman utama
    }

    return Promise.reject(error);
  }
);

export default api;