import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CreditCard,
  DoorOpen,
  Map,
  MoonStar,
  ShoppingBasket,
  Sparkles,
  SunMedium,
  Wallet,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import AssistantMiniBot from "../components/AssistantMiniBot.jsx";
import ProductImage from "../components/ProductImage.jsx";
import { useApp } from "../context/useApp.jsx";
import { getDiscountedPrice, isFlashSaleActive } from "../utils/pricing.js";

const MotionDiv = motion.div;

const STORE_WIDTH = 1200;
const STORE_HEIGHT = 880;
const PLAYER_SIZE = 34;
const PLAYER_SPEED = 5;
const STEP_INTERVAL_MS = 170;
const NEARBY_THRESHOLD = 130;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const initialPlayerPosition = { x: 86, y: 770 };

const floorZones = [
  {
    id: "electronics-zone",
    label: "Electronics",
    x: 48,
    y: 74,
    w: 504,
    h: 316,
    neonColor: "rgba(0,200,255,0.55)",
    glowColor: "rgba(0,200,255,0.18)",
    background:
      "linear-gradient(135deg, rgba(0,200,255,0.07) 0%, rgba(0,50,120,0.13) 100%)"
  },
  {
    id: "fashion-zone",
    label: "Fashion",
    x: 648,
    y: 74,
    w: 504,
    h: 316,
    neonColor: "rgba(255,60,200,0.65)",
    glowColor: "rgba(255,60,200,0.18)",
    background:
      "linear-gradient(135deg, rgba(255,60,200,0.08) 0%, rgba(80,0,80,0.13) 100%)"
  },
  {
    id: "grocery-zone",
    label: "Grocery",
    x: 48,
    y: 482,
    w: 504,
    h: 314,
    neonColor: "rgba(0,255,140,0.55)",
    glowColor: "rgba(0,255,140,0.14)",
    background:
      "linear-gradient(135deg, rgba(0,255,140,0.07) 0%, rgba(0,60,40,0.13) 100%)"
  }
];

const flashSaleZone = {
  id: "flash-zone",
  label: "Flash Sale",
  x: 650,
  y: 458,
  w: 260,
  h: 158
};

const counterDeskRect = {
  id: "counter-desk",
  x: 920,
  y: 510,
  w: 215,
  h: 62
};

const counterZone = {
  id: "counter-zone",
  x: 882,
  y: 574,
  w: 286,
  h: 132
};

const exitGateRect = {
  id: "exit-gate",
  x: 1072,
  y: 24,
  w: 84,
  h: 108
};

const exitTriggerRect = {
  id: "exit-trigger",
  x: 1094,
  y: -8,
  w: 52,
  h: 48
};

const SHELF_SLOTS = [
  { id: "elec-1", zone: "electronics", x: 104, y: 132, w: 118, h: 78 },
  { id: "elec-2", zone: "electronics", x: 264, y: 132, w: 118, h: 78 },
  { id: "elec-3", zone: "electronics", x: 424, y: 132, w: 102, h: 78 },
  { id: "elec-4", zone: "electronics", x: 160, y: 268, w: 118, h: 78 },
  { id: "elec-5", zone: "electronics", x: 322, y: 268, w: 118, h: 78 },
  { id: "fashion-1", zone: "fashion", x: 698, y: 132, w: 118, h: 78 },
  { id: "fashion-2", zone: "fashion", x: 858, y: 132, w: 118, h: 78 },
  { id: "fashion-3", zone: "fashion", x: 1018, y: 132, w: 102, h: 78 },
  { id: "fashion-4", zone: "fashion", x: 756, y: 268, w: 118, h: 78 },
  { id: "fashion-5", zone: "fashion", x: 918, y: 268, w: 118, h: 78 },
  { id: "grocery-1", zone: "grocery", x: 104, y: 540, w: 118, h: 78 },
  { id: "grocery-2", zone: "grocery", x: 264, y: 540, w: 118, h: 78 },
  { id: "grocery-3", zone: "grocery", x: 424, y: 540, w: 102, h: 78 },
  { id: "grocery-4", zone: "grocery", x: 160, y: 680, w: 118, h: 78 },
  { id: "grocery-5", zone: "grocery", x: 322, y: 680, w: 118, h: 78 },
  { id: "flash-1", zone: "flash", x: 694, y: 494, w: 88, h: 86 },
  { id: "flash-2", zone: "flash", x: 802, y: 494, w: 88, h: 86 }
];

const boundaryObstacles = [
  { id: "wall-top", x: 0, y: 0, w: STORE_WIDTH, h: 24 },
  { id: "wall-left", x: 0, y: 0, w: 24, h: STORE_HEIGHT },
  { id: "wall-right", x: STORE_WIDTH - 24, y: 0, w: 24, h: STORE_HEIGHT },
  { id: "wall-bottom-left", x: 0, y: STORE_HEIGHT - 24, w: STORE_WIDTH - 132, h: 24 },
  { id: "wall-bottom-right", x: STORE_WIDTH - 72, y: STORE_HEIGHT - 24, w: 72, h: 24 }
];

const categoryKeywords = {
  electronics: ["electronics", "phone", "laptop", "camera", "audio", "headphone", "watch", "smart", "tech"],
  fashion: ["fashion", "shirt", "dress", "shoe", "bag", "beauty", "jewelry", "wear", "hoodie", "jean", "kurta"],
  grocery: ["grocery", "food", "snack", "drink", "kitchen", "fruit", "tea", "coffee", "health", "daily"]
};

const ZONE_NEON = {
  electronics: { border: "rgba(0,200,255,0.7)", glow: "rgba(0,200,255,0.25)", shelf: "rgba(0,200,255,0.15)" },
  fashion: { border: "rgba(255,60,200,0.7)", glow: "rgba(255,60,200,0.22)", shelf: "rgba(255,60,200,0.12)" },
  grocery: { border: "rgba(0,255,140,0.7)", glow: "rgba(0,255,140,0.22)", shelf: "rgba(0,255,140,0.12)" },
  flash: { border: "rgba(255,80,80,0.85)", glow: "rgba(255,80,80,0.3)", shelf: "rgba(255,80,80,0.15)" }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rectsIntersect = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const getCenter = (rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
const getDistance = (pointA, pointB) => Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
const getPlayerRect = (position) => ({ x: position.x, y: position.y, w: PLAYER_SIZE, h: PLAYER_SIZE });

const productMatchesPreference = (product, preferences = []) => {
  const haystack = `${product.category} ${product.name} ${product.description} ${(product.tags || []).join(" ")}`.toLowerCase();
  return preferences.some((preference) => haystack.includes(String(preference || "").toLowerCase()));
};

const classifyProductZone = (product) => {
  const haystack = `${product.category} ${product.name} ${product.description} ${(product.tags || []).join(" ")}`.toLowerCase();
  if (categoryKeywords.electronics.some((keyword) => haystack.includes(keyword))) return "electronics";
  if (categoryKeywords.fashion.some((keyword) => haystack.includes(keyword))) return "fashion";
  if (categoryKeywords.grocery.some((keyword) => haystack.includes(keyword))) return "grocery";
  return "fashion";
};

const createFallbackStepper = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  const context = new AudioContextClass();
  return {
    play() {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 120;
      gainNode.gain.value = 0.02;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.045);
    }
  };
};

