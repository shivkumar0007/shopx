import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
    reviewImage: { type: String, default: "" }
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    stockCount: { type: Number, required: true, min: 0, default: 0 },
    snapLensId: { type: String, default: "", trim: true },
    isArEnabled: { type: Boolean, default: false },
    isFlashSale: { type: Boolean, default: false },
    discountPercentage: { type: Number, min: 0, max: 90, default: 0 },
    saleDurationHours: { type: Number, min: 0, default: 0 },
    saleEndTime: { type: Date, default: null },
    reviews: { type: [reviewSchema], default: [] }
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
