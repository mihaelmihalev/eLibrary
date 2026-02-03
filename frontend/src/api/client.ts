import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE,
});

const token = localStorage.getItem("accessToken");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("accessToken");
      delete api.defaults.headers.common["Authorization"];
    }
    return Promise.reject(error);
  }
);
