import express from "express";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  validateCoupon
} from "../controllers/couponController.js";
import protect, { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/validate", protect, validateCoupon);
router.get("/", protect, adminOnly, getCoupons);
router.post("/", protect, adminOnly, createCoupon);
router.delete("/:id", protect, adminOnly, deleteCoupon);

export default router;
