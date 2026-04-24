import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyCartIllustration } from "../components/EmptyStateIllustration.jsx";
import { useApp } from "../context/useApp.jsx";
import { getDiscountedPrice, isFlashSaleActive } from "../utils/pricing.js";

const Cart = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    subtotal,
    bundleDiscountAmount,
    discountAmount,
    totalAmount,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
    updateQuantity,
    removeFromCart,
    startPayment,
    user
  } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState(() => appliedCoupon?.code || "");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    try {
      setIsApplyingCoupon(true);
      const data = await applyCoupon(promoCode);
      setPromoCode(data?.coupon?.code || "");
      toast.success("Promo code applied.");
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Promo code is invalid.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (!user?.token || cartItems.length === 0) return;

    try {
      setIsProcessing(true);
      await startPayment({
        onSuccess: () => navigate("/profile")
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <section className="rounded-2xl border border-border bg-card p-8">
        <h2 className="mb-6 text-2xl font-medium text-text">My Shopping Cart</h2>

        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg px-6 py-14 text-center">
            <EmptyCartIllustration />
            <p className="mb-2 text-xl font-medium text-text">Your cart is empty</p>
            <p className="mb-6 text-sm font-normal text-text/70">
              Curated picks are waiting for you. Start exploring the catalog.
            </p>
            <Link to="/" className="pill-button bg-accent text-white">
              Start Exploring
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-bg p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium text-text">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-normal">
                      <span className="text-text/70">Rs. {getDiscountedPrice(item)}</span>
                      {isFlashSaleActive(item) ? (
                        <>
                          <span className="text-text/35 line-through">Rs. {item.price}</span>
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                            Flash Sale
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                      className="pill-button border border-border bg-bg px-3 py-1 text-text hover:bg-card"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-text">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      className="pill-button border border-border bg-bg px-3 py-1 text-text hover:bg-card"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item._id)}
                      className="ml-4 text-sm font-medium text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-bg p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="w-full max-w-xl">
                  <p className="text-sm font-medium text-text">Promo Code</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                      placeholder="Enter promo code"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !promoCode.trim()}
                      className="pill-button bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isApplyingCoupon ? "Applying..." : "Apply"}
                    </button>
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          clearCoupon();
                          setPromoCode("");
                        }}
                        className="pill-button bg-card text-text"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  {appliedCoupon ? (
                    <p className="mt-3 text-sm text-accent">
                      {appliedCoupon.code} applied for {appliedCoupon.discountPercentage}% off.
                    </p>
                  ) : null}
                </div>

                <div className="min-w-[240px]">
                  <p className="text-sm text-text/60">Subtotal</p>
                  <p className="mt-1 text-lg font-medium text-text">Rs. {subtotal}</p>
                  {bundleDiscountAmount > 0 ? (
                    <p className="mt-1 text-sm text-accent">Bundle Discount: - Rs. {bundleDiscountAmount}</p>
                  ) : null}
                  {discountAmount > 0 ? (
                    <p className="mt-1 text-sm text-accent">Discount: - Rs. {discountAmount}</p>
                  ) : null}
                  <p className="mt-3 text-sm text-text/60">Total Amount</p>
                  <p className="text-2xl font-bold text-text">Rs. {totalAmount}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <div>
                <p className="text-sm text-text/60">Payable Amount</p>
                <p className="text-2xl font-bold text-text">Rs. {totalAmount}</p>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isProcessing || cartItems.length === 0}
                className="pill-button bg-accent px-10 py-3 text-lg font-medium text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : "Pay Now"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default Cart;
