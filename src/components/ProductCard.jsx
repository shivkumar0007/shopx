import { Link } from "react-router-dom";
import { Heart, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import ProductImage from "./ProductImage.jsx";

const ProductCard = ({ product }) => {
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const wished = isInWishlist(product._id);

  return (
    <article className="group rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/50">
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-bg">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          className="icon-pill absolute right-3 top-3 border border-border bg-card/90 p-2 text-text backdrop-blur-sm hover:border-accent"
          aria-label="Toggle wishlist"
        >
          <Heart size={14} className={wished ? "fill-accent text-accent" : "text-text/80"} />
        </button>
        {product.isArEnabled && (
          <span className="ar-badge-pulse absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-white">
            <Sparkles size={12} /> AR Badge
          </span>
        )}
      </div>
      <h3 className="mb-2 text-lg font-medium text-text">{product.name}</h3>
      <p className="mb-5 text-sm font-normal text-text/70">{product.description}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-medium text-text">Rs. {product.price}</span>
        <div className="flex gap-2">
          <Link to={`/products/${product._id}`} className="pill-button bg-bg text-text">
            Details
          </Link>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={product.stockCount === 0}
            className="pill-button bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {product.stockCount === 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
