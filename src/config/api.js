const DEFAULT_API_URL = "https://shopx-mmye.onrender.com";

const normalizeApiBaseUrl = (value) => {
  const baseUrl = (value || DEFAULT_API_URL).trim().replace(/\/+$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
