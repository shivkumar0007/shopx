import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    stockCount: { type: Number, required: true, min: 0, default: 0 },
    snapLensId: { type: String, default: "", trim: true },
    isArEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productSchema.pre("save", function setArFlag(next) {
  if (this.isModified("snapLensId") && !this.isModified("isArEnabled")) {
    this.isArEnabled = Boolean(this.snapLensId);
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;
