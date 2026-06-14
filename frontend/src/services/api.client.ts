import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30-second timeout to accommodate background Playwright scrapes
});

// Automatically inject Bearer authentication header if credentials exist
apiClient.interceptors.request.use((config) => {
  const adminPassword = localStorage.getItem("admin_password");
  if (adminPassword) {
    config.headers.Authorization = `Bearer ${adminPassword}`;
  }
  return config;
});

// Clear credentials and force reload if any request is rejected as unauthorized (401)
// Skip reload for the verification endpoint to allow login error state to render correctly
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthVerify = error.config?.url?.includes("/auth/verify");
      if (!isAuthVerify) {
        localStorage.removeItem("admin_password");
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

