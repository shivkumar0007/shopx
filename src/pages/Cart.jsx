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
      toast.error("Razorpay SDK not loaded. Please refresh the page.");
      return;
    }

    // ✅ Key validation guard
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      toast.error("Payment configuration error. Please contact support.");
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

      const options = {
        key: razorpayKey, // ✅ validated key use ho rahi hai
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SHOPX AI",
        description: "Secure Payment for your Order",
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#6c63ff",
        },
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post("/payments/verify", response, { headers });
            
            if (verifyData?.success) {
              addOrder({
                id: orderData.razorpay_order_id,
                amount: subtotal,
                items,
                status: "paid",
                createdAt: new Date().toISOString()
              });
              
              clearCart();
              toast.success("Payment Successful! Order Placed.");
              navigate("/profile");
            } else {
              throw new Error("Verification failed");
            }
          } catch (err) {
            console.error("Verification Error:", err);
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
        setIsProcessing(false);
      });

      razorpay.open();
    } catch (error) {
      console.error("Checkout Error:", error);
      toast.error(error?.response?.data?.message || "Could not initiate payment");
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
                <div key={item._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-bg p-4 shadow-sm">
                  <div>
                    <p className="font-medium text-text">{item.name}</p>
                    <p className="text-sm font-normal text-text/70">Rs. {item.price}</p>
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

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <div>
                <p className="text-sm text-text/60">Total Amount</p>
                <p className="text-2xl font-bold text-text">Rs. {subtotal}</p>
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