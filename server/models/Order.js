import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
        price: { type: Number, required: true, min: 0 }
      }
    ],
    totalPrice: { type: Number, required: true, min: 0 },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
