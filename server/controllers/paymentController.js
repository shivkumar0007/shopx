import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, currency = "INR", items = [] } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency,
      receipt: `receipt_${Date.now()}`
    });

    await Order.create({
      user: req.user._id,
      items,
      totalPrice: Number(amount),
      razorpayOrderId: razorpayOrder.id,
      status: "created"
    });

    return res.status(201).json({
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = expectedSignature === signature;

    await Order.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        status: isValid ? "paid" : "failed",
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      }
    );

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    return res.json({ success: true, message: "Payment verified successfully" });
  } catch (error) {
    next(error);
  }
};