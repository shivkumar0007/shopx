import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  ImagePlus,
  Mic,
  Search,
  ShoppingBag,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ProductImage from "./ProductImage.jsx";
import ThemeToggleButton from "./ThemeToggleButton.jsx";
import { useApp } from "../context/AppContext.jsx";

const navLinkClass = ({ isActive }) =>
  `transition-colors ${isActive ? "text-accent" : "text-text hover:text-accent"}`;

const stripExtension = (fileName = "") => fileName.replace(/\.[^/.]+$/, "");

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image."));
    };

    image.src = objectUrl;
  });

const canvasToDataUrl = (canvas, quality = 0.82) =>
  new Promise((resolve, reject) => {
    try {
      resolve(canvas.toDataURL("image/jpeg", quality));
    } catch (error) {
      reject(error);
    }
  });

const prepareImageForSearch = async (file) => {
  const image = await loadImageElement(file);
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported in this browser.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  let dataUrl = await canvasToDataUrl(canvas, 0.82);
  let base64Length = dataUrl.split(",")[1]?.length || 0;

  if (base64Length > 3_500_000) {
    dataUrl = await canvasToDataUrl(canvas, 0.68);
    base64Length = dataUrl.split(",")[1]?.length || 0;
  }

  if (base64Length > 4_500_000) {
    throw new Error("Image is still too large after compression.");
  }

  return {
    previewUrl: dataUrl,
    imageData: dataUrl.split(",")[1],
    mimeType: "image/jpeg"
  };
};

