import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { generateInvoicePdfBuffer } from "../utils/invoicePdf.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const normalizeItems = (items = []) =>
  items
    .filter((item) => item?.product || item?.productId)
    .map((item) => ({
      product: item.product || item.productId,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Math.max(0, Number(item.price) || 0),
      productName: item.productName || item.name || "",
      productImage: item.productImage || item.image || ""
    }));

const buildInvoiceNumber = (order) =>
  order.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;

const serializeOrder = (order) => ({
  _id: order._id,
  id: order.razorpayOrderId,
  razorpayOrderId: order.razorpayOrderId,
  razorpayPaymentId: order.razorpayPaymentId,
  status: order.status,
  orderStatus: order.orderStatus,
  amount: order.totalPrice,
  totalPrice: order.totalPrice,
  invoiceNumber: order.invoiceNumber,
  invoiceIssuedAt: order.invoiceIssuedAt,
  createdAt: order.createdAt,
  items: (order.items || []).map((item) => ({
    productId: item.product?._id || item.product,
    productName: item.productName || item.product?.name || "Product",
    productImage: item.productImage || item.product?.image || "",
    quantity: item.quantity,
    price: item.price
  }))
});

const loadOrderForUser = async (orderId, userId) =>
  Order.findOne({
    _id: orderId,
    user: userId
  })
    .populate("user", "name email")
    .populate("items.product", "name image");

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, currency = "INR", items = [] } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const normalizedItems = normalizeItems(items);

    const razorpayOrder = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency,
      receipt: `receipt_${Date.now()}`
    });

    await Order.create({
      user: req.user._id,
      items: normalizedItems,
      totalPrice: Number(amount),
      razorpayOrderId: razorpayOrder.id,
      status: "created",
      orderStatus: "Processing"
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
    const order = await Order.findOne({ razorpayOrderId: orderId })
      .populate("user", "name email")
      .populate("items.product", "name image");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const wasAlreadyPaid = order.status === "paid";
    order.status = isValid ? "paid" : "failed";
    order.razorpayPaymentId = paymentId;
    order.razorpaySignature = signature;

    if (!isValid) {
      await order.save();
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    if (!wasAlreadyPaid) {
      order.orderStatus = order.orderStatus || "Processing";
      order.invoiceNumber = buildInvoiceNumber(order);
      order.invoiceIssuedAt = order.invoiceIssuedAt || new Date();

      if (order.items.length > 0) {
        const stockUpdates = order.items.map((item) =>
          Product.findByIdAndUpdate(item.product?._id || item.product, {
            $inc: { stockCount: -item.quantity }
          })
        );
        await Promise.all(stockUpdates);
      }
    }

    await order.save();

    // Trigger invoice generation after successful payment so download is ready immediately.
    generateInvoicePdfBuffer(order);

    return res.json({
      success: true,
      message: "Payment verified successfully",
      order: serializeOrder(order)
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.product", "name image");

    return res.json(orders.map(serializeOrder));
  } catch (error) {
    next(error);
  }
};

export const downloadInvoice = async (req, res, next) => {
  try {
    const order = await loadOrderForUser(req.params.orderId, req.user._id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "paid") {
      return res.status(400).json({ message: "Invoice is available after successful payment only." });
    }

    if (!order.invoiceNumber) {
      order.invoiceNumber = buildInvoiceNumber(order);
      order.invoiceIssuedAt = order.invoiceIssuedAt || new Date();
      await order.save();
    }

    const invoiceBuffer = generateInvoicePdfBuffer(order);
    const fileName = `${order.invoiceNumber || "shopx-invoice"}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    return res.send(invoiceBuffer);
  } catch (error) {
    next(error);
  }
};
