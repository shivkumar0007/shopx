import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { EmptyWishlistIllustration } from "../components/EmptyStateIllustration.jsx";
import { useApp } from "../context/AppContext.jsx";

const Wishlist = () => {
  const { wishlistItems, removeFromWishlist, addToCart } = useApp();

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <section className="rounded-2xl border border-border bg-card p-8">
        <h2 className="mb-6 text-2xl font-medium text-text">Wishlist</h2>
        {wishlistItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg px-6 py-14 text-center">
            <EmptyWishlistIllustration />
            <p className="mb-2 text-xl font-medium text-text">No saved items yet</p>
            <p className="mb-6 text-sm font-normal text-text/70">
              Tap the heart icon on products you love.
            </p>
            <Link to="/" className="pill-button bg-accent text-white">
              Start Exploring
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {wishlistItems.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{item.name}</p>
                  <p className="text-sm font-normal text-text/70">Rs. {item.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => addToCart(item)} className="pill-button bg-accent text-white">
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item._id)}
                    className="icon-pill border border-border bg-bg p-2.5 text-text"
                    aria-label="Remove from wishlist"
                  >
                    <Heart size={14} className="fill-accent text-accent" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Wishlist;
