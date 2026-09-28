import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30-second timeout to accommodate background Playwright scrapes
  withCredentials: true, // send/receive the auth_token httpOnly cookie
});

// On 401, broadcast an auth-expired event so the app can return to the login screen.
// Skips reload for auth endpoints themselves so login errors render properly.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = String(error.config?.url ?? "");
      if (!url.includes("/auth/")) {
        window.dispatchEvent(new Event("auth:expired"));
      }
    }
    return Promise.reject(error);
  }
);
