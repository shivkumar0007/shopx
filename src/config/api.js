const LOCAL_API_URL = "http://localhost:5000";
const PRODUCTION_API_URL = "https://shopx-mmye.onrender.com";

const normalizeApiBaseUrl = (value) => {
  const baseUrl = value.trim().replace(/\/+$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
};

const resolveApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return normalizeApiBaseUrl(import.meta.env.VITE_DEV_API_URL || LOCAL_API_URL);
  }

  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL || PRODUCTION_API_URL);
};

export const API_BASE_URL = resolveApiBaseUrl();
