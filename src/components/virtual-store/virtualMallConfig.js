import { getDiscountedPrice, isFlashSaleActive } from "../../utils/pricing.js";

export const VIEWPORT = {
  width: 1440,
  height: 980,
  tileWidth: 106,
  tileHeight: 54,
  originX: 724,
  originY: 118
};

export const WORLD_BOUNDS = {
  minX: 0.7,
  maxX: 17.4,
  minY: 0.8,
  maxY: 13.6
};

export const PLAYER_START = {
  x: 7.6,
  y: 7.2
};

export const PLAYER_RADIUS = 0.42;
export const PLAYER_SPEED = 4.2;
export const PRODUCT_INTERACTION_DISTANCE = 2.3;

export const SECTION_ZONES = {
  electronicsNorth: {
    id: "electronics-north",
    label: "Electronics",
    color: "#62d6ff",
    x: 1.4,
    y: 1.2,
    w: 7.6,
    h: 5.5
  },
  fashion: {
    id: "fashion",
    label: "Fashion",
    color: "#ff5bcf",
    x: 11.5,
    y: 1.8,
    w: 5.1,
    h: 4.8
  },
  electronicsSouth: {
    id: "electronics-south",
    label: "Electronics",
    color: "#62d6ff",
    x: 10.3,
    y: 8.2,
    w: 6.8,
    h: 4.3
  }
};

export const BILLING_COUNTER = {
  id: "billing-counter",
  label: "Billing Counter",
  x: 8.1,
  y: 10.6,
  w: 2.3,
  h: 1.1
};

export const BILLING_ZONE = {
  id: "billing-zone",
  x: 6.9,
  y: 10.05,
  w: 3.8,
  h: 2.35
};

export const FLASH_SALE_ZONE = {
  id: "flash-sale",
  label: "FLASH SALE",
  x: 9.15,
  y: 6.1,
  radius: 1.55
};

export const EXIT_GATE_ZONE = {
  id: "exit-gate",
  label: "Exit Portal",
  x: 1.2,
  y: 9.55,
  w: 2.1,
  h: 2.75
};

export const STORE_HINTS = [
  "WASD or arrow keys se walk karein",
  "Floor par click karke point-to-move use karein",
  "Nearby glowing display par click karke product popup kholein",
  "Billing Counter zone mein enter karke checkout trigger karein"
];

const ELECTRONICS_KEYWORDS = [
  "electronics",
  "audio",
  "phone",
  "mobile",
  "laptop",
  "camera",
  "tech",
  "gadget",
  "smart",
  "headphone"
];

const FASHION_KEYWORDS = [
  "fashion",
  "beauty",
  "wear",
  "accessories",
  "footwear",
  "apparel",
  "clothing",
  "shoe",
  "lipstick",
  "bag",
  "jewelry"
];

const DISPLAY_SLOTS = [
  { id: "elec-1", type: "electronics", x: 3.25, y: 2.2, w: 1.55, h: 0.82, height: 116 },
  { id: "elec-2", type: "electronics", x: 5.8, y: 2.5, w: 1.95, h: 0.82, height: 116 },
  { id: "elec-3", type: "electronics", x: 3.65, y: 4.55, w: 1.55, h: 0.82, height: 116 },
  { id: "elec-4", type: "electronics", x: 6.4, y: 4.2, w: 1.95, h: 0.82, height: 116 },
  { id: "fashion-1", type: "fashion", x: 13.2, y: 2.55, w: 1.35, h: 1.1, height: 126 },
  { id: "fashion-2", type: "fashion", x: 15.15, y: 3.2, w: 1.35, h: 1.1, height: 126 },
  { id: "fashion-3", type: "fashion", x: 13.75, y: 4.95, w: 1.35, h: 1.1, height: 126 },
  { id: "fashion-4", type: "fashion", x: 15.6, y: 5.55, w: 1.35, h: 1.1, height: 126 },
  { id: "elec-5", type: "electronics", x: 11.75, y: 8.65, w: 1.95, h: 0.82, height: 116 },
  { id: "elec-6", type: "electronics", x: 14.4, y: 8.8, w: 1.95, h: 0.82, height: 116 },
  { id: "elec-7", type: "electronics", x: 13.35, y: 10.85, w: 1.95, h: 0.82, height: 116 }
];

const STATIC_OBSTACLES = [
  { id: "north-wall", x: 0.4, y: 0.35, w: 17.7, h: 0.35 },
  { id: "west-wall", x: 0.35, y: 0.4, w: 0.35, h: 13.35 },
  { id: "east-wall", x: 17.65, y: 0.4, w: 0.35, h: 13.35 },
  { id: "south-wall", x: 0.45, y: 13.85, w: 17.55, h: 0.35 },
  { id: "billing-counter", x: BILLING_COUNTER.x - BILLING_COUNTER.w / 2, y: BILLING_COUNTER.y - BILLING_COUNTER.h / 2, w: BILLING_COUNTER.w, h: BILLING_COUNTER.h },
  { id: "portal-column-left", x: 0.92, y: 9.3, w: 0.34, h: 2.2 },
  { id: "portal-column-right", x: 2.42, y: 9.3, w: 0.34, h: 2.2 }
];

export const projectIsometric = ({ x, y, z = 0 }) => ({
  left: VIEWPORT.originX + (x - y) * (VIEWPORT.tileWidth / 2),
  top: VIEWPORT.originY + (x + y) * (VIEWPORT.tileHeight / 2) - z
});

