import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const register = async ({ username, email, password }) =>
  (await api.post("/api/auth/register", { username, email, password })).data;
export const verifyEmail = async ({ email, otp }) =>
  (await api.post("/api/auth/verify-email", { email, otp })).data;
export const resendVerificationOtp = async ({ email }) =>
  (await api.post("/api/auth/resend-otp", { email })).data;
export const login = async ({ email, password }) =>
  (await api.post("/api/auth/login", { email, password })).data;
export const logout = async () => (await api.post("/api/auth/logout")).data;
export const refreshSession = async () => (await api.post("/api/auth/refresh")).data;
export const getMe = async () => (await api.get("/api/auth/get-me")).data;
export default api;
