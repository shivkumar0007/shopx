import axios from "axios";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config/api.js";
import { getDiscountedPrice } from "../utils/pricing.js";

const api = axios.create({
  baseURL: API_BASE_URL
});

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem("nextgen-cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const raw = localStorage.getItem("nextgen-wishlist");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem("nextgen-orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("nextgen-user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const raw = localStorage.getItem("nextgen-coupon");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem("nextgen-user", JSON.stringify(user));
      if (user.token) {
        api.defaults.headers.common.Authorization = `Bearer ${user.token}`;
      }
    } else {
      localStorage.removeItem("nextgen-user");
      delete api.defaults.headers.common.Authorization;
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("nextgen-orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("nextgen-wishlist", JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  useEffect(() => {
    localStorage.setItem("nextgen-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem("nextgen-coupon", JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem("nextgen-coupon");
    }
  }, [appliedCoupon]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/products");
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts().catch(() => setProducts([]));
  }, []);

  const syncCartToServer = async (items) => {
    if (!user?.token) return;
    const payload = items.map((item) => ({ productId: item._id, quantity: item.quantity }));
    const { data } = await api.post("/user/cart", { items: payload });
    setCartItems(data || []);
  };

  const syncWishlistToServer = async (items) => {
    if (!user?.token) return;
    const payload = items.map((item) => item._id);
    const { data } = await api.post("/user/wishlist", { items: payload });
    setWishlistItems(data || []);
  };

  useEffect(() => {
    const loadUserCollections = async () => {
      if (!user?.token) return;
      try {
        const [{ data: cart }, { data: wishlist }] = await Promise.all([
          api.get("/user/cart"),
          api.get("/user/wishlist")
        ]);
        setCartItems(cart || []);
        setWishlistItems(wishlist || []);
      } catch {
        setCartItems([]);
        setWishlistItems([]);
      }
    };

    loadUserCollections();
  }, [user?.token]);

  const addToCart = (product) => {
    if (Number(product.stockCount) === 0) {
      toast.error("This product is out of stock");
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      const next = existing
        ? prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        )
        : [...prev, { ...product, quantity: 1 }];
      syncCartToServer(next).catch(() => {});
      toast.success("Item added to cart");
      return next;
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => {
      const next = prev.filter((item) => item._id !== productId);
      syncCartToServer(next).catch(() => {});
      toast.success("Removed from cart");
      return next;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) return removeFromCart(productId);
    setCartItems((prev) => {
      const next = prev.map((item) => (item._id === productId ? { ...item, quantity } : item));
      syncCartToServer(next).catch(() => {});
      return next;
    });
  };

  const clearCart = () =>
    setCartItems((prev) => {
      if (prev.length > 0) syncCartToServer([]).catch(() => {});
      setAppliedCoupon(null);
      return [];
    });

  const addOrder = (order) => {
    setOrders((prev) => [{ ...order, id: order.id || `order-${Date.now()}` }, ...prev]);
  };

  const addToWishlist = (product) => {
    setWishlistItems((prev) => {
      if (prev.some((item) => item._id === product._id)) return prev;
      const next = [...prev, product];
      syncWishlistToServer(next).catch(() => {});
      toast.success("Saved to wishlist");
      return next;
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems((prev) => {
      const next = prev.filter((item) => item._id !== productId);
      syncWishlistToServer(next).catch(() => {});
      toast.success("Removed from wishlist");
      return next;
    });
  };

  const toggleWishlist = (product) => {
    setWishlistItems((prev) => {
      const exists = prev.some((item) => item._id === product._id);
      const next = exists
        ? prev.filter((item) => item._id !== product._id)
        : [...prev, product];
      syncWishlistToServer(next).catch(() => {});
      toast.success(exists ? "Removed from wishlist" : "Saved to wishlist");
      return next;
    });
  };

  const isInWishlist = (productId) => wishlistItems.some((item) => item._id === productId);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getDiscountedPrice(item) * item.quantity,
    0
  );
  const activeCoupon = subtotal <= 0 ? null : appliedCoupon;
  const discountAmount = activeCoupon
    ? Number(((subtotal * Number(activeCoupon.discountPercentage || 0)) / 100).toFixed(2))
    : 0;
  const totalAmount = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

  const applyCoupon = async (code) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) {
      throw new Error("Please enter a promo code.");
    }

    const { data } = await api.post("/coupons/validate", {
      code: normalizedCode,
      subtotal
    });

    setAppliedCoupon(data?.coupon || null);
    return data;
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
  };

  const loginDemo = () => {
    setUser({
      _id: "demo-user-id",
      name: "Demo User",
      email: "demo@shopx.ai",
      token: "demo-token",
      role: "admin",
      preferences: ["Fashion", "Beauty", "Accessories"]
    });
  };

  const loginUser = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };

  const registerUser = async ({ name, email, password, preferences = [] }) => {
    const { data } = await api.post("/auth/register", { name, email, password, preferences });
    setUser(data);
    return data;
  };

  const logout = () => {
    setUser(null);
    setCartItems([]);
    setWishlistItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem("nextgen-cart");
    localStorage.removeItem("nextgen-wishlist");
    toast.success("Signed out");
  };

  const value = useMemo(
    () => ({
      api,
      products,
      loading,
      fetchProducts,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      subtotal,
      discountAmount,
      totalAmount,
      appliedCoupon: activeCoupon,
      applyCoupon,
      clearCoupon,
      orders,
      addOrder,
      user,
      searchQuery,
      setSearchQuery,
      loginDemo,
      loginUser,
      registerUser,
      logout,
      setUser
    }),
    [
      products,
      loading,
      cartItems,
      wishlistItems,
      subtotal,
      discountAmount,
      totalAmount,
      activeCoupon,
      orders,
      user,
      searchQuery
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
};
