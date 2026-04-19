const LENSES_STORAGE_KEY = "snap_lenses";
const PRODUCT_LENS_STORAGE_KEY = "snap_product_lenses";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `lens-${Date.now()}`;
};

export const getAllLenses = () => {
  if (!canUseStorage()) return [];

  try {
    return JSON.parse(window.localStorage.getItem(LENSES_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const getActiveLens = () => {
  const lenses = getAllLenses();
  const active = lenses.find((lens) => lens.status === "active" || lens.status === "Active");
  return active?.lensId || null;
};

export const getProductLens = (productId) => {
  if (!canUseStorage()) return getActiveLens();

  try {
    const mapping = JSON.parse(window.localStorage.getItem(PRODUCT_LENS_STORAGE_KEY) || "{}");
    if (productId && mapping[productId]) return mapping[productId];
    return getActiveLens();
  } catch {
    return getActiveLens();
  }
};

export const assignLensToProduct = (productId, lensId) => {
  if (!canUseStorage()) return;

  try {
    const mapping = JSON.parse(window.localStorage.getItem(PRODUCT_LENS_STORAGE_KEY) || "{}");
    if (productId && lensId) {
      mapping[productId] = lensId;
    }
    window.localStorage.setItem(PRODUCT_LENS_STORAGE_KEY, JSON.stringify(mapping));
  } catch {}
};

export const getProductLensMappings = () => {
  if (!canUseStorage()) return {};

  try {
    return JSON.parse(window.localStorage.getItem(PRODUCT_LENS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const getLensAssignedProductIds = (lensId) => {
  const mapping = getProductLensMappings();
  return Object.entries(mapping)
    .filter(([, assignedLensId]) => assignedLensId === lensId)
    .map(([productId]) => productId);
};

export const removeProductLensAssignments = (lensId) => {
  if (!canUseStorage()) return {};

  const mapping = getProductLensMappings();
  const nextMapping = Object.fromEntries(
    Object.entries(mapping).filter(([, assignedLensId]) => assignedLensId !== lensId)
  );

  window.localStorage.setItem(PRODUCT_LENS_STORAGE_KEY, JSON.stringify(nextMapping));
  return nextMapping;
};

export const saveLens = (lens) => {
  if (!canUseStorage()) return [];

  const lenses = getAllLenses();
  const existing = lenses.find((entry) => entry.id === lens.id);
  const nextLens = {
    id: existing?.id || lens.id || generateId(),
    name: lens.name.trim(),
    lensId: lens.lensId.trim(),
    status: lens.status === "active" || lens.status === "Active" ? "active" : "inactive",
    createdAt: existing?.createdAt || lens.createdAt || new Date().toISOString()
  };

  const nextLenses = existing
    ? lenses.map((entry) => (entry.id === nextLens.id ? nextLens : entry))
    : [nextLens, ...lenses];

  window.localStorage.setItem(LENSES_STORAGE_KEY, JSON.stringify(nextLenses));
  return nextLenses;
};

export const deleteLens = (id) => {
  if (!canUseStorage()) return [];

  const nextLenses = getAllLenses().filter((entry) => entry.id !== id);
  window.localStorage.setItem(LENSES_STORAGE_KEY, JSON.stringify(nextLenses));
  return nextLenses;
};
