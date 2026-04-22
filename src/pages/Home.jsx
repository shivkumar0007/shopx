import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Bolt } from "lucide-react";
import ProductCard from "../components/ProductCard.jsx";
import ProductImage from "../components/ProductImage.jsx";
import { useApp } from "../context/AppContext.jsx";
import { formatCountdown, getDiscountedPrice, getFlashSaleTimeLeft, isFlashSaleActive } from "../utils/pricing.js";

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
  const { products, loading, user, searchQuery, addToCart } = useApp();
  const [now, setNow] = useState(() => Date.now());

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

  const forYouProducts = useMemo(() => {
    const preferences = user?.preferences || [];
    if (!preferences.length || isSearching) return [];
    const normalizedPreferences = preferences.map((pref) => pref.toLowerCase());

    return filteredProducts.filter((product) => {
      const haystack = `${product.category} ${product.name} ${product.description}`.toLowerCase();
      return normalizedPreferences.some((pref) => haystack.includes(pref));
    });
  }, [filteredProducts, isSearching, user?.preferences]);

  const featuredProducts = useMemo(
    () => (isSearching ? filteredProducts : filteredProducts.slice(0, 12)),
    [filteredProducts, isSearching]
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-8 py-8">
      {!isSearching && (
        <section className="rounded-2xl border border-border bg-card p-8">
          <p className="mb-3 text-sm font-normal uppercase tracking-[0.2em] text-accent">Personalized Feed</p>
          <h1 className="max-w-3xl text-[38px] font-medium leading-tight tracking-[-1px] text-text">
            Discover AI-curated picks designed around your style and AR-ready experiences.
          </h1>
        </section>
      )}

      {isSearching && (
        <section className="rounded-[1.75rem] border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Search Results</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-medium text-text">Results for "{searchQuery.trim()}"</h1>
              <p className="mt-2 text-sm text-text/65">
                {featuredProducts.length} matching product{featuredProducts.length === 1 ? "" : "s"} found
              </p>
            </div>
            <p className="text-sm text-text/55">
              Browse detailed results with image, pricing, and quick product actions.
            </p>
          </div>
        </section>
      )}

      {!loading && !isSearching && user?.preferences?.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-medium text-text">For You</h2>
            <p className="text-sm font-normal text-text/70">
              Based on preferences: {user.preferences.join(", ")}
            </p>
          </div>
          {forYouProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {forYouProducts.slice(0, 6).map((product) => (
                <ProductCard key={`for-you-${product._id}`} product={product} now={now} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm font-normal text-text/70">
              No personalized matches yet. Try searching or update preferences.
            </div>
          )}
        </section>
      )}

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
            featuredProducts.map((product) => <ProductCard key={product._id} product={product} now={now} />)}
          {!loading && featuredProducts.length === 0 && (
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
          {!loading && featuredProducts.map((product) => (
            <SearchResultRow key={product._id} product={product} addToCart={addToCart} now={now} />
          ))}
          {!loading && featuredProducts.length === 0 && (
            <div className="rounded-[1.75rem] border border-border bg-card p-6 text-sm font-normal text-text/70">
              No products match your current search. Try a broader keyword or upload a different product image.
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default Home;