const Navbar = () => {
  const {
    api,
    products,
    cartItems,
    wishlistItems,
    searchQuery,
    setSearchQuery,
    user,
    logout
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const recognitionRef = useRef(null);
  const searchContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [isImageSearching, setIsImageSearching] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState([]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return products
      .filter((product) =>
        [product.name, product.description, product.category].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedQuery)
        )
      )
      .slice(0, 8);
  }, [products, searchQuery]);

  const visibleResults = imageSearchResults.length > 0 ? imageSearchResults : filteredProducts;

  const openSearchExperience = () => {
    if (location.pathname !== "/") {
      navigate("/");
    }
    setIsSearchOpen(true);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice search is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();

        setImageSearchResults([]);
        setSearchQuery(transcript);
        openSearchExperience();
      };

      recognitionRef.current = recognition;
    }

    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const handleTextSearch = (value) => {
    setSearchQuery(value);
    setImageSearchResults([]);
    openSearchExperience();
  };

  const handleProductSelect = (productId) => {
    setIsSearchOpen(false);
    navigate(`/products/${productId}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setImageSearchResults([]);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsSearchOpen(false);
  };

  const handleImageSearch = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    try {
      setIsImageSearching(true);
      const preparedImage = await prepareImageForSearch(file);

      const { data } = await api.post("/ai/image-search", {
        imageData: preparedImage.imageData,
        mimeType: preparedImage.mimeType
      });

      const detectedSearch = data?.searchText?.trim() || stripExtension(file.name);

      setSearchQuery(detectedSearch);
      setImagePreview(preparedImage.previewUrl);
      setImageSearchResults(Array.isArray(data?.relatedProducts) ? data.relatedProducts : []);
      openSearchExperience();
      toast.success(`Image search ready for "${detectedSearch}"`);
    } catch (error) {
      setImagePreview("");
      setImageSearchResults([]);
      toast.error(
        error?.response?.data?.message || error?.message || "Image search failed. Please try another image."
      );
    } finally {
      setIsImageSearching(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-8 py-5">
        <Link to="/" className="text-xl font-medium tracking-tight text-text">
          Shopx
        </Link>

        <div ref={searchContainerRef} className="relative hidden flex-1 items-center justify-center md:flex">
          <div className="w-full max-w-2xl">
            <div className="flex w-full items-center gap-2 rounded-[2rem] border border-border bg-card px-4 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <Search size={16} className="text-text/70" />

              {imagePreview && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-2 py-1">
                  <img src={imagePreview} alt="Search preview" className="h-7 w-7 rounded-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview("");
                      setImageSearchResults([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-text/55 transition hover:text-text"
                    aria-label="Remove uploaded image"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <input
                value={searchQuery}
                onFocus={openSearchExperience}
                onChange={(event) => handleTextSearch(event.target.value)}
                className="w-full bg-transparent px-1 text-sm font-normal text-text outline-none placeholder:text-text/55"
                placeholder="Search products, brands, and styles"
              />

              {(searchQuery || imagePreview) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="icon-pill border border-border p-1.5 hover:bg-bg"
                  aria-label="Clear search"
                >
                  <X size={14} className="text-text/75" />
                </button>
              )}

              {isListening && (
                <div className="mr-1 flex items-end gap-0.5" aria-label="Listening">
                  <span className="voice-wave h-2 w-0.5 rounded-full bg-accent" />
                  <span className="voice-wave h-3 w-0.5 rounded-full bg-accent [animation-delay:120ms]" />
                  <span className="voice-wave h-2 w-0.5 rounded-full bg-accent [animation-delay:240ms]" />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSearch}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImageSearching}
                className="icon-pill border border-border p-1.5 hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Search by image"
              >
                <ImagePlus size={14} className="text-text/80" />
              </button>

              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`icon-pill border p-1.5 ${
                  isListening ? "border-accent bg-accent/15" : "border-border hover:bg-bg"
                }`}
                aria-label="Search by voice"
              >
                <Mic size={14} className="text-text/80" />
              </button>
            </div>

            {isSearchOpen && (searchQuery.trim() || imagePreview) && (
              <div className="absolute left-1/2 top-[calc(100%+0.75rem)] w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-[1.75rem] border border-border bg-bg/98 shadow-[0_25px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                <div className="border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-text/50">
                  {isImageSearching ? "Analyzing image..." : "Search Results"}
                </div>

                {!isImageSearching && visibleResults.length > 0 && (
                  <div className="max-h-[28rem] overflow-y-auto p-2">
                    {visibleResults.map((product) => (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => handleProductSelect(product._id)}
                        className="flex w-full items-center gap-4 rounded-[1.4rem] px-3 py-3 text-left transition hover:bg-card"
                      >
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">{product.name}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-text/60">{product.description}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-text/55">
                            <span>{product.category}</span>
                            <span className="h-1 w-1 rounded-full bg-text/20" />
                            <span className="font-medium text-accent">Rs. {product.price}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!isImageSearching && visibleResults.length === 0 && (
                  <div className="px-5 py-6 text-sm text-text/65">
                    No matching products found. Try another keyword, voice search, or upload a clearer product image.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-4 text-sm font-normal md:flex">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/cart" className={navLinkClass}>
              Cart
            </NavLink>
            <NavLink to="/wishlist" className={navLinkClass}>
              Wishlist
            </NavLink>
            {user && (
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
            {!user && (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>
                <NavLink to="/register" className={navLinkClass}>
                  Register
                </NavLink>
              </>
            )}
          </nav>
          <Link to="/wishlist" className="icon-pill relative border border-border p-2.5">
            <Heart size={18} className="text-text" />
            {wishlistItems.length > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-xs text-white">
                {wishlistItems.length}
              </span>
            )}
          </Link>
          <Link to="/cart" className="icon-pill relative border border-border p-2.5">
            <ShoppingBag size={18} className="text-text" />
            {cartItems.length > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-xs text-white">
                {cartItems.length}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="hidden pill-button bg-bg text-text md:inline-flex">
                Profile
              </Link>
              <button onClick={logout} className="hidden pill-button bg-bg text-text md:inline-flex">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden pill-button bg-bg text-text md:inline-flex">
                Login
              </Link>
              <Link to="/register" className="hidden pill-button bg-accent text-white md:inline-flex">
                Register
              </Link>
            </>
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