const NeonGridBg = () => (
  <div
    className="absolute inset-0 rounded-[1.7rem]"
    style={{
      backgroundColor: "#020b18",
      backgroundImage: `
        linear-gradient(rgba(0,200,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,200,255,0.04) 1px, transparent 1px),
        linear-gradient(rgba(0,200,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,200,255,0.02) 1px, transparent 1px)
      `,
      backgroundSize: "96px 96px, 96px 96px, 24px 24px, 24px 24px"
    }}
  />
);

const VirtualStore = () => {
  const {
    api,
    user,
    products,
    loading,
    cartItems,
    subtotal,
    bundleDiscountAmount,
    discountAmount,
    totalAmount,
    appliedCoupon,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearCoupon,
    addOrder
  } = useApp();

  const [player, setPlayer] = useState(initialPlayerPosition);
  const [isNightMode, setIsNightMode] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const movementStateRef = useRef({ up: false, down: false, left: false, right: false });
  const playerRef = useRef(initialPlayerPosition);
  const lastWarningAtRef = useRef(0);
  const lastFootstepAtRef = useRef(0);
  const stepAudioRef = useRef(null);
  const fallbackStepperRef = useRef(null);
  const counterStateRef = useRef(false);
  const exitStateRef = useRef(false);

  const totalBucketItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
    [cartItems]
  );

  const shelfAssignments = useMemo(() => {
    const flashProducts = products.filter((product) => isFlashSaleActive(product)).slice(0, 2);
    const flashIds = new Set(flashProducts.map((product) => product._id));
    const groupedProducts = { electronics: [], fashion: [], grocery: [] };

    products.forEach((product) => {
      if (flashIds.has(product._id)) return;
      groupedProducts[classifyProductZone(product)].push(product);
    });

    const fallbackQueue = [...groupedProducts.electronics, ...groupedProducts.fashion, ...groupedProducts.grocery];
    const fallbackCursor = { index: 0 };
    const categoryCursors = { electronics: 0, fashion: 0, grocery: 0 };

    const takeFallbackProduct = (usedIds) => {
      while (fallbackCursor.index < fallbackQueue.length) {
        const nextProduct = fallbackQueue[fallbackCursor.index];
        fallbackCursor.index += 1;
        if (!usedIds.has(nextProduct._id)) {
          usedIds.add(nextProduct._id);
          return nextProduct;
        }
      }
      return null;
    };

    const usedIds = new Set(flashIds);

    return SHELF_SLOTS.map((slot, index) => {
      let product = null;
      if (slot.zone === "flash") {
        product = flashProducts[index - (SHELF_SLOTS.length - 2)] || null;
      } else {
        const categoryProducts = groupedProducts[slot.zone] || [];
        while (categoryCursors[slot.zone] < categoryProducts.length) {
          const nextProduct = categoryProducts[categoryCursors[slot.zone]];
          categoryCursors[slot.zone] += 1;
          if (!usedIds.has(nextProduct._id)) {
            usedIds.add(nextProduct._id);
            product = nextProduct;
            break;
          }
        }
        if (!product) product = takeFallbackProduct(usedIds);
      }
      return { ...slot, product };
    });
  }, [products]);

  const collisionObstacles = useMemo(
    () => [
      ...boundaryObstacles,
      counterDeskRect,
      ...SHELF_SLOTS.map((slot) => ({ id: `collision-${slot.id}`, x: slot.x, y: slot.y, w: slot.w, h: slot.h }))
    ],
    []
  );

  const gateLocked = totalBucketItems > 0 && !isPaid;
  const playerRect = useMemo(() => getPlayerRect(player), [player]);
  const counterOpen = useMemo(() => rectsIntersect(playerRect, counterZone), [playerRect, counterZone]);

  const nearestShelf = useMemo(() => {
    const playerCenter = getCenter(playerRect);
    const candidates = shelfAssignments
      .filter((shelf) => shelf.product)
      .map((shelf) => ({ shelf, distance: getDistance(playerCenter, getCenter(shelf)) }))
      .sort((left, right) => left.distance - right.distance);
    return candidates[0] && candidates[0].distance <= NEARBY_THRESHOLD ? candidates[0].shelf : null;
  }, [playerRect, shelfAssignments]);

  const assistantMessage = useMemo(() => {
    if (nearestShelf?.product) {
      const matchedByHistory = productMatchesPreference(nearestShelf.product, user?.preferences || []);
      if (matchedByHistory) return `${nearestShelf.product.name} is a great match based on your history!`;
      return `You are close to ${nearestShelf.product.name}. Tap Add to Bucket if you want it.`;
    }
    if (counterOpen) {
      return totalBucketItems > 0
        ? "Counter ready. Review your bucket and pay here before heading to the exit."
        : "Bucket is empty. Browse a shelf and I will help you check out faster.";
    }
    if (gateLocked) return "Exit gate is locked because your bucket has unpaid items. Visit the counter first.";
    return "Walk with arrow keys, WASD, or the mobile controls. Explore shelves and shop in real time.";
  }, [counterOpen, gateLocked, nearestShelf, totalBucketItems, user?.preferences]);

  const movePlayer = useCallback(
    (deltaX, deltaY) => {
      const previousPosition = playerRef.current;
      let nextPosition = previousPosition;

      const attemptAxisMove = (axis, delta) => {
        if (!delta) return;
        const candidate = {
          ...nextPosition,
          [axis]: axis === "x"
            ? clamp(nextPosition.x + delta, 24, STORE_WIDTH - PLAYER_SIZE - 24)
            : clamp(nextPosition.y + delta, 24, STORE_HEIGHT - PLAYER_SIZE - 24)
        };
        const candidateRect = getPlayerRect(candidate);
        const hitsObstacle = collisionObstacles.some((obstacle) => rectsIntersect(candidateRect, obstacle));
        if (!hitsObstacle) nextPosition = candidate;
      };

      attemptAxisMove("x", deltaX);
      attemptAxisMove("y", deltaY);

      const nextRect = getPlayerRect(nextPosition);
      if (gateLocked && rectsIntersect(nextRect, exitGateRect)) {
        const now = Date.now();
        if (now - lastWarningAtRef.current > 1200) {
          toast.error("Please pay at the counter or remove items to exit!");
          lastWarningAtRef.current = now;
        }
        return previousPosition;
      }
      return nextPosition;
    },
    [collisionObstacles, gateLocked]
  );

  const playFootstep = useCallback(() => {
    const now = Date.now();
    if (now - lastFootstepAtRef.current < STEP_INTERVAL_MS) return;
    lastFootstepAtRef.current = now;
    const playableAudio = stepAudioRef.current;
    if (playableAudio) {
      try {
        playableAudio.currentTime = 0;
        const playAttempt = playableAudio.play();
        if (playAttempt?.catch) playAttempt.catch(() => fallbackStepperRef.current?.play());
        return;
      } catch {
        fallbackStepperRef.current?.play();
        return;
      }
    }
    fallbackStepperRef.current?.play();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const audio = new Audio("/audio/step.mp3");
    audio.preload = "auto";
    audio.volume = 0.18;
    stepAudioRef.current = audio;
    fallbackStepperRef.current = createFallbackStepper();
    return () => { stepAudioRef.current = null; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const keyDirectionMap = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
    const handleKeyChange = (pressed) => (event) => {
      const direction = keyDirectionMap[event.key.toLowerCase()];
      if (!direction) return;
      event.preventDefault();
      movementStateRef.current[direction] = pressed;
    };
    const handleKeyDown = handleKeyChange(true);
    const handleKeyUp = handleKeyChange(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const movementTimer = window.setInterval(() => {
      const movementState = movementStateRef.current;
      const rawX = (movementState.right ? 1 : 0) - (movementState.left ? 1 : 0);
      const rawY = (movementState.down ? 1 : 0) - (movementState.up ? 1 : 0);
      if (rawX === 0 && rawY === 0) return;
      const magnitude = Math.hypot(rawX, rawY) || 1;
      const deltaX = (rawX / magnitude) * PLAYER_SPEED;
      const deltaY = (rawY / magnitude) * PLAYER_SPEED;
      const nextPosition = movePlayer(deltaX, deltaY);
      if (nextPosition.x !== playerRef.current.x || nextPosition.y !== playerRef.current.y) {
        playerRef.current = nextPosition;
        setPlayer(nextPosition);
        playFootstep();
      }
    }, 16);
    return () => window.clearInterval(movementTimer);
  }, [movePlayer, playFootstep]);

  useEffect(() => {
    if (counterOpen && !counterStateRef.current) toast.success("Counter reached. Review your bucket and pay here.");
    counterStateRef.current = counterOpen;
  }, [counterOpen]);

  useEffect(() => {
    const exited = rectsIntersect(playerRect, exitTriggerRect);
    if (!exited) {
      exitStateRef.current = false;
      return;
    }
    if (!gateLocked && !exitStateRef.current) {
      toast.success("You exited the store successfully.");
      exitStateRef.current = true;
    }
  }, [gateLocked, playerRect]);

  const setMovementState = (direction, pressed) => { movementStateRef.current[direction] = pressed; };
  const handleAddToBucket = (product) => { addToCart(product); setIsPaid(false); };

  const handlePayNow = async () => {
    if (!user?.token) { toast.error("Login required before payment."); return; }
    if (cartItems.length === 0) { toast.error("Your bucket is empty."); return; }
    if (!window.Razorpay) { toast.error("Razorpay SDK not loaded. Please refresh the page."); return; }
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) { toast.error("Payment configuration error. Please contact support."); return; }

    try {
      setIsProcessingPayment(true);
      const headers = { Authorization: `Bearer ${user.token}` };
      const items = cartItems.map((item) => ({
        product: item._id,
        quantity: item.quantity,
        price: getDiscountedPrice(item),
        productName: item.name,
        productImage: item.image
      }));

      const { data: orderData } = await api.post("/payments/order", {
        amount: totalAmount,
        currency: "INR",
        items,
        couponCode: appliedCoupon?.code || ""
      }, { headers });

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SHOPX AI",
        description: "Virtual Store Checkout",
        order_id: orderData.razorpay_order_id,
        prefill: { name: user.name || "", email: user.email || "" },
        theme: { color: "#00c8ff" },
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post("/payments/verify", response, { headers });
            if (!verifyData?.success) throw new Error("Verification failed");
            const verifiedOrder = verifyData.order;
            addOrder({
              _id: verifiedOrder?._id,
              id: verifiedOrder?.razorpayOrderId || orderData.razorpay_order_id,
              amount: totalAmount,
              totalPrice: totalAmount,
              items: verifiedOrder?.items || items,
              status: verifiedOrder?.status || "paid",
              orderStatus: verifiedOrder?.orderStatus || "Processing",
              invoiceNumber: verifiedOrder?.invoiceNumber || "",
              createdAt: verifiedOrder?.createdAt || new Date().toISOString()
            });
            clearCoupon();
            clearCart();
            setIsPaid(true);
            setIsProcessingPayment(false);
            toast.success("Payment successful. Gate unlocked and order synced.");
          } catch {
            setIsProcessingPayment(false);
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        modal: { ondismiss: () => setIsProcessingPayment(false) }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessingPayment(false);
      });
      razorpay.open();
    } catch (error) {
      setIsProcessingPayment(false);
      toast.error(error?.response?.data?.message || "Could not initiate payment.");
    }
  };

  const minimapScale = 0.16;

  const bg = isNightMode ? "bg-[#030d1a] text-white" : "bg-slate-50 text-slate-950";
  const mutedText = isNightMode ? "text-[rgba(160,220,255,0.55)]" : "text-slate-500";

  return (
    <main
      className={`mx-auto flex min-h-[calc(100vh-88px)] max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 ${bg}`}
      style={{ fontFamily: "'Rajdhani', 'Exo 2', sans-serif" }}
    >
      <section
        className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: isNightMode ? "rgba(0,200,255,0.2)" : "rgba(99,102,241,0.25)",
          background: isNightMode
            ? "linear-gradient(135deg, #020d1e 0%, #030f22 50%, #04101f 100%)"
            : "linear-gradient(135deg, #f0f4ff 0%, #e8f0ff 100%)",
          boxShadow: isNightMode
            ? "0 0 0 1px rgba(0,200,255,0.08), 0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,200,255,0.1)"
            : "0 8px 32px rgba(0,0,0,0.08)"
        }}
      >
        {isNightMode && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-30"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,200,255,0.015) 2px, rgba(0,200,255,0.015) 4px)"
            }}
          />
        )}

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.35em]" style={{ color: isNightMode ? "#00c8ff" : "#6c63ff" }}>
              <Zap size={12} />
              Virtual Store
            </p>
            <h1
              className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl"
              style={{
                background: isNightMode
                  ? "linear-gradient(90deg, #ffffff 0%, rgba(0,200,255,0.9) 60%, rgba(255,60,200,0.8) 100%)"
                  : "linear-gradient(90deg, #1e293b 0%, #4338ca 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              Walk inside SHOPX AI and shop shelf by shelf.
            </h1>
            <p className={`mt-3 max-w-2xl text-sm leading-7 sm:text-base ${mutedText}`}>
              Keyboard aur touch controls ke saath move kariye, shelves ke paas jaakar product popup dekhiye,
              counter par payment kijiye, aur exit gate logic se fully synced immersive shopping experience enjoy kariye.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsNightMode((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200"
              style={{
                borderColor: isNightMode ? "rgba(0,200,255,0.3)" : "rgba(99,102,241,0.3)",
                background: isNightMode ? "rgba(0,200,255,0.08)" : "rgba(99,102,241,0.06)",
                color: isNightMode ? "#00c8ff" : "#4338ca",
                boxShadow: isNightMode ? "0 0 12px rgba(0,200,255,0.12)" : "none"
              }}
            >
              {isNightMode ? <SunMedium size={15} /> : <MoonStar size={15} />}
              {isNightMode ? "Day Mode" : "Night Mode"}
            </button>
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all duration-200"
              style={{
                background: isNightMode
                  ? "linear-gradient(135deg, rgba(0,150,255,0.9), rgba(0,200,255,0.7))"
                  : "linear-gradient(135deg, #6c63ff, #4338ca)",
                boxShadow: isNightMode ? "0 0 20px rgba(0,200,255,0.35), 0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(108,99,255,0.3)"
              }}
            >
              <ShoppingBasket size={15} />
              Bucket {totalBucketItems > 0 ? `(${totalBucketItems})` : ""}
            </Link>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 md:grid-cols-4">
          {[
            { icon: Wallet, label: "Bucket Total", value: currencyFormatter.format(totalAmount), color: "#00c8ff" },
            { icon: CreditCard, label: "Counter", value: counterOpen ? "You are here" : "Walk to pay", color: counterOpen ? "#00ff8c" : "#00c8ff" },
            { icon: DoorOpen, label: "Exit Gate", value: gateLocked ? "Locked" : "Open", color: gateLocked ? "#ff4040" : "#00ff8c" },
            { icon: Map, label: "Movement", value: "WASD / Arrows / Touch", color: "#ff3cc8" }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border px-4 py-4 transition-all duration-200"
              style={{
                borderColor: isNightMode ? `${item.color}25` : "rgba(99,102,241,0.15)",
                background: isNightMode
                  ? `linear-gradient(135deg, ${item.color}08 0%, rgba(2,10,25,0.9) 100%)`
                  : "rgba(255,255,255,0.8)",
                boxShadow: isNightMode ? `0 0 20px ${item.color}10, inset 0 1px 0 ${item.color}15` : "0 1px 4px rgba(0,0,0,0.06)"
              }}
            >
              <item.icon size={16} style={{ color: item.color }} />
              <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.22em] ${mutedText}`}>{item.label}</p>
              <p className="mt-1.5 text-base font-bold" style={{ color: isNightMode ? "#e0f4ff" : "#1e293b" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            borderColor: isNightMode ? "rgba(0,200,255,0.18)" : "rgba(99,102,241,0.2)",
            background: isNightMode ? "#020b18" : "#f8faff",
            boxShadow: isNightMode
              ? "0 0 0 1px rgba(0,200,255,0.06), 0 24px 70px rgba(0,0,0,0.7), inset 0 1px 0 rgba(0,200,255,0.1)"
              : "0 8px 32px rgba(0,0,0,0.08)",
            padding: "10px"
          }}
        >
          <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: `${STORE_WIDTH} / ${STORE_HEIGHT}` }}>
            <NeonGridBg />

            {isNightMode && (
              <>
                <div
                  className="pointer-events-none absolute left-0 top-0 h-16 w-16"
                  style={{ background: "radial-gradient(circle at top left, rgba(0,200,255,0.18), transparent 70%)" }}
                />
                <div
                  className="pointer-events-none absolute bottom-0 right-0 h-16 w-16"
                  style={{ background: "radial-gradient(circle at bottom right, rgba(255,60,200,0.15), transparent 70%)" }}
                />
              </>
            )}

            {floorZones.map((zone) => (
              <div
                key={zone.id}
                className="absolute rounded-2xl"
                style={{
                  left: `${(zone.x / STORE_WIDTH) * 100}%`,
                  top: `${(zone.y / STORE_HEIGHT) * 100}%`,
                  width: `${(zone.w / STORE_WIDTH) * 100}%`,
                  height: `${(zone.h / STORE_HEIGHT) * 100}%`,
                  background: isNightMode ? zone.background : zone.background.replace("0.07", "0.12").replace("0.08", "0.14"),
                  border: isNightMode ? `1.5px solid ${zone.neonColor}` : "1px solid rgba(99,102,241,0.2)",
                  boxShadow: isNightMode ? `0 0 18px ${zone.glowColor}, inset 0 0 30px ${zone.glowColor}` : "none"
                }}
              >
                <span
                  className="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: isNightMode ? zone.neonColor : "rgba(99,102,241,0.8)" }}
                >
                  {zone.label}
                </span>
              </div>
            ))}

            <div
              className="absolute animate-pulse rounded-xl"
              style={{
                left: `${(flashSaleZone.x / STORE_WIDTH) * 100}%`,
                top: `${(flashSaleZone.y / STORE_HEIGHT) * 100}%`,
                width: `${(flashSaleZone.w / STORE_WIDTH) * 100}%`,
                height: `${(flashSaleZone.h / STORE_HEIGHT) * 100}%`,
                border: isNightMode ? "2px dashed rgba(255,60,60,0.8)" : "2px dashed rgba(255,60,200,0.5)",
                background: isNightMode ? "rgba(255,40,40,0.06)" : "rgba(255,60,200,0.05)",
                boxShadow: isNightMode ? "0 0 24px rgba(255,60,60,0.3), inset 0 0 20px rgba(255,60,60,0.08)" : "none"
              }}
            >
              <span
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{
                  background: isNightMode ? "rgba(255,40,40,0.25)" : "rgba(255,60,200,0.1)",
                  color: isNightMode ? "#ff6060" : "#d946ab",
                  border: isNightMode ? "1px solid rgba(255,60,60,0.4)" : "1px solid rgba(255,60,200,0.3)"
                }}
              >
                <Sparkles size={10} />
                Flash Sale
              </span>
            </div>

            <div
              className="absolute rounded-xl"
              style={{
                left: `${(counterDeskRect.x / STORE_WIDTH) * 100}%`,
                top: `${(counterDeskRect.y / STORE_HEIGHT) * 100}%`,
                width: `${(counterDeskRect.w / STORE_WIDTH) * 100}%`,
                height: `${(counterDeskRect.h / STORE_HEIGHT) * 100}%`,
                border: isNightMode ? "1.5px solid rgba(255,180,0,0.6)" : "1px solid rgba(251,191,36,0.6)",
                background: isNightMode ? "rgba(255,160,0,0.08)" : "rgba(253,230,138,0.4)",
                boxShadow: isNightMode ? "0 0 16px rgba(255,160,0,0.2), inset 0 0 14px rgba(255,160,0,0.06)" : "none"
              }}
            >
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: isNightMode ? "rgba(255,180,0,0.9)" : "rgba(180,120,0,0.85)" }}
              >
                Billing Counter
              </span>
            </div>

            <div
              className="absolute rounded-xl"
              style={{
                left: `${(counterZone.x / STORE_WIDTH) * 100}%`,
                top: `${(counterZone.y / STORE_HEIGHT) * 100}%`,
                width: `${(counterZone.w / STORE_WIDTH) * 100}%`,
                height: `${(counterZone.h / STORE_HEIGHT) * 100}%`,
                border: counterOpen
                  ? isNightMode ? "1.5px dashed rgba(0,200,255,0.7)" : "1.5px dashed rgba(99,102,241,0.7)"
                  : isNightMode ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed rgba(99,102,241,0.2)",
                background: counterOpen
                  ? isNightMode ? "rgba(0,200,255,0.07)" : "rgba(99,102,241,0.06)"
                  : "transparent",
                boxShadow: counterOpen && isNightMode ? "0 0 20px rgba(0,200,255,0.15)" : "none"
              }}
            >
              <span
                className="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: isNightMode ? "rgba(0,200,255,0.7)" : "rgba(99,102,241,0.7)" }}
              >
                Pay Zone
              </span>
            </div>

            <div
              className="absolute rounded-xl"
              style={{
                left: `${(exitGateRect.x / STORE_WIDTH) * 100}%`,
                top: `${(exitGateRect.y / STORE_HEIGHT) * 100}%`,
                width: `${(exitGateRect.w / STORE_WIDTH) * 100}%`,
                height: `${(exitGateRect.h / STORE_HEIGHT) * 100}%`,
                border: gateLocked ? "2px solid rgba(255,50,50,0.8)" : "2px solid rgba(0,255,140,0.75)",
                background: gateLocked ? "rgba(255,40,40,0.08)" : "rgba(0,255,140,0.07)",
                boxShadow: isNightMode
                  ? gateLocked
                    ? "0 0 24px rgba(255,50,50,0.3), inset 0 0 16px rgba(255,50,50,0.08)"
                    : "0 0 24px rgba(0,255,140,0.25), inset 0 0 16px rgba(0,255,140,0.07)"
                  : "none"
              }}
            >
              <span
                className="absolute inset-x-0 top-3 text-center text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: gateLocked ? "rgba(255,80,80,0.9)" : "rgba(0,255,140,0.9)" }}
              >
                Exit
              </span>
              <span
                className="absolute inset-x-0 bottom-3 text-center text-[9px] uppercase tracking-[0.2em]"
                style={{ color: gateLocked ? "rgba(255,80,80,0.6)" : "rgba(0,255,140,0.6)" }}
              >
                {gateLocked ? "Locked" : "Open"}
              </span>
            </div>

            {shelfAssignments.map((shelf) => {
              const isShelfActive = nearestShelf?.id === shelf.id;
              const isOutOfStock = Number(shelf.product?.stockCount) === 0;
              const neon = ZONE_NEON[shelf.zone] || ZONE_NEON.electronics;

              return (
                <MotionDiv
                  key={shelf.id}
                  layout
                  className="absolute overflow-visible rounded-xl"
                  style={{
                    left: `${(shelf.x / STORE_WIDTH) * 100}%`,
                    top: `${(shelf.y / STORE_HEIGHT) * 100}%`,
                    width: `${(shelf.w / STORE_WIDTH) * 100}%`,
                    height: `${(shelf.h / STORE_HEIGHT) * 100}%`,
                    border: isShelfActive
                      ? isNightMode ? `1.5px solid ${neon.border}` : "1.5px solid rgba(99,102,241,0.7)"
                      : isNightMode ? "1px solid rgba(0,200,255,0.1)" : "1px solid rgba(99,102,241,0.2)",
                    background: isShelfActive
                      ? isNightMode ? neon.shelf : "rgba(99,102,241,0.06)"
                      : isNightMode ? "rgba(5,18,40,0.85)" : "rgba(255,255,255,0.9)",
                    boxShadow: isNightMode
                      ? isShelfActive
                        ? `0 0 18px ${neon.glow}, inset 0 0 12px ${neon.shelf}`
                        : "0 0 8px rgba(0,200,255,0.06)"
                      : "0 4px 12px rgba(15,23,42,0.08)"
                  }}
                >
                  {shelf.product ? (
                    <>
                      <div
                        className="absolute inset-x-1 -top-5 flex items-center justify-between rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]"
                        style={{
                          background: isNightMode ? "rgba(0,8,20,0.88)" : "rgba(15,23,42,0.75)",
                          border: isNightMode ? `1px solid ${neon.border}` : "1px solid rgba(255,255,255,0.1)",
                          color: isNightMode ? neon.border : "rgba(255,255,255,0.9)",
                          boxShadow: isNightMode ? `0 0 8px ${neon.glow}` : "none"
                        }}
                      >
                        <span className="truncate">{shelf.product.category}</span>
                        <span>{currencyFormatter.format(getDiscountedPrice(shelf.product))}</span>
                      </div>

                      <div className="absolute inset-1.5 flex items-center gap-1.5">
                        <ProductImage
                          src={shelf.product.image}
                          alt={shelf.product.name}
                          className="h-full w-14 rounded-lg object-cover"
                          style={{ boxShadow: isNightMode ? `0 0 10px ${neon.glow}` : "0 2px 8px rgba(0,0,0,0.15)" }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold" style={{ color: isNightMode ? "#c8eeff" : "#1e293b" }}>
                            {shelf.product.name}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[9px]" style={{ color: isNightMode ? "rgba(160,210,255,0.5)" : "#64748b" }}>
                            {shelf.product.description}
                          </p>
                        </div>
                      </div>

                      {isOutOfStock && (
                        <div className="absolute inset-x-1.5 top-1/2 z-10 -translate-y-1/2 rotate-[-6deg] rounded-lg border border-red-300/50 bg-red-600/90 px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.26em] text-white"
                          style={{ boxShadow: "0 0 16px rgba(239,68,68,0.5)" }}>
                          Out of Stock
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: isNightMode ? "rgba(0,200,255,0.2)" : "rgba(99,102,241,0.3)" }}
                    >
                      Empty
                    </div>
                  )}
                </MotionDiv>
              );
            })}

            <MotionDiv
              animate={{ x: player.x, y: player.y }}
              transition={{ type: "tween", duration: 0.08, ease: "linear" }}
              className="absolute z-20 flex items-center justify-center rounded-full"
              style={{
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
                background: isNightMode
                  ? "radial-gradient(circle, rgba(0,200,255,0.9) 0%, rgba(0,120,220,0.8) 100%)"
                  : "radial-gradient(circle, #6c63ff 0%, #4338ca 100%)",
                border: "2px solid rgba(255,255,255,0.9)",
                boxShadow: isNightMode
                  ? "0 0 0 4px rgba(0,200,255,0.2), 0 0 20px rgba(0,200,255,0.6), 0 0 40px rgba(0,200,255,0.25)"
                  : "0 0 0 4px rgba(108,99,255,0.2), 0 6px 20px rgba(108,99,255,0.4)"
              }}
            >
              <div
                className="absolute -bottom-6 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-white"
                style={{
                  background: isNightMode ? "rgba(0,200,255,0.25)" : "rgba(0,0,0,0.65)",
                  border: isNightMode ? "1px solid rgba(0,200,255,0.4)" : "none"
                }}
              >
                You
              </div>
              <div className="h-2 w-2 rounded-full bg-white" style={{ boxShadow: "0 0 6px rgba(255,255,255,0.8)" }} />
            </MotionDiv>

            <AnimatePresence>
              {nearestShelf?.product && (
                <motion.div
                  key={nearestShelf.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  className="
                    absolute z-30
                    left-3 right-3 top-auto bottom-3
                    sm:left-auto sm:right-3 sm:top-3 sm:bottom-auto sm:w-[320px]
                    w-auto max-w-[calc(100%-1.5rem)]
                    rounded-2xl p-4 text-white
                  "
                  style={{
                    background: isNightMode
                      ? "linear-gradient(135deg, rgba(2,12,28,0.97) 0%, rgba(5,18,40,0.95) 100%)"
                      : "rgba(255,255,255,0.96)",
                    border: isNightMode ? "1px solid rgba(0,200,255,0.25)" : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: isNightMode
                      ? "0 0 30px rgba(0,200,255,0.15), 0 20px 60px rgba(0,0,0,0.6)"
                      : "0 20px 60px rgba(0,0,0,0.35)",
                    backdropFilter: "blur(20px)"
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: isNightMode ? "#00ff8c" : "#34d399" }}>
                    Nearby Shelf
                  </p>
                  <div className="mt-2.5 flex gap-2.5">
                    <ProductImage
                      src={nearestShelf.product.image}
                      alt={nearestShelf.product.name}
                      className="h-16 w-16 rounded-xl object-cover"
                      style={{ boxShadow: isNightMode ? "0 0 12px rgba(0,200,255,0.2)" : "none" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{nearestShelf.product.name}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "rgba(160,210,255,0.6)" }}>
                        {nearestShelf.product.category}
                      </p>
                      <p className="mt-1.5 text-base font-black" style={{ color: isNightMode ? "#00c8ff" : "#818cf8" }}>
                        {currencyFormatter.format(getDiscountedPrice(nearestShelf.product))}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-5" style={{ color: "rgba(160,210,255,0.6)" }}>
                    {nearestShelf.product.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToBucket(nearestShelf.product)}
                      disabled={Number(nearestShelf.product.stockCount) === 0}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        background: isNightMode
                          ? "linear-gradient(135deg, rgba(0,150,255,0.9), rgba(0,200,255,0.7))"
                          : "linear-gradient(135deg, #6c63ff, #4338ca)",
                        boxShadow: isNightMode ? "0 0 16px rgba(0,200,255,0.35)" : "none"
                      }}
                    >
                      Add to Bucket
                    </button>
                    <Link
                      to={`/products/${nearestShelf.product._id}`}
                      className="rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={{
                        borderColor: "rgba(255,255,255,0.15)",
                        color: "rgba(200,230,255,0.8)",
                        background: "rgba(255,255,255,0.05)"
                      }}
                    >
                      Open
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className="absolute bottom-3 right-3 z-20 rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{
                background: isNightMode ? "rgba(0,8,20,0.75)" : "rgba(0,0,0,0.5)",
                border: isNightMode ? "1px solid rgba(0,200,255,0.15)" : "1px solid rgba(255,255,255,0.1)",
                color: isNightMode ? "rgba(0,200,255,0.7)" : "rgba(255,255,255,0.7)",
                backdropFilter: "blur(12px)"
              }}
            >
              Move: WASD / Arrows
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="rounded-2xl border p-4"
            style={{
              borderColor: isNightMode ? "rgba(0,200,255,0.15)" : "rgba(99,102,241,0.2)",
              background: isNightMode ? "rgba(2,10,25,0.9)" : "white",
              boxShadow: isNightMode ? "0 0 24px rgba(0,200,255,0.06), inset 0 1px 0 rgba(0,200,255,0.08)" : "0 4px 12px rgba(0,0,0,0.06)"
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: isNightMode ? "#00c8ff" : "#6c63ff" }}>
                  Minimap
                </p>
                <p className={`mt-1 text-xs ${mutedText}`}>Counter aur exit ki position track kariye.</p>
              </div>
              <Map size={16} style={{ color: isNightMode ? "#00c8ff" : "#6c63ff" }} />
            </div>

            <div
              className="relative mt-3 overflow-hidden rounded-xl p-2"
              style={{
                background: isNightMode ? "rgba(2,8,18,0.95)" : "#f1f5f9",
                border: isNightMode ? "1px solid rgba(0,200,255,0.1)" : "1px solid rgba(99,102,241,0.15)"
              }}
            >
              <div className="relative mx-auto" style={{ width: STORE_WIDTH * minimapScale, height: STORE_HEIGHT * minimapScale, maxWidth: "100%" }}>
                <div className="absolute inset-0 rounded-lg" style={{ background: isNightMode ? "#020b18" : "white" }} />
                {floorZones.map((zone) => (
                  <div
                    key={`mini-${zone.id}`}
                    className="absolute rounded-lg opacity-85"
                    style={{
                      left: zone.x * minimapScale,
                      top: zone.y * minimapScale,
                      width: zone.w * minimapScale,
                      height: zone.h * minimapScale,
                      background: zone.background,
                      border: isNightMode ? `1px solid ${zone.neonColor}` : "1px solid rgba(99,102,241,0.2)"
                    }}
                  />
                ))}
                <div
                  className="absolute animate-pulse rounded"
                  style={{
                    left: flashSaleZone.x * minimapScale,
                    top: flashSaleZone.y * minimapScale,
                    width: flashSaleZone.w * minimapScale,
                    height: flashSaleZone.h * minimapScale,
                    border: "1px dashed rgba(255,60,60,0.7)",
                    background: "rgba(255,40,40,0.08)"
                  }}
                />
                {shelfAssignments.map((shelf) => {
                  const neon = ZONE_NEON[shelf.zone] || ZONE_NEON.electronics;
                  return (
                    <div
                      key={`mini-shelf-${shelf.id}`}
                      className="absolute rounded-sm"
                      style={{
                        left: shelf.x * minimapScale,
                        top: shelf.y * minimapScale,
                        width: shelf.w * minimapScale,
                        height: shelf.h * minimapScale,
                        background: shelf.product
                          ? isNightMode ? neon.border : "rgba(99,102,241,0.6)"
                          : isNightMode ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.15)"
                      }}
                    />
                  );
                })}
                <div
                  className="absolute rounded"
                  style={{
                    left: counterDeskRect.x * minimapScale,
                    top: counterDeskRect.y * minimapScale,
                    width: counterDeskRect.w * minimapScale,
                    height: counterDeskRect.h * minimapScale,
                    background: isNightMode ? "rgba(255,180,0,0.7)" : "rgba(251,191,36,0.7)"
                  }}
                />
                <div
                  className="absolute rounded"
                  style={{
                    left: exitGateRect.x * minimapScale,
                    top: exitGateRect.y * minimapScale,
                    width: exitGateRect.w * minimapScale,
                    height: exitGateRect.h * minimapScale,
                    border: gateLocked ? "1px solid rgba(255,50,50,0.8)" : "1px solid rgba(0,255,140,0.7)",
                    background: gateLocked ? "rgba(255,40,40,0.15)" : "rgba(0,255,140,0.12)"
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    left: player.x * minimapScale,
                    top: player.y * minimapScale,
                    width: PLAYER_SIZE * minimapScale,
                    height: PLAYER_SIZE * minimapScale,
                    background: isNightMode ? "#00c8ff" : "#6c63ff",
                    boxShadow: isNightMode ? "0 0 6px rgba(0,200,255,0.8)" : "none"
                  }}
                />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {counterOpen ? (
              <motion.div
                key="counter-panel"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: isNightMode ? "rgba(255,180,0,0.25)" : "rgba(251,191,36,0.4)",
                  background: isNightMode ? "rgba(2,10,25,0.9)" : "white",
                  boxShadow: isNightMode ? "0 0 24px rgba(255,180,0,0.08)" : "0 4px 12px rgba(0,0,0,0.06)"
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: isNightMode ? "rgba(255,180,0,0.9)" : "#b45309" }}>
                  Billing Counter
                </p>
                <h2 className="mt-2 text-xl font-black" style={{ color: isNightMode ? "#e0f4ff" : "#1e293b" }}>
                  Bucket Summary
                </h2>

                {cartItems.length === 0 ? (
                  <div
                    className="mt-3 rounded-xl border p-3 text-xs"
                    style={{
                      borderColor: isNightMode ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.15)",
                      background: isNightMode ? "rgba(255,255,255,0.03)" : "#f8faff",
                      color: isNightMode ? "rgba(160,210,255,0.5)" : "#64748b"
                    }}
                  >
                    Bucket empty hai. Kisi shelf ke paas jaakar products add kariye.
                  </div>
                ) : (
                  <>
                    <div className="mt-3 space-y-2.5">
                      {cartItems.map((item) => (
                        <div
                          key={item._id}
                          className="rounded-xl border p-3"
                          style={{
                            borderColor: isNightMode ? "rgba(0,200,255,0.1)" : "rgba(99,102,241,0.15)",
                            background: isNightMode ? "rgba(0,200,255,0.04)" : "#f8faff"
                          }}
                        >
                          <div className="flex gap-2.5">
                            <ProductImage
                              src={item.image}
                              alt={item.name}
                              className="h-14 w-14 rounded-xl object-cover"
                              style={{ boxShadow: isNightMode ? "0 0 10px rgba(0,200,255,0.15)" : "none" }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold" style={{ color: isNightMode ? "#c8eeff" : "#1e293b" }}>
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-xs" style={{ color: isNightMode ? "rgba(0,200,255,0.6)" : "#64748b" }}>
                                {currencyFormatter.format(getDiscountedPrice(item))} × {item.quantity}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                                  style={{
                                    background: isNightMode ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                                    color: isNightMode ? "#c8eeff" : "#475569",
                                    border: isNightMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)"
                                  }}
                                >
                                  −1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item._id)}
                                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                                  style={{
                                    background: isNightMode ? "rgba(255,50,50,0.1)" : "rgba(254,226,226,0.8)",
                                    color: isNightMode ? "#ff6060" : "#dc2626",
                                    border: isNightMode ? "1px solid rgba(255,50,50,0.2)" : "1px solid rgba(254,202,202,0.8)"
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      className="mt-3 rounded-xl border p-3"
                      style={{
                        borderColor: isNightMode ? "rgba(0,200,255,0.1)" : "rgba(99,102,241,0.15)",
                        background: isNightMode ? "rgba(0,200,255,0.04)" : "#f8faff"
                      }}
                    >
                      <div className="flex items-center justify-between text-xs" style={{ color: isNightMode ? "rgba(160,210,255,0.6)" : "#64748b" }}>
                        <span>Subtotal</span>
                        <span style={{ color: isNightMode ? "#c8eeff" : "#1e293b" }}>{currencyFormatter.format(subtotal)}</span>
                      </div>
                      {bundleDiscountAmount > 0 && (
                        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: isNightMode ? "#00c8ff" : "#6c63ff" }}>
                          <span>Bundle Discount</span>
                          <span>− {currencyFormatter.format(bundleDiscountAmount)}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: isNightMode ? "#00c8ff" : "#6c63ff" }}>
                          <span>Coupon Discount</span>
                          <span>− {currencyFormatter.format(discountAmount)}</span>
                        </div>
                      )}
                      <div
                        className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-black"
                        style={{
                          borderColor: isNightMode ? "rgba(0,200,255,0.1)" : "rgba(99,102,241,0.15)",
                          color: isNightMode ? "#00c8ff" : "#1e293b"
                        }}
                      >
                        <span>Total</span>
                        <span>{currencyFormatter.format(totalAmount)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePayNow}
                      disabled={isProcessingPayment}
                      className="mt-3 w-full rounded-xl py-3 text-sm font-black uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: isNightMode
                          ? "linear-gradient(135deg, rgba(0,150,255,0.95), rgba(0,200,255,0.8))"
                          : "linear-gradient(135deg, #6c63ff, #4338ca)",
                        boxShadow: isNightMode
                          ? "0 0 24px rgba(0,200,255,0.4), 0 8px 20px rgba(0,0,0,0.4)"
                          : "0 4px 14px rgba(108,99,255,0.35)"
                      }}
                    >
                      {isProcessingPayment ? "Processing..." : "Pay Now"}
                    </button>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="tips-panel"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: isNightMode ? "rgba(0,200,255,0.15)" : "rgba(99,102,241,0.2)",
                  background: isNightMode ? "rgba(2,10,25,0.9)" : "white",
                  boxShadow: isNightMode ? "0 0 24px rgba(0,200,255,0.06)" : "0 4px 12px rgba(0,0,0,0.06)"
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: isNightMode ? "#00c8ff" : "#6c63ff" }}>
                  Store Tips
                </p>
                <div className="mt-3 space-y-2.5 text-xs leading-5">
                  {[
                    "Shelf ke paas jaate hi product popup open ho jayega. Wahi se Add to Bucket ya Open Product kar sakte hain.",
                    "Counter zone me enter karte hi bucket summary aur payment panel show hoga.",
                    "Mobile par neeche D-pad buttons milenge. Desktop par WASD ya arrow keys use karein."
                  ].map((tip, i) => (
                    <div
                      key={i}
                      className="flex gap-2.5 rounded-xl border p-3"
                      style={{
                        borderColor: isNightMode ? "rgba(0,200,255,0.08)" : "rgba(99,102,241,0.12)",
                        background: isNightMode ? "rgba(0,200,255,0.03)" : "#f8faff",
                        color: isNightMode ? "rgba(160,210,255,0.65)" : "#475569"
                      }}
                    >
                      <span style={{ color: isNightMode ? "#00c8ff" : "#6c63ff", fontWeight: 700 }}>
                        0{i + 1}
                      </span>
                      {tip}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <AssistantMiniBot message={assistantMessage} active={Boolean(nearestShelf || counterOpen)} />

      <div className="fixed bottom-5 right-5 z-20 flex flex-col items-center gap-2 sm:hidden">
        <div
          className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{
            background: isNightMode ? "rgba(0,8,20,0.85)" : "rgba(0,0,0,0.6)",
            border: isNightMode ? "1px solid rgba(0,200,255,0.25)" : "1px solid rgba(255,255,255,0.1)",
            color: isNightMode ? "rgba(0,200,255,0.8)" : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(12px)"
          }}
        >
          Touch Controls
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { dir: null },
            { dir: "up", Icon: ArrowUp },
            { dir: null },
            { dir: "left", Icon: ArrowLeft },
            { dir: "down", Icon: ArrowDown },
            { dir: "right", Icon: ArrowRight }
          ].map((btn, i) => btn.dir ? (
            <button
              key={i}
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: isNightMode ? "rgba(0,200,255,0.12)" : "rgba(108,99,255,0.12)",
                border: isNightMode ? "1px solid rgba(0,200,255,0.3)" : "1px solid rgba(108,99,255,0.3)",
                color: isNightMode ? "#00c8ff" : "#6c63ff",
                boxShadow: isNightMode ? "0 0 12px rgba(0,200,255,0.15)" : "none",
                backdropFilter: "blur(12px)"
              }}
              onPointerDown={(e) => { e.preventDefault(); setMovementState(btn.dir, true); }}
              onPointerUp={() => setMovementState(btn.dir, false)}
              onPointerLeave={() => setMovementState(btn.dir, false)}
              onPointerCancel={() => setMovementState(btn.dir, false)}
            >
              <btn.Icon size={16} />
            </button>
          ) : <span key={i} />)}
        </div>
      </div>

      {loading && (
        <div
          className="rounded-2xl border p-4 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{
            borderColor: isNightMode ? "rgba(0,200,255,0.1)" : "rgba(99,102,241,0.15)",
            background: isNightMode ? "rgba(0,200,255,0.04)" : "white",
            color: isNightMode ? "rgba(0,200,255,0.6)" : "#64748b"
          }}
        >
          Loading catalog shelves from the database...
        </div>
      )}
    </main>
  );
};

export default VirtualStore;