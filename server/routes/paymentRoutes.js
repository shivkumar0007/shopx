import express from "express";
import {
  createRazorpayOrder,
  downloadInvoice,
  getUserOrders,
  verifyPayment
} from "../controllers/paymentController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/orders", protect, getUserOrders);
router.get("/orders/:orderId/invoice", protect, downloadInvoice);
router.post("/order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);

export default router;
