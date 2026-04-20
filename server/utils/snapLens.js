const SNAP_LENS_PARAM_KEYS = ["uuid", "lensId", "lensid", "id"];

export const normalizeSnapLensId = (value = "") => {
  const rawValue = String(value).trim();
  if (!rawValue) return "";

  if (!rawValue.includes("://")) {
    return rawValue;
  }

  try {
    const parsedUrl = new URL(rawValue);

    for (const key of SNAP_LENS_PARAM_KEYS) {
      const matchedValue = parsedUrl.searchParams.get(key);
      if (matchedValue?.trim()) {
        return matchedValue.trim();
      }
    }

    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    return pathSegments[pathSegments.length - 1]?.trim() || rawValue;
  } catch {
    return rawValue;
  }
};
