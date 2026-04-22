import { Link } from "react-router-dom";
import { Bolt, Heart, Sparkles } from "lucide-react";
import { useApp } from "../context/useApp.jsx";
import ProductImage from "./ProductImage.jsx";
import { formatCountdown, getDiscountedPrice, getFlashSaleTimeLeft, isFlashSaleActive } from "../utils/pricing.js";

const ProductCard = ({ product, now = Date.now() }) => {
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const wished = isInWishlist(product._id);
  const flashSaleActive = isFlashSaleActive(product, now);
  const displayPrice = getDiscountedPrice(product, now);
  const timeLeft = getFlashSaleTimeLeft(product, now);

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
        {product.snapLensId && (
          <span className="ar-badge-pulse absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-white">
            <Sparkles size={12} /> AR Badge
          </span>
        )}
        {flashSaleActive ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white shadow-[0_12px_35px_rgba(108,99,255,0.25)]">
            <Bolt size={12} strokeWidth={2} />
            Flash Sale
          </span>
        ) : null}
      </div>
      <h3 className="mb-2 text-lg font-medium text-text">{product.name}</h3>
      <p className="mb-5 text-sm font-normal text-text/70">{product.description}</p>
      {flashSaleActive ? (
        <div className="mb-4 rounded-2xl border border-accent/20 bg-[radial-gradient(circle_at_top_right,_rgba(108,99,255,0.14),_transparent_52%)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-accent">Sale Ends In</span>
            <span className="text-xs text-accent/80">{product.discountPercentage}% off</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-base font-medium tracking-[0.18em] text-text">{formatCountdown(timeLeft)}</span>
            <span className="text-xs text-text/60">live now</span>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-base font-medium text-text">Rs. {displayPrice}</span>
          {flashSaleActive ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text/40 line-through">Rs. {product.price}</span>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                {product.discountPercentage}% off
              </span>
            </div>
          ) : null}
        </div>
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
