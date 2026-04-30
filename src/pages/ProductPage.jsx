import { motion } from "framer-motion";
import { Bolt, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ARModal from "../components/ARModal.jsx";
import CombinationGrid from "../components/CombinationGrid.jsx";
import ProductImage from "../components/ProductImage.jsx";
import ReviewForm from "../components/ReviewForm.jsx";
import ReviewList from "../components/ReviewList.jsx";
import { useApp } from "../context/useApp.jsx";
import { formatCountdown, getDiscountedPrice, getFlashSaleTimeLeft, isFlashSaleActive } from "../utils/pricing.js";

const MotionDiv = motion.div;

const ProductPage = () => {
  const { id } = useParams();
  const { products, api, user, addToCart, addBundleToCart, fetchPersonalizedRecommendations } = useApp();
  const [product, setProduct] = useState(() => products.find((item) => item._id === id) || null);
  const [showAR, setShowAR] = useState(false);
  const [now, setNow] = useState(() => new Date().getTime());
  const [recommendationResult, setRecommendationResult] = useState({
    productId: "",
    recommendations: []
  });

  useEffect(() => {
    let ignore = false;

    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        if (!ignore) setProduct(data);
      })
      .catch(() => {
        if (!ignore) setProduct(null);
      });

    return () => {
      ignore = true;
    };
  }, [api, id]);

  useEffect(() => {
    if (!product?._id) return undefined;

    let ignore = false;

    api
      .get(`/products/${product._id}/recommendations`)
      .then(({ data }) => {
        if (!ignore) {
          setRecommendationResult({
            productId: product._id,
            recommendations: data?.recommendations || []
          });
        }
      })
      .catch(() => {
        if (!ignore) {
          setRecommendationResult({
            productId: product._id,
            recommendations: []
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [api, product?._id]);

  useEffect(() => {
    if (!product?._id || !user?.token) return;

    api
      .post(`/products/${product._id}/click`, null, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      .then(() => {
        fetchPersonalizedRecommendations?.();
      })
      .catch(() => {});
  }, [api, fetchPersonalizedRecommendations, product?._id, user?.token]);

  useEffect(() => {
    if (!product?.saleEndTime || !isFlashSaleActive(product)) return undefined;

    const endTime = new Date(product.saleEndTime).getTime();

    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= endTime) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [product]);

  const averageRating = useMemo(() => {
    const reviews = product?.reviews || [];
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
  }, [product?.reviews]);

  if (!product) {
    return <div className="mx-auto max-w-7xl px-8 py-8 text-text">Loading product details...</div>;
  }

  const lensId = product.snapLensId?.trim() || "";
  const canUseVirtualTryOn = Boolean(lensId);
  const totalReviews = product.reviews?.length || 0;
  const flashSaleActive = isFlashSaleActive(product, now);
  const discountedPrice = getDiscountedPrice(product, now);
  const timeLeft = getFlashSaleTimeLeft(product, now);
  const recommendationsLoading = Boolean(product?._id) && recommendationResult.productId !== product._id;
  const recommendations =
    recommendationResult.productId === product._id ? recommendationResult.recommendations : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <section className="grid gap-8 rounded-2xl border border-border bg-card p-6 sm:p-8 lg:grid-cols-2">
          <ProductImage src={product.image} alt={product.name} className="w-full rounded-2xl object-cover" />

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-normal uppercase tracking-[0.12em] text-accent">{product.category}</p>
              {flashSaleActive ? (
                <MotionDiv
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-[0_12px_35px_rgba(108,99,255,0.25)]"
                >
                  <Bolt size={13} strokeWidth={2} />
                  Flash Sale
                </MotionDiv>
              ) : null}
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1.5">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => {
                    const filled = index < Math.round(averageRating);
                    return (
                      <Star
                        key={index}
                        size={14}
                        strokeWidth={1.8}
                        className={filled ? "fill-accent text-accent" : "text-text/20"}
                      />
                    );
                  })}
                </div>
                <span className="text-xs text-text/60">
                  {totalReviews > 0 ? `${averageRating.toFixed(1)} (${totalReviews})` : "No ratings yet"}
                </span>
              </div>
            </div>

            <h2 className="text-3xl font-medium text-text">{product.name}</h2>
            <p className="text-sm font-normal leading-7 text-text/75">{product.description}</p>
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-xl font-medium text-text">Rs. {discountedPrice}</p>
              {flashSaleActive ? (
                <>
                  <p className="text-sm text-text/35 line-through">Rs. {product.price}</p>
                  <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent">
                    {product.discountPercentage}% off
                  </span>
                </>
              ) : null}
            </div>

            {flashSaleActive ? (
              <MotionDiv
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[1.5rem] border border-accent/20 bg-[radial-gradient(circle_at_top_right,_rgba(108,99,255,0.14),_transparent_52%)] px-5 py-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-accent">Sale Ends In</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-2xl font-medium tracking-[0.18em] text-text">
                    {formatCountdown(timeLeft)}
                  </span>
                  <span className="text-sm text-text/60">limited-time pricing</span>
                </div>
              </MotionDiv>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-bg p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text/45">Stock</p>
                <p className="mt-2 text-lg font-medium text-text">
                  {Number(product.stockCount) === 0 ? "Out of Stock" : `${product.stockCount} Available`}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-bg p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text/45">AR Ready</p>
                <p className="mt-2 text-lg font-medium text-text">
                  {canUseVirtualTryOn ? "Snap Lens Connected" : "Not Configured"}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                onClick={() => addToCart(product)}
                disabled={product.stockCount === 0}
                className="pill-button bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {product.stockCount === 0 ? "Out of Stock" : "Add to Cart"}
              </button>
              {canUseVirtualTryOn ? (
                <button onClick={() => setShowAR(true)} className="pill-button bg-bg text-text">
                  Virtual Try-On
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <ReviewList reviews={product.reviews || []} />
          <ReviewForm
            productId={product._id}
            onReviewAdded={(updatedProduct) => setProduct(updatedProduct)}
          />
        </div>

        <CombinationGrid
          recommendations={recommendations}
          loading={recommendationsLoading}
          canAddBundle={recommendations.length === 3}
          onAddBundle={() => addBundleToCart(recommendations.map((item) => item.product))}
        />
      </div>

      <ARModal open={showAR} lensId={lensId} onClose={() => setShowAR(false)} />
    </main>
  );
};

export default ProductPage;
