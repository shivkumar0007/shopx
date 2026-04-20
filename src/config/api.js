const DEFAULT_API_BASE_URL = "https://shopx-mmye.onrender.com/api";

const normalizeApiBaseUrl = (value) => {
  const baseUrl = (value || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
