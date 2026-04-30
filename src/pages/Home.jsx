import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Bolt, ChevronLeft, ChevronRight, Clock3, ShoppingBag } from "lucide-react";
import ProductCard from "../components/ProductCard.jsx";
import ProductImage from "../components/ProductImage.jsx";
import { useApp } from "../context/useApp.jsx";
import { formatCountdown, getDiscountedPrice, getFlashSaleTimeLeft, isFlashSaleActive } from "../utils/pricing.js";

const FLASH_CAROUSEL_INTERVAL = 4200;
const PRODUCT_PAGE_SIZE = 30;

const getProductRatingScore = (product) => {
  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  if (reviews.length === 0) return 0;

  return reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviews.length;
};

const getBestOfferScore = (product, now) =>
  (isFlashSaleActive(product, now) ? 80 : 0) +
  Number(product.discountPercentage || 0) * 2 +
  getProductRatingScore(product) * 6 +
  (Array.isArray(product.reviews) ? product.reviews.length : 0) * 8 +
  Number(product.stockCount || 0) * 0.15;

const PaginationControls = ({ currentPage, onPageChange, pageSize, totalItems, totalPages }) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (page === 1 || page === totalPages) return true;
    return Math.abs(page - currentPage) <= 1;
  });

  return (
    <nav
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Product pagination"
    >
      <p className="text-sm text-text/65">
        Showing {startItem}-{endItem} of {totalItems} products
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="icon-pill inline-flex h-10 w-10 items-center justify-center border border-border bg-bg text-text disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous product page"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        {pages.map((page, index) => {
          const previousPage = pages[index - 1];
          const showGap = previousPage && page - previousPage > 1;

          return (
            <div key={page} className="flex items-center gap-2">
              {showGap ? <span className="px-1 text-sm text-text/45">...</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                className={`pill-button min-w-10 px-3 ${
                  page === currentPage ? "border-accent bg-accent text-white" : "bg-bg text-text"
                }`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="icon-pill inline-flex h-10 w-10 items-center justify-center border border-border bg-bg text-text disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next product page"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
};

const FlashSaleCarousel = ({ products, loading, now }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = products.length;
  const safeActiveIndex = totalSlides > 0 ? Math.min(activeIndex, totalSlides - 1) : 0;
  const activeProduct = totalSlides > 0 ? products[safeActiveIndex] : null;
  const flashSaleActive = activeProduct ? isFlashSaleActive(activeProduct, now) : false;
  const displayPrice = activeProduct ? getDiscountedPrice(activeProduct, now) : 0;
  const timeLeft = activeProduct ? getFlashSaleTimeLeft(activeProduct, now) : 0;

  const pauseCarousel = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeCarousel = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleCarouselBlur = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsPaused(false);
  }, []);

  const goToSlide = useCallback(
    (direction) => {
      if (totalSlides <= 1) return;

      setActiveIndex((currentIndex) => {
        if (direction === "next") return (currentIndex + 1) % totalSlides;
        return (currentIndex - 1 + totalSlides) % totalSlides;
      });
    },
    [totalSlides]
  );

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return undefined;

    const timer = window.setInterval(() => {
      goToSlide("next");
    }, FLASH_CAROUSEL_INTERVAL);

    return () => window.clearInterval(timer);
  }, [goToSlide, isPaused, totalSlides]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
          <div className="space-y-4">
            <div className="skeleton-shimmer h-4 w-36 rounded-full" />
            <div className="skeleton-shimmer h-12 max-w-2xl rounded-2xl" />
            <div className="skeleton-shimmer h-5 max-w-xl rounded-full" />
            <div className="skeleton-shimmer h-10 w-40 rounded-full" />
          </div>
          <div className="skeleton-shimmer aspect-[4/3] rounded-2xl" />
        </div>
      </section>
    );
  }

  if (!activeProduct) {
    return (
      <section className="rounded-2xl border border-border bg-card p-8">
        <p className="mb-3 text-sm font-normal uppercase tracking-[0.2em] text-accent">Personalized Feed</p>
        <h1 className="max-w-3xl text-[38px] font-medium leading-tight text-text">
          Discover AI-curated picks designed around your style and AR-ready experiences.
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/virtual-store" className="pill-button bg-accent text-white">
            Enter Virtual Mall
          </Link>
          <p className="self-center text-sm text-text/65">
            Walk through the isometric store, inspect live displays, and checkout from the billing counter.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      onMouseEnter={pauseCarousel}
      onMouseLeave={resumeCarousel}
      onFocus={pauseCarousel}
      onBlur={handleCarouselBlur}
    >
      <div className="grid min-h-[18rem] gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:p-8">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white">
                <Bolt size={14} strokeWidth={2} />
                Flash Sale
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-text/65">
                <Clock3 size={14} strokeWidth={2} />
                {flashSaleActive ? formatCountdown(timeLeft) : "Limited stock"}
              </span>
            </div>

            <Link to={`/products/${activeProduct._id}`} className="mt-5 block max-w-3xl">
              <p className="text-sm font-normal uppercase tracking-[0.2em] text-accent">Personalized Deal</p>
              <h1 className="mt-3 text-3xl font-medium leading-tight text-text sm:text-[38px]">
                {activeProduct.name}
              </h1>
              <p className="mt-4 line-clamp-2 text-sm leading-7 text-text/70">
                {activeProduct.description}
              </p>
            </Link>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-2xl font-medium text-text">Rs. {displayPrice}</span>
                {flashSaleActive ? (
                  <>
                    <span className="pb-1 text-sm text-text/40 line-through">Rs. {activeProduct.price}</span>
                    <span className="mb-1 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent">
                      {activeProduct.discountPercentage}% off
                    </span>
                  </>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-text/55">
                {Number(activeProduct.stockCount) > 0
                  ? `${activeProduct.stockCount} available`
                  : "Currently out of stock"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToSlide("prev")}
                disabled={totalSlides <= 1}
                className="icon-pill inline-flex h-11 w-11 items-center justify-center border border-border bg-bg text-text disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous flash sale product"
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => goToSlide("next")}
                disabled={totalSlides <= 1}
                className="icon-pill inline-flex h-11 w-11 items-center justify-center border border-border bg-bg text-text disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next flash sale product"
              >
                <ChevronRight size={18} strokeWidth={2} />
              </button>
              <Link to={`/products/${activeProduct._id}`} className="pill-button inline-flex items-center gap-2 bg-accent text-white">
                <ShoppingBag size={16} strokeWidth={2} />
                Open Product
              </Link>
            </div>
          </div>
        </div>

        <Link
          to={`/products/${activeProduct._id}`}
          className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-bg"
          aria-label={`Open ${activeProduct.name}`}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}
          >
            {products.map((product) => (
              <div key={product._id} className="min-w-full">
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-white/72">
              {activeProduct.category || "Featured"}
            </p>
            <p className="mt-1 truncate text-lg font-medium">{activeProduct.name}</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3 sm:px-8">
        {products.map((product, index) => (
          <button
            key={`flash-dot-${product._id}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === safeActiveIndex ? "w-9 bg-accent" : "w-4 bg-text/20 hover:bg-text/35"
            }`}
            aria-label={`Show ${product.name}`}
          />
        ))}
        <span className="ml-auto text-xs text-text/45">
          {isPaused ? "Paused" : "Auto"}
        </span>
      </div>
    </section>
  );
};

const SearchResultRow = ({ product, addToCart, now }) => {
  const flashSaleActive = isFlashSaleActive(product, now);
  const displayPrice = getDiscountedPrice(product, now);
  const timeLeft = getFlashSaleTimeLeft(product, now);

  return (
    <article className="grid gap-5 rounded-[1.75rem] border border-border bg-card p-5 transition-all duration-300 hover:border-accent/35 hover:shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:grid-cols-[220px_minmax(0,1fr)]">
      <Link to={`/products/${product._id}`} className="overflow-hidden rounded-[1.5rem] bg-bg">
        <ProductImage src={product.image} alt={product.name} className="h-52 w-full object-cover" />
      </Link>
      <div className="flex flex-col justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">{product.category}</p>
            {flashSaleActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white shadow-[0_12px_35px_rgba(108,99,255,0.2)]">
                <Bolt size={12} strokeWidth={2} />
                Flash Sale
              </span>
            ) : null}
          </div>
          <Link to={`/products/${product._id}`} className="mt-2 block text-2xl font-medium text-text">
            {product.name}
          </Link>
          <p className="mt-3 text-sm leading-7 text-text/72">{product.description}</p>
          {flashSaleActive ? (
            <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-accent/20 bg-accent/10 px-4 py-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-accent">Ends In</span>
              <span className="text-sm font-medium tracking-[0.18em] text-text">
                {formatCountdown(timeLeft)}
              </span>
              <span className="text-xs text-accent/80">{product.discountPercentage}% off</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-2xl font-medium text-text">Rs. {displayPrice}</span>
            {flashSaleActive ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text/40 line-through">Rs. {product.price}</span>
                <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                  {product.discountPercentage}% off
                </span>
              </div>
            ) : null}
            <span className="text-xs text-text/55">
              {product.stockCount > 0 ? `${product.stockCount} available` : "Currently out of stock"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/products/${product._id}`} className="pill-button bg-bg text-text">
              View Product
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
      </div>
    </article>
  );
};

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    products,
    loading,
    user,
    searchQuery,
    addToCart,
    personalizedRecommendations,
    personalizedLoading,
    fetchPersonalizedRecommendations
  } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const [paginationState, setPaginationState] = useState({ key: "", page: 1 });

  useEffect(() => {
    if (!location.state?.notAuthorized) return;
    toast.error("Not Authorized");
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = Boolean(normalizedQuery);

  useEffect(() => {
    if (isSearching || !user?.token) return;
    fetchPersonalizedRecommendations();
  }, [fetchPersonalizedRecommendations, isSearching, user?.token]);

  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      [product.name, product.description, product.category].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    );
  }, [products, normalizedQuery]);

  const productListKey = `${normalizedQuery}:${products.length}`;
  const requestedPage = paginationState.key === productListKey ? paginationState.page : 1;
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalProductPages);

  const handleProductPageChange = useCallback(
    (nextPage) => {
      const safePage = Math.min(Math.max(nextPage, 1), totalProductPages);
      setPaginationState({ key: productListKey, page: safePage });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [productListKey, totalProductPages]
  );

  const forYouProducts = useMemo(() => {
    const preferences = user?.preferences || [];
    if (!preferences.length || isSearching) return [];
    const normalizedPreferences = preferences.map((pref) => pref.toLowerCase());

    return filteredProducts.filter((product) => {
      const haystack = `${product.category} ${product.name} ${product.description}`.toLowerCase();
      return normalizedPreferences.some((pref) => haystack.includes(pref));
    });
  }, [filteredProducts, isSearching, user?.preferences]);

  const bestOfferProducts = useMemo(
    () =>
      [...filteredProducts]
        .sort((a, b) => getBestOfferScore(b, now) - getBestOfferScore(a, now))
        .slice(0, 6),
    [filteredProducts, now]
  );

  const recommendedProducts = personalizedRecommendations.length > 0
    ? personalizedRecommendations
    : forYouProducts.length > 0
      ? forYouProducts
      : bestOfferProducts;

  const visibleProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCT_PAGE_SIZE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCT_PAGE_SIZE);
  }, [currentPage, filteredProducts]);

  const flashSaleProducts = useMemo(() => {
    if (isSearching) return [];
    const activeSaleProducts = filteredProducts.filter((product) => isFlashSaleActive(product, now));
    return (activeSaleProducts.length > 0 ? activeSaleProducts : filteredProducts).slice(0, 8);
  }, [filteredProducts, isSearching, now]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-8 py-8">
      {!isSearching && (
        <FlashSaleCarousel products={flashSaleProducts} loading={loading} now={now} />
      )}

      {isSearching && (
        <section className="rounded-[1.75rem] border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Search Results</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-medium text-text">Results for "{searchQuery.trim()}"</h1>
              <p className="mt-2 text-sm text-text/65">
                {filteredProducts.length} matching product{filteredProducts.length === 1 ? "" : "s"} found
              </p>
            </div>
            <p className="text-sm text-text/55">
              Browse detailed results with image, pricing, and quick product actions.
            </p>
          </div>
        </section>
      )}

      {!loading && !isSearching && recommendedProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-medium text-text">Recommended For You</h2>
            
          </div>
          {user?.token && personalizedLoading && personalizedRecommendations.length === 0 && bestOfferProducts.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((key) => (
                <div key={key} className="space-y-3 rounded-2xl border border-border bg-card p-5">
                  <div className="skeleton-shimmer h-56 rounded-2xl" />
                  <div className="skeleton-shimmer h-5 w-2/3 rounded-full" />
                  <div className="skeleton-shimmer h-4 w-full rounded-full" />
                  <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {recommendedProducts.slice(0, 6).map((product) => (
                <ProductCard key={`for-you-${product._id}`} product={product} now={now} />
              ))}
            </div>
          )}
        </section>
      )}
      
<h2 className="text-2xl font-medium text-text"> Product</h2>


      {!isSearching && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading &&
            [1, 2, 3, 4, 5, 6].map((key) => (
              <div key={key} className="space-y-3 rounded-2xl border border-border bg-card p-5">
                <div className="skeleton-shimmer h-56 rounded-2xl" />
                <div className="skeleton-shimmer h-5 w-2/3 rounded-full" />
                <div className="skeleton-shimmer h-4 w-full rounded-full" />
                <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
              </div>
            ))}
          {!loading &&
            visibleProducts.map((product) => <ProductCard key={product._id} product={product} now={now} />)}
          {!loading && filteredProducts.length === 0 && (
            <div className="col-span-full rounded-2xl border border-border bg-card p-6 text-sm font-normal text-text/70">
              No products match your current search.
            </div>
          )}
        </section>
      )}

      {isSearching && (
        <section className="space-y-5">
          {loading &&
            [1, 2, 3].map((key) => (
              <div key={key} className="grid gap-5 rounded-[1.75rem] border border-border bg-card p-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="skeleton-shimmer h-52 rounded-[1.5rem]" />
                <div className="space-y-3">
                  <div className="skeleton-shimmer h-5 w-24 rounded-full" />
                  <div className="skeleton-shimmer h-8 w-3/4 rounded-full" />
                  <div className="skeleton-shimmer h-4 w-full rounded-full" />
                  <div className="skeleton-shimmer h-4 w-5/6 rounded-full" />
                  <div className="skeleton-shimmer h-6 w-32 rounded-full" />
                </div>
              </div>
            ))}
          {!loading && visibleProducts.map((product) => (
            <SearchResultRow key={product._id} product={product} addToCart={addToCart} now={now} />
          ))}
          {!loading && filteredProducts.length === 0 && (
            <div className="rounded-[1.75rem] border border-border bg-card p-6 text-sm font-normal text-text/70">
              No products match your current search. Try a broader keyword or upload a different product image.
            </div>
          )}
        </section>
      )}

      {!loading && filteredProducts.length > PRODUCT_PAGE_SIZE && (
        <PaginationControls
          currentPage={currentPage}
          onPageChange={handleProductPageChange}
          pageSize={PRODUCT_PAGE_SIZE}
          totalItems={filteredProducts.length}
          totalPages={totalProductPages}
        />
      )}
    </main>
  );
};

export default Home;
