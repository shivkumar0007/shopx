import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { getDiscountedPrice } from "../utils/pricing.js";
import ProductImage from "./ProductImage.jsx";

const MotionArticle = motion.article;

const cardMotion = {
  hidden: { opacity: 0, y: 28 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: index * 0.08,
      ease: "easeOut"
    }
  })
};

const RecommendationSkeleton = () => (
  <div className="grid gap-4 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="rounded-[1.75rem] border border-border bg-card p-4">
        <div className="skeleton-shimmer h-44 rounded-[1.25rem] border border-border bg-bg" />
        <div className="mt-4 space-y-3">
          <div className="skeleton-shimmer h-3 w-20 rounded-full bg-bg" />
          <div className="skeleton-shimmer h-5 w-3/4 rounded-full bg-bg" />
          <div className="skeleton-shimmer h-4 w-full rounded-full bg-bg" />
          <div className="skeleton-shimmer h-4 w-5/6 rounded-full bg-bg" />
          <div className="skeleton-shimmer h-10 w-full rounded-full bg-bg" />
        </div>
      </div>
    ))}
  </div>
);

const CombinationGrid = ({ recommendations = [], loading, onAddBundle, canAddBundle = false }) => {
  if (loading) {
    return (
      <section className="rounded-[1.75rem] border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">Complete the Look</p>
            <h3 className="mt-2 text-2xl font-medium text-text">AI-picked pairings are loading</h3>
          </div>
          <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent">
            Gemini styling in progress
          </span>
        </div>
        <RecommendationSkeleton />
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">Complete the Look</p>
          <h3 className="mt-2 text-2xl font-medium text-text">Three AI-matched add-ons for this product</h3>
          <p className="mt-2 text-sm text-text/65">
            Gemini suggested complementary categories, then SHOPX AI matched each one to a live product in your catalog.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddBundle}
          disabled={!canAddBundle}
          className="pill-button bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Bundle to Cart | Save 5%
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {recommendations.map((item, index) => (
          <MotionArticle
            key={item.product._id}
            custom={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={cardMotion}
            className="overflow-hidden rounded-[1.5rem] border border-border bg-bg"
          >
            <div className="overflow-hidden border-b border-border bg-card">
              <ProductImage src={item.product.image} alt={item.product.name} className="h-52 w-full object-cover" />
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent">
                  {item.category}
                </span>
                <span className="text-sm font-medium text-text">Rs. {getDiscountedPrice(item.product)}</span>
              </div>

              <div>
                <h4 className="text-lg font-medium text-text">{item.product.name}</h4>
                <p className="mt-1 text-sm text-text/60">{item.product.category}</p>
              </div>

              <div className="rounded-[1.25rem] border border-accent/15 bg-card px-4 py-3">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
                  <p className="text-sm leading-6 text-text/75">
                    <span className="font-medium text-text">AI says:</span> {item.reasoning}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-6 text-text/65">{item.product.description}</p>

              <Link to={`/products/${item.product._id}`} className="pill-button inline-flex bg-card text-text">
                View Product
              </Link>
            </div>
          </MotionArticle>
        ))}
      </div>
    </section>
  );
};

export default CombinationGrid;
