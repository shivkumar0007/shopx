export const isFlashSaleActive = (product, now = Date.now()) => {
  const saleEndTime = product?.saleEndTime ? new Date(product.saleEndTime).getTime() : 0;
  return Boolean(product?.isFlashSale) && Number(product?.discountPercentage) > 0 && saleEndTime > now;
};

export const getDiscountedPrice = (product, now = Date.now()) => {
  const basePrice = Number(product?.price || 0);
  if (!isFlashSaleActive(product, now)) return basePrice;

  const discountedPrice = basePrice * (1 - Number(product.discountPercentage || 0) / 100);
  return Number(discountedPrice.toFixed(2));
};

export const getFlashSaleTimeLeft = (product, now = Date.now()) => {
  const saleEndTime = product?.saleEndTime ? new Date(product.saleEndTime).getTime() : 0;
  return Math.max(0, saleEndTime - now);
};

export const formatCountdown = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};
