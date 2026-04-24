import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CreditCard,
  Map,
  ShoppingBasket,
  Sparkles,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import VirtualMallScene from "../components/virtual-store/VirtualMallScene.jsx";
import {
  BILLING_ZONE,
  EXIT_GATE_ZONE,
  FLASH_SALE_ZONE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_START,
  PRODUCT_INTERACTION_DISTANCE,
  SECTION_ZONES,
  STORE_HINTS,
  WORLD_BOUNDS,
  buildMallDisplays,
  buildMallObstaclesFromDisplays,
  buildMinimapSections,
  clamp,
  circleIntersectsRect,
  distanceBetween,
  getPlayerMinimapPosition,
  isPointInsideCircle,
  isPointInsideRect
} from "../components/virtual-store/virtualMallConfig.js";
import { useApp } from "../context/useApp.jsx";
import { getDiscountedPrice, isFlashSaleActive } from "../utils/pricing.js";

const normalizeMovementKey = (key) => {
  const normalizedKey = String(key || "").toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(normalizedKey)) {
    return normalizedKey;
  }
  return "";
};

const movePlayerWithCollisions = (position, delta, obstacles) => {
  let next = position;
  const attemptMove = (candidate) =>
    obstacles.some((obstacle) => circleIntersectsRect(candidate, PLAYER_RADIUS, obstacle));

  const boundedX = clamp(position.x + delta.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
  const candidateX = { x: boundedX, y: position.y };
  if (!attemptMove(candidateX)) {
    next = candidateX;
  }

  const boundedY = clamp(next.y + delta.y, WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY);
  const candidateY = { x: next.x, y: boundedY };
  if (!attemptMove(candidateY)) {
    next = candidateY;
  }

  return next;
};

const DialogShell = ({ title, eyebrow, onClose, children }) => (
  <div className="virtual-mall-dialog-backdrop" role="presentation" onClick={onClose}>
    <section className="virtual-mall-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <div className="virtual-mall-dialog__header">
        <div>
          {eyebrow ? <p className="virtual-mall-dialog__eyebrow">{eyebrow}</p> : null}
          <h2 className="virtual-mall-dialog__title">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="virtual-mall-dialog__close" aria-label="Close panel">
          <X size={18} />
        </button>
      </div>
      <div className="virtual-mall-dialog__content">{children}</div>
    </section>
  </div>
);

const Minimap = ({ player }) => {
  const sections = buildMinimapSections();
  const playerDot = getPlayerMinimapPosition(player);

  return (
    <div className="virtual-mall-minimap">
      <div className="virtual-mall-minimap__header">
        <Map size={15} />
        <span>Live Minimap</span>
      </div>
      <svg viewBox="0 0 100 72" className="virtual-mall-minimap__canvas" aria-label="Store minimap">
        <rect x="2" y="2" width="96" height="68" rx="6" className="virtual-mall-minimap__frame" />
        {sections.map((section) =>
          section.r ? (
            <circle
              key={section.label}
              cx={section.x + section.r}
              cy={section.y + section.r}
              r={section.r}
              fill={`${section.color}22`}
              stroke={section.color}
              strokeWidth="1.5"
            />
          ) : (
            <rect
              key={section.label}
              x={section.x}
              y={section.y}
              width={section.w}
              height={section.h}
              rx="2"
              fill={`${section.color}20`}
              stroke={section.color}
              strokeWidth="1.5"
            />
          )
        )}
        <circle cx={playerDot.x} cy={playerDot.y} r="2.8" className="virtual-mall-minimap__player" />
      </svg>
    </div>
  );
};

const Dpad = ({ onToggle }) => {
  const bind = (key) => ({
    onPointerDown: () => onToggle(key, true),
    onPointerUp: () => onToggle(key, false),
    onPointerLeave: () => onToggle(key, false),
    onPointerCancel: () => onToggle(key, false)
  });

  return (
    <div className="virtual-mall-mobile-controls">
      <div className="virtual-mall-mobile-controls__row is-center">
        <button type="button" className="virtual-store-dpad" aria-label="Move up" {...bind("arrowup")}>
          <ArrowUp size={16} />
        </button>
      </div>
      <div className="virtual-mall-mobile-controls__row">
        <button type="button" className="virtual-store-dpad" aria-label="Move left" {...bind("arrowleft")}>
          <ArrowLeft size={16} />
        </button>
        <button type="button" className="virtual-store-dpad" aria-label="Move down" {...bind("arrowdown")}>
          <ArrowUp size={16} className="rotate-180" />
        </button>
        <button type="button" className="virtual-store-dpad" aria-label="Move right" {...bind("arrowright")}>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const VirtualStore = () => {
  const navigate = useNavigate();
  const {
    products,
    loading,
    cartItems,
    subtotal,
    bundleDiscountAmount,
    discountAmount,
    totalAmount,
    addToCart,
    removeFromCart,
    updateQuantity,
    startPayment,
    user
  } = useApp();

  const [player, setPlayer] = useState(PLAYER_START);
  const [activePanel, setActivePanel] = useState({ type: "", payload: null });
  const [activeDisplayId, setActiveDisplayId] = useState("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const pressedKeysRef = useRef(new Set());
  const moveTargetRef = useRef(null);
  const previousZoneStateRef = useRef({
    flash: false,
    billing: false,
    exit: false
  });
  const exitTimeoutRef = useRef(0);

  const displays = useMemo(() => buildMallDisplays(products), [products]);
  const obstacles = useMemo(() => buildMallObstaclesFromDisplays(displays), [displays]);
  const flashSaleProducts = useMemo(
    () => products.filter((product) => Number(product.stockCount || 0) > 0 && isFlashSaleActive(product)),
    [products]
  );

  const nearbyDisplay = useMemo(() => {
    const candidates = displays
      .filter((display) => display.product)
      .map((display) => ({
        display,
        distance: distanceBetween(player, { x: display.x, y: display.y })
      }))
      .filter((entry) => entry.distance <= PRODUCT_INTERACTION_DISTANCE)
      .sort((entryA, entryB) => entryA.distance - entryB.distance);

    return candidates[0]?.display || null;
  }, [displays, player]);

  const currentZoneLabel = useMemo(() => {
    if (isPointInsideCircle(player, FLASH_SALE_ZONE)) return "Flash Sale Ring";
    if (isPointInsideRect(player, BILLING_ZONE)) return "Billing Counter";
    if (isPointInsideRect(player, EXIT_GATE_ZONE)) return "Exit Portal";

    const section = Object.values(SECTION_ZONES).find((zone) => isPointInsideRect(player, zone));
    return section?.label || "Main Aisle";
  }, [player]);

  const setMovementKey = (key, isPressed) => {
    const normalizedKey = normalizeMovementKey(key);
    if (!normalizedKey) return;

    if (isPressed) {
      pressedKeysRef.current.add(normalizedKey);
      moveTargetRef.current = null;
    } else {
      pressedKeysRef.current.delete(normalizedKey);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const normalizedKey = normalizeMovementKey(event.key);
      if (!normalizedKey) return;
      event.preventDefault();
      setMovementKey(normalizedKey, true);
    };

    const handleKeyUp = (event) => {
      const normalizedKey = normalizeMovementKey(event.key);
      if (!normalizedKey) return;
      event.preventDefault();
      setMovementKey(normalizedKey, false);
    };

    const handleBlur = () => {
      pressedKeysRef.current.clear();
      moveTargetRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();

    const tick = (now) => {
      const deltaSeconds = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;

      setPlayer((currentPosition) => {
        const activeKeys = pressedKeysRef.current;
        let direction = { x: 0, y: 0 };

        // Screen-space key mapping keeps the avatar movement intuitive inside the isometric projection.
        if (activeKeys.has("w") || activeKeys.has("arrowup")) {
          direction = { x: direction.x - 1, y: direction.y - 1 };
        }
        if (activeKeys.has("s") || activeKeys.has("arrowdown")) {
          direction = { x: direction.x + 1, y: direction.y + 1 };
        }
        if (activeKeys.has("a") || activeKeys.has("arrowleft")) {
          direction = { x: direction.x - 1, y: direction.y + 1 };
        }
        if (activeKeys.has("d") || activeKeys.has("arrowright")) {
          direction = { x: direction.x + 1, y: direction.y - 1 };
        }

        const directionLength = Math.hypot(direction.x, direction.y);
        if (directionLength > 0) {
          direction = {
            x: (direction.x / directionLength) * PLAYER_SPEED * deltaSeconds,
            y: (direction.y / directionLength) * PLAYER_SPEED * deltaSeconds
          };

          return movePlayerWithCollisions(currentPosition, direction, obstacles);
        }

        if (moveTargetRef.current) {
          const remainingDistance = distanceBetween(currentPosition, moveTargetRef.current);
          if (remainingDistance < 0.15) {
            moveTargetRef.current = null;
            return currentPosition;
          }

          const directionToTarget = {
            x: ((moveTargetRef.current.x - currentPosition.x) / remainingDistance) * PLAYER_SPEED * deltaSeconds,
            y: ((moveTargetRef.current.y - currentPosition.y) / remainingDistance) * PLAYER_SPEED * deltaSeconds
          };

          return movePlayerWithCollisions(currentPosition, directionToTarget, obstacles);
        }

        return currentPosition;
      });

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [obstacles]);

  useEffect(() => {
    const insideFlash = isPointInsideCircle(player, FLASH_SALE_ZONE);
    const insideBilling = isPointInsideRect(player, BILLING_ZONE);
    const insideExit = isPointInsideRect(player, EXIT_GATE_ZONE);
    const previousState = previousZoneStateRef.current;
    const openPanelOnNextFrame = (panel) => {
      window.requestAnimationFrame(() => {
        setActivePanel(panel);
      });
    };

    // Fire zone logic only when the player newly enters an area, not on every animation frame inside it.
    if (insideFlash && !previousState.flash && flashSaleProducts.length > 0) {
      openPanelOnNextFrame({ type: "flash-sale", payload: null });
    }

    if (insideBilling && !previousState.billing) {
      openPanelOnNextFrame({
        type: "checkout",
        payload: cartItems.length > 0 ? null : { emptyBucket: true }
      });
    }

    if (insideExit && !previousState.exit) {
      if (paymentCompleted) {
        openPanelOnNextFrame({
          type: "notice",
          payload: {
            title: "Thank you for shopping",
            message: "Payment verified. Exit portal active hai, aapko homepage par redirect kiya ja raha hai."
          }
        });
        window.clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = window.setTimeout(() => navigate("/"), 1800);
      } else if (cartItems.length > 0) {
        moveTargetRef.current = null;
        window.requestAnimationFrame(() => {
          setPlayer({ x: 3.7, y: 11.6 });
        });
        openPanelOnNextFrame({
          type: "notice",
          payload: {
            title: "Checkout pending",
            message: "Please proceed to Billing Counter to complete your purchase first."
          }
        });
      } else {
        navigate("/");
      }
    }

    previousZoneStateRef.current = {
      flash: insideFlash,
      billing: insideBilling,
      exit: insideExit
    };
  }, [cartItems.length, flashSaleProducts.length, navigate, paymentCompleted, player]);

  useEffect(() => () => window.clearTimeout(exitTimeoutRef.current), []);

  const handleSceneClick = (nextTarget) => {
    const clampedTarget = {
      x: clamp(nextTarget.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX),
      y: clamp(nextTarget.y, WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY)
    };

    moveTargetRef.current = clampedTarget;
  };

  const openDisplayPanel = (display) => {
    setActiveDisplayId(display.id);

    if (!display.product) {
      toast("Shelf sync ho raha hai. Dusra display try karein.");
      return;
    }

    const distanceToDisplay = distanceBetween(player, { x: display.x, y: display.y });
    if (distanceToDisplay > PRODUCT_INTERACTION_DISTANCE) {
      toast.error("Display inspect karne ke liye thoda aur paas aaiye.");
      return;
    }

    setActivePanel({ type: "product", payload: display });
  };

  const handleAddProductToBucket = (product) => {
    addToCart(product);
  };

  const handleStartPayment = async () => {
    if (cartItems.length === 0) {
      toast.error("Bucket empty hai. Pehle items add karein.");
      return;
    }

    try {
      setIsPaying(true);
      await startPayment({
        onSuccess: () => {
          setPaymentCompleted(true);
          setActivePanel({
            type: "notice",
            payload: {
              title: "Payment confirmed",
              message: "Billing complete. Ab Exit Portal se safely mall se bahar nikal sakte hain."
            }
          });
        }
      });
    } finally {
      setIsPaying(false);
    }
  };

  const focusBillingCounter = () => {
    moveTargetRef.current = {
      x: BILLING_ZONE.x + BILLING_ZONE.w / 2,
      y: BILLING_ZONE.y + BILLING_ZONE.h / 2
    };
    setActivePanel({ type: "", payload: null });
  };

  const renderActivePanel = () => {
    if (!activePanel.type) return null;

    if (activePanel.type === "product" && activePanel.payload?.product) {
      const product = activePanel.payload.product;

      return (
        <DialogShell title={product.name} eyebrow={product.category} onClose={() => setActivePanel({ type: "", payload: null })}>
          <div className="virtual-mall-product-panel">
            <img src={product.image} alt={product.name} className="virtual-mall-product-panel__image" />
            <div className="virtual-mall-product-panel__meta">
              <p className="virtual-mall-product-panel__price">Rs. {getDiscountedPrice(product)}</p>
              {isFlashSaleActive(product) ? (
                <span className="virtual-mall-pill is-sale">
                  {product.discountPercentage}% flash sale live
                </span>
              ) : null}
              <p className="virtual-mall-product-panel__description">{product.description}</p>
              <p className="virtual-mall-product-panel__stock">
                {product.stockCount} units available in this aisle
              </p>
              <div className="virtual-mall-dialog__actions">
                <button type="button" className="virtual-mall-button is-primary" onClick={() => handleAddProductToBucket(product)}>
                  Add to Bucket
                </button>
                <Link to={`/products/${product._id}`} className="virtual-mall-button">
                  View Product
                </Link>
              </div>
            </div>
          </div>
        </DialogShell>
      );
    }

    if (activePanel.type === "flash-sale") {
      return (
        <DialogShell title="Flash Sale Zone" eyebrow="Quantum ring activated" onClose={() => setActivePanel({ type: "", payload: null })}>
          {flashSaleProducts.length === 0 ? (
            <p className="virtual-mall-empty-copy">Abhi koi live flash-sale product available nahi hai.</p>
          ) : (
            <div className="virtual-mall-card-list">
              {flashSaleProducts.map((product) => (
                <article key={product._id} className="virtual-mall-card">
                  <img src={product.image} alt={product.name} className="virtual-mall-card__image" />
                  <div className="virtual-mall-card__body">
                    <h3>{product.name}</h3>
                    <p>Rs. {getDiscountedPrice(product)}</p>
                    <p className="virtual-mall-card__copy">{product.description}</p>
                    <button type="button" className="virtual-mall-button is-primary" onClick={() => handleAddProductToBucket(product)}>
                      Add to Bucket
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </DialogShell>
      );
    }

    if (activePanel.type === "cart") {
      return (
        <DialogShell title="Your Bucket" eyebrow="Live cart overlay" onClose={() => setActivePanel({ type: "", payload: null })}>
          {cartItems.length === 0 ? (
            <p className="virtual-mall-empty-copy">Bucket empty hai. Display ke paas walk karke items add karein.</p>
          ) : (
            <>
              <div className="virtual-mall-cart-list">
                {cartItems.map((item) => (
                  <div key={item._id} className="virtual-mall-cart-row">
                    <div>
                      <p className="virtual-mall-cart-row__title">{item.name}</p>
                      <p className="virtual-mall-cart-row__subtitle">Rs. {getDiscountedPrice(item)} each</p>
                    </div>
                    <div className="virtual-mall-cart-row__actions">
                      <button type="button" className="virtual-mall-stepper" onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" className="virtual-mall-stepper" onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                        +
                      </button>
                      <button type="button" className="virtual-mall-link-button" onClick={() => removeFromCart(item._id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="virtual-mall-totals">
                <span>Subtotal</span>
                <strong>Rs. {subtotal}</strong>
              </div>
              {bundleDiscountAmount > 0 ? (
                <div className="virtual-mall-totals is-muted">
                  <span>Bundle Discount</span>
                  <strong>- Rs. {bundleDiscountAmount}</strong>
                </div>
              ) : null}
              {discountAmount > 0 ? (
                <div className="virtual-mall-totals is-muted">
                  <span>Coupon Discount</span>
                  <strong>- Rs. {discountAmount}</strong>
                </div>
              ) : null}
              <div className="virtual-mall-totals is-total">
                <span>Total</span>
                <strong>Rs. {totalAmount}</strong>
              </div>
              <div className="virtual-mall-dialog__actions">
                <button type="button" className="virtual-mall-button is-primary" onClick={focusBillingCounter}>
                  Go to Billing Counter
                </button>
                <Link to="/cart" className="virtual-mall-button">
                  Open Full Cart
                </Link>
              </div>
            </>
          )}
        </DialogShell>
      );
    }

    if (activePanel.type === "checkout") {
      return (
        <DialogShell title="Proceed to Checkout" eyebrow="Billing Counter active" onClose={() => setActivePanel({ type: "", payload: null })}>
          {activePanel.payload?.emptyBucket ? (
            <>
              <p className="virtual-mall-empty-copy">Bucket abhi empty hai. Pehle section shelves se products add karein.</p>
              <div className="virtual-mall-dialog__actions">
                <button type="button" className="virtual-mall-button is-primary" onClick={() => setActivePanel({ type: "", payload: null })}>
                  Continue Shopping
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="virtual-mall-payment-strip">
                <span className="virtual-mall-pill">Razorpay</span>
                <span className="virtual-mall-pill is-alt">Paytm</span>
                <span className="virtual-mall-pill is-soft">Secure Counter</span>
              </div>
              {cartItems.length > 0 ? (
                <div className="virtual-mall-checkout-list">
                  {cartItems.map((item) => (
                    <div key={item._id} className="virtual-mall-checkout-row">
                      <span>{item.name} x {item.quantity}</span>
                      <strong>Rs. {(getDiscountedPrice(item) * item.quantity).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="virtual-mall-empty-copy">Current bucket already cleared hai.</p>
              )}
              <div className="virtual-mall-totals">
                <span>Subtotal</span>
                <strong>Rs. {subtotal}</strong>
              </div>
              {bundleDiscountAmount > 0 ? (
                <div className="virtual-mall-totals is-muted">
                  <span>Bundle Discount</span>
                  <strong>- Rs. {bundleDiscountAmount}</strong>
                </div>
              ) : null}
              {discountAmount > 0 ? (
                <div className="virtual-mall-totals is-muted">
                  <span>Coupon Discount</span>
                  <strong>- Rs. {discountAmount}</strong>
                </div>
              ) : null}
              <div className="virtual-mall-totals is-total">
                <span>Total</span>
                <strong>Rs. {totalAmount}</strong>
              </div>
              {!user ? (
                <div className="virtual-mall-dialog__actions">
                  <Link to="/login" className="virtual-mall-button is-primary">
                    Login to Pay
                  </Link>
                </div>
              ) : paymentCompleted ? (
                <div className="virtual-mall-dialog__actions">
                  <button type="button" className="virtual-mall-button is-primary" onClick={() => setActivePanel({ type: "", payload: null })}>
                    Payment Complete
                  </button>
                </div>
              ) : (
                <div className="virtual-mall-dialog__actions">
                  <button type="button" className="virtual-mall-button is-primary" onClick={handleStartPayment} disabled={isPaying || cartItems.length === 0}>
                    {isPaying ? "Processing..." : "Start Payment"}
                  </button>
                </div>
              )}
            </>
          )}
        </DialogShell>
      );
    }

    if (activePanel.type === "notice") {
      return (
        <DialogShell title={activePanel.payload?.title || "Store Notice"} eyebrow="Virtual mall update" onClose={() => setActivePanel({ type: "", payload: null })}>
          <p className="virtual-mall-empty-copy">{activePanel.payload?.message}</p>
          <div className="virtual-mall-dialog__actions">
            <button type="button" className="virtual-mall-button is-primary" onClick={() => setActivePanel({ type: "", payload: null })}>
              Continue
            </button>
          </div>
        </DialogShell>
      );
    }

    return null;
  };

  return (
    <main className="virtual-mall-shell">
      <div className="virtual-mall-shell__backdrop" />
      <div className="virtual-mall-hud">
        <div className="virtual-mall-hud__topbar">
          <button type="button" className="virtual-mall-chip" onClick={() => navigate("/")}>
            <ArrowLeft size={15} />
            Home
          </button>
          <div className="virtual-mall-chip is-status">
            <Sparkles size={15} />
            {loading ? "Loading catalog..." : `${products.length} products synced`}
          </div>
          <button type="button" className="virtual-mall-chip is-bucket" onClick={() => setActivePanel({ type: "cart", payload: null })}>
            <ShoppingBasket size={15} />
            Bucket
            <span className="virtual-mall-chip__count">{cartItems.length}</span>
          </button>
        </div>

        <div className="virtual-mall-dashboard">
          <section className="virtual-mall-info-card">
            <p className="virtual-mall-info-card__eyebrow">Isometric Virtual Mall</p>
            <h1>Walk, inspect, add to bucket, pay, and exit in one immersive flow.</h1>
            <div className="virtual-mall-info-card__meta">
              <span>Current zone: {currentZoneLabel}</span>
              <span>Player: {player.x.toFixed(1)}, {player.y.toFixed(1)}</span>
            </div>
            <ul className="virtual-mall-hints">
              {STORE_HINTS.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </section>

          <section className="virtual-mall-status-card">
            <div className="virtual-mall-status-card__row">
              <span>Nearby display</span>
              <strong>{nearbyDisplay?.product?.name || "Move closer to a shelf"}</strong>
            </div>
            <div className="virtual-mall-status-card__row">
              <span>Checkout status</span>
              <strong>{paymentCompleted ? "Paid - Exit unlocked" : "Pending"}</strong>
            </div>
            <div className="virtual-mall-status-card__row">
              <span>Total in bucket</span>
              <strong>Rs. {totalAmount}</strong>
            </div>
            <button type="button" className="virtual-mall-button is-primary is-inline" onClick={focusBillingCounter}>
              <CreditCard size={15} />
              Billing Counter
            </button>
          </section>
        </div>
      </div>

      <div className="virtual-mall-content">
        <VirtualMallScene
          player={player}
          displays={displays}
          selectedDisplayId={activeDisplayId}
          nearbyDisplayId={nearbyDisplay?.id || ""}
          onSceneClick={handleSceneClick}
          onDisplaySelect={openDisplayPanel}
        />
      </div>

      <Minimap player={player} />
      <Dpad onToggle={setMovementKey} />
      {renderActivePanel()}
    </main>
  );
};

export default VirtualStore;
