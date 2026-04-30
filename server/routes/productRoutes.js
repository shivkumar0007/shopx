import express from "express";
import {
  addProductReview,
  createProduct,
  deleteProduct,
  getAIRecommendations,
  getPersonalizedRecommendations,
  getProductById,
  getProducts,
  recommendProducts,
  trackProductClick,
  updateProduct
} from "../controllers/productController.js";
import protect, { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/recommend/personalized", protect, getPersonalizedRecommendations);
router.get("/recommend/:userId", recommendProducts);
router.get("/:id/recommendations", getAIRecommendations);
router.get("/:id", getProductById);
router.post("/:id/click", protect, trackProductClick);
router.post("/:id/reviews", protect, addProductReview);
router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;
