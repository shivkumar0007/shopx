import Product from "../models/Product.js";
import User from "../models/User.js";

const buildProductPayload = (body) => ({
  name: body.name,
  price: Number(body.price),
  description: body.description,
  category: body.category,
  image: body.image,
  stockCount: Math.max(0, Number(body.stockCount ?? 0)),
  snapLensUrl: body.snapLensUrl || "",
  isArEnabled:
    typeof body.isArEnabled === "boolean" ? body.isArEnabled : Boolean(body.snapLensUrl)
});

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
