import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyCartIllustration } from "../components/EmptyStateIllustration.jsx";
import { useApp } from "../context/AppContext.jsx";

const Cart = () => {
  const navigate = useNavigate();
  const { api, cartItems, subtotal, updateQuantity, removeFromCart, clearCart, addOrder, user } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!user?.token) {
      toast.error("Login required before checkout.");
      return;
    }
    if (cartItems.length === 0) return;
    if (!window.Razorpay) {
      toast.error("Razorpay SDK missing. Add checkout script in index.html.");
      return;
    }

    try {
      setIsProcessing(true);
      const headers = { Authorization: `Bearer ${user.token}` };
      const items = cartItems.map((item) => ({
        product: item._id,
        quantity: item.quantity,
        price: item.price
      }));
      const { data: orderData } = await api.post(
        "/payments/order",
        { amount: subtotal, currency: "INR", items },
        { headers }
      );

      const razorpay = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_key",
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.razorpay_order_id,
        name: "NextGen Store",
        description: "AI-powered cart checkout",
        prefill: {
          name: user.name,
          email: user.email
        },
        handler: async (response) => {
          const { data: verifyData } = await api.post("/payments/verify", response, { headers });
          if (!verifyData?.success) throw new Error("Payment verification failed");

          addOrder({
            id: orderData.razorpay_order_id,
            amount: subtotal,
            items,
            status: "paid",
            createdAt: new Date().toISOString()
          });
          clearCart();
          toast.success("Payment successful");
          setTimeout(() => navigate("/profile"), 800);
        },
        theme: { color: "#6c63ff" }
      });

      razorpay.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Checkout failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <section className="rounded-2xl border border-border bg-card p-8">
        <h2 className="mb-6 text-2xl font-medium text-text">Cart</h2>
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
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-bg p-4">
                <div>
                  <p className="font-medium text-text">{item.name}</p>
                  <p className="text-sm font-normal text-text/70">Rs. {item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    className="pill-button border border-border bg-bg px-3 py-1 text-text"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm text-text">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    className="pill-button border border-border bg-bg px-3 py-1 text-text"
                  >
                    +
                  </button>
                  <button type="button" onClick={() => removeFromCart(item._id)} className="pill-button bg-card text-text">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-lg font-medium text-text">Subtotal: Rs. {subtotal}</p>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isProcessing || cartItems.length === 0}
            className="pill-button bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Pay with Razorpay"}
          </button>
        </div>
      </section>
    </main>
  );
};

export default Cart;
