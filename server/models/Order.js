import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
    productName: { type: String, default: "", trim: true },
    productImage: { type: String, default: "" }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], default: [] },
    totalPrice: { type: Number, required: true, min: 0 },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    orderStatus: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered"],
      default: "Processing"
    },
    invoiceNumber: { type: String, default: "", trim: true },
    invoiceIssuedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
