import Product from "../models/Product.js";
import User from "../models/User.js";
import { normalizeSnapLensId } from "../utils/snapLens.js";

const buildProductPayload = (body) => {
  const snapLensId = normalizeSnapLensId(body.snapLensId || "");
  const isFlashSale = Boolean(body.isFlashSale);
  const discountPercentage = Math.max(0, Math.min(90, Number(body.discountPercentage || 0)));
  const saleDurationHours = Math.max(0, Number(body.saleDurationHours ?? body.saleDuration ?? 0));
  const saleEndTime =
    isFlashSale && discountPercentage > 0 && saleDurationHours > 0
      ? new Date(Date.now() + saleDurationHours * 60 * 60 * 1000)
      : null;

  return {
    name: body.name,
    price: Number(body.price),
    description: body.description,
    category: body.category,
    image: body.image,
    stockCount: Math.max(0, Number(body.stockCount ?? 0)),
    snapLensId,
    isArEnabled: Boolean(snapLensId),
    isFlashSale: Boolean(saleEndTime),
    discountPercentage: saleEndTime ? discountPercentage : 0,
    saleDurationHours: saleEndTime ? saleDurationHours : 0,
    saleEndTime
  };
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(buildProductPayload(req.body));
    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    return res.json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json(product);
  } catch (error) {
    next(error);
  }
};

export const addProductReview = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const rating = Number(req.body.rating);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const reviewPayload = {
      userName: req.user?.name || "Customer",
      rating,
      comment: req.body.comment?.trim() || "",
      reviewImage: req.body.reviewImage?.trim() || ""
    };

    const existingReview = product.reviews.find((review) => review.userName === reviewPayload.userName);

    if (existingReview) {
      existingReview.rating = reviewPayload.rating;
      existingReview.comment = reviewPayload.comment;
      existingReview.reviewImage = reviewPayload.reviewImage;
    } else {
      product.reviews.unshift(reviewPayload);
    }

    await product.save();
    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    Object.assign(product, buildProductPayload(req.body));
    const updated = await product.save();
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    await product.deleteOne();
    return res.json({ message: "Product removed" });
  } catch (error) {
    next(error);
  }
};

export const recommendProducts = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("preferences");
    if (!user) return res.status(404).json({ message: "User not found" });

    const preferences = user.preferences || [];
    if (preferences.length === 0) {
      const fallback = await Product.find().limit(10);
      return res.json(fallback);
    }

    const regexPattern = preferences.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const products = await Product.find({
      $or: [
        { category: { $in: preferences } },
        { name: { $regex: regexPattern, $options: "i" } },
        { description: { $regex: regexPattern, $options: "i" } }
      ]
    }).limit(20);

    return res.json(products);
  } catch (error) {
    next(error);
  }
};