export const unprojectIsometric = ({ left, top }) => {
  const relativeX = (left - VIEWPORT.originX) / (VIEWPORT.tileWidth / 2);
  const relativeY = (top - VIEWPORT.originY) / (VIEWPORT.tileHeight / 2);

  return {
    x: (relativeX + relativeY) / 2,
    y: (relativeY - relativeX) / 2
  };
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const distanceBetween = (pointA, pointB) =>
  Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);

export const isPointInsideRect = (point, rect) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.w &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.h;

export const isPointInsideCircle = (point, circle) =>
  distanceBetween(point, { x: circle.x, y: circle.y }) <= circle.radius;

export const circleIntersectsRect = (point, radius, rect) => {
  const closestX = clamp(point.x, rect.x, rect.x + rect.w);
  const closestY = clamp(point.y, rect.y, rect.y + rect.h);
  return Math.hypot(point.x - closestX, point.y - closestY) < radius;
};

export const polygonFromRect = (rect) => {
  const corners = [
    projectIsometric({ x: rect.x, y: rect.y }),
    projectIsometric({ x: rect.x + rect.w, y: rect.y }),
    projectIsometric({ x: rect.x + rect.w, y: rect.y + rect.h }),
    projectIsometric({ x: rect.x, y: rect.y + rect.h })
  ];

  return corners.map((point) => `${point.left},${point.top}`).join(" ");
};

const buildShelfObstacle = (slot) => ({
  id: `${slot.id}-obstacle`,
  x: slot.x - slot.w / 2,
  y: slot.y - slot.h / 2,
  w: slot.w,
  h: slot.h
});

const matchesKeywords = (product, keywords) => {
  const haystack = `${product.category} ${product.name} ${product.description} ${(product.tags || []).join(" ")}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
};

const sortProductsByScenePriority = (products) =>
  [...products].sort((productA, productB) => {
    const scoreA = Number(productA.stockCount || 0) + (isFlashSaleActive(productA) ? 25 : 0);
    const scoreB = Number(productB.stockCount || 0) + (isFlashSaleActive(productB) ? 25 : 0);
    return scoreB - scoreA;
  });

export const splitMallCatalog = (products = []) => {
  const inStockProducts = sortProductsByScenePriority(
    products.filter((product) => Number(product?.stockCount || 0) > 0)
  );
  const electronics = inStockProducts.filter((product) => matchesKeywords(product, ELECTRONICS_KEYWORDS));
  const fashion = inStockProducts.filter((product) => matchesKeywords(product, FASHION_KEYWORDS));
  const usedIds = new Set([...electronics, ...fashion].map((product) => String(product._id)));
  const overflow = inStockProducts.filter((product) => !usedIds.has(String(product._id)));

  return {
    electronics,
    fashion,
    overflow,
    flashSale: inStockProducts.filter((product) => isFlashSaleActive(product))
  };
};

export const buildMallDisplays = (products = []) => {
  const catalog = splitMallCatalog(products);
  const electronicsQueue = [...catalog.electronics, ...catalog.overflow, ...catalog.fashion];
  const fashionQueue = [...catalog.fashion, ...catalog.overflow, ...catalog.electronics];
  const fallbackQueue = [...catalog.overflow, ...catalog.electronics, ...catalog.fashion];

  const seenProductIds = new Set();

  return DISPLAY_SLOTS.map((slot) => {
    const queue =
      slot.type === "fashion"
        ? fashionQueue
        : slot.id === "elec-5" || slot.id === "elec-6" || slot.id === "elec-7"
          ? fallbackQueue
          : electronicsQueue;

    const product = queue.find((candidate) => {
      const id = String(candidate._id);
      if (seenProductIds.has(id)) return false;
      seenProductIds.add(id);
      return true;
    }) || null;

    return {
      ...slot,
      product,
      glow: slot.type === "fashion" ? "#ff5bcf" : "#62d6ff"
    };
  });
};

export const buildMallObstacles = (products = []) => [
  ...STATIC_OBSTACLES,
  ...buildMallDisplays(products).map(buildShelfObstacle)
];

export const buildMallObstaclesFromDisplays = (displays = []) => [
  ...STATIC_OBSTACLES,
  ...displays.map(buildShelfObstacle)
];

export const buildMinimapSections = () => [
  { label: "Electronics", color: "#62d6ff", x: 10, y: 12, w: 42, h: 26 },
  { label: "Fashion", color: "#ff5bcf", x: 58, y: 12, w: 28, h: 24 },
  { label: "Billing", color: "#60a5fa", x: 40, y: 46, w: 16, h: 10 },
  { label: "Flash", color: "#fb923c", x: 46, y: 30, w: 10, h: 10, r: 5 },
  { label: "Exit", color: "#a855f7", x: 6, y: 46, w: 12, h: 16 }
];

export const getPlayerMinimapPosition = (player) => ({
  x: ((player.x - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * 92 + 4,
  y: ((player.y - WORLD_BOUNDS.minY) / (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY)) * 64 + 4
});

export const getDisplayMeta = (display) => {
  const product = display.product;

  return {
    ...display,
    title: product?.name || (display.type === "fashion" ? "Neo Wear Drop" : "Featured Tech"),
    description:
      product?.description ||
      (display.type === "fashion"
        ? "Walk closer and inspect this curated fashion showcase."
        : "Walk closer and inspect this curated electronics showcase."),
    price: product ? getDiscountedPrice(product) : null
  };
};
