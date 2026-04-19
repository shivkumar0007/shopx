import User from "../models/User.js";

export const getUserCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("cart.product");
    const cart = (user?.cart || [])
      .filter((item) => item.product)
      .map((item) => ({
        ...item.product.toObject(),
        quantity: item.quantity
      }));

    return res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const saveUserCart = async (req, res, next) => {
  try {
    const { items = [] } = req.body;
    const normalized = items
      .filter((item) => item?.productId)
      .map((item) => ({
        product: item.productId,
        quantity: Math.max(1, Number(item.quantity) || 1)
      }));

    const user = await User.findById(req.user._id);
    user.cart = normalized;
    await user.save();

    const populated = await User.findById(req.user._id).populate("cart.product");
    const cart = (populated?.cart || [])
      .filter((item) => item.product)
      .map((item) => ({
        ...item.product.toObject(),
        quantity: item.quantity
      }));

    return res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const getUserWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    return res.json((user?.wishlist || []).filter(Boolean));
  } catch (error) {
    next(error);
  }
};

export const saveUserWishlist = async (req, res, next) => {
  try {
    const { items = [] } = req.body;
    const normalized = [...new Set(items.filter(Boolean))];

    const user = await User.findById(req.user._id);
    user.wishlist = normalized;
    await user.save();

    const populated = await User.findById(req.user._id).populate("wishlist");
    return res.json((populated?.wishlist || []).filter(Boolean));
  } catch (error) {
    next(error);
  }
};
