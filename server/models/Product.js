import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    stockCount: { type: Number, required: true, min: 0, default: 0 },
    snapLensUrl: { type: String, default: "" },
    isArEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productSchema.pre("save", function setArFlag(next) {
  if (this.isModified("snapLensUrl") && !this.isModified("isArEnabled")) {
    this.isArEnabled = Boolean(this.snapLensUrl);
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;
