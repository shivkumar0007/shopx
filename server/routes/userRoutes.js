import express from "express";
import {
  getUserCart,
  getUserWishlist,
  saveUserCart,
  saveUserWishlist
} from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/cart", protect, getUserCart);
router.post("/cart", protect, saveUserCart);
router.get("/wishlist", protect, getUserWishlist);
router.post("/wishlist", protect, saveUserWishlist);

export default router;
