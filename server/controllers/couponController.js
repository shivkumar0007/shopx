import Coupon from "../models/Coupon.js";

const serializeCoupon = (coupon) => ({
  _id: coupon._id,
  code: coupon.code,
  discountPercentage: coupon.discountPercentage,
  expiryDate: coupon.expiryDate,
  isActive: coupon.isActive,
  createdAt: coupon.createdAt
});

const findValidCoupon = async (code) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return null;

  return Coupon.findOne({
    code: normalizedCode,
    isActive: true,
    expiryDate: { $gt: new Date() }
  });
};

export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.json(coupons.map(serializeCoupon));
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    const discountPercentage = Number(req.body.discountPercentage || 0);
    const expiryDate = new Date(req.body.expiryDate);

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required." });
    }

    if (!discountPercentage || discountPercentage < 1 || discountPercentage > 90) {
      return res.status(400).json({ message: "Discount must be between 1 and 90 percent." });
    }

    if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return res.status(400).json({ message: "Expiry date must be in the future." });
    }

    const coupon = await Coupon.create({
      code,
      discountPercentage,
      expiryDate,
      isActive: true
    });

    return res.status(201).json(serializeCoupon(coupon));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Coupon code already exists." });
    }
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    await coupon.deleteOne();
    return res.json({ message: "Coupon deleted." });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const coupon = await findValidCoupon(req.body.code);
    if (!coupon) {
      return res.status(404).json({ message: "Promo code is invalid or expired." });
    }

    const subtotal = Math.max(0, Number(req.body.subtotal || 0));
    const discountAmount = Number(((subtotal * coupon.discountPercentage) / 100).toFixed(2));
    const totalAmount = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

    return res.json({
      coupon: serializeCoupon(coupon),
      discountAmount,
      totalAmount
    });
  } catch (error) {
    next(error);
  }
};
