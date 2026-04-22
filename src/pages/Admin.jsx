import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Boxes, ImagePlus, IndianRupee, LoaderCircle, Pencil, Plus, Save, ShoppingCart, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import CouponManager from "../components/CouponManager.jsx";
import { useApp } from "../context/AppContext.jsx";

const MotionArticle = motion.article;
const MotionDiv = motion.div;
const MotionTr = motion.tr;

const initialForm = {
  name: "",
  price: "",
  stockCount: "",
  category: "",
  description: "",
  image: "",
  snapLensId: "",
  isFlashSale: false,
  discountPercentage: "",
  saleDurationHours: "2"
};

const ORDER_ENDPOINTS = [
  import.meta.env.VITE_ADMIN_ORDERS_ENDPOINT,
  "/admin/orders",
  "/orders",
  "/payments/orders",
  "/user/orders"
].filter(Boolean);

const INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

const PANEL_CLASS_NAME =
  "rounded-[1.75rem] border border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.06)]";

const getApiErrorMessage = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || error?.message;
  return message || fallbackMessage;
};

const getOrderCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const isSuccessfulOrder = (order) => {
  const status = `${order?.status || order?.paymentStatus || ""}`.toLowerCase();
  return Boolean(order?.isPaid) || status === "paid" || status === "success";
};

const getOrderAmount = (order) =>
  Number(order?.totalPrice ?? order?.amount ?? order?.total ?? order?.totalAmount ?? 0) || 0;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    })
    : "No sale scheduled";

const fieldLabel = "mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-text/55";

const analyticsMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

const AnalyticsCard = ({ icon: Icon, label, value, helper }) => {
  return (
    <MotionArticle
      {...analyticsMotion}
      className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="mb-4 inline-flex rounded-2xl border border-accent/15 bg-accent/10 p-3 text-accent">
        <Icon size={20} strokeWidth={1.8} /> {/* ✅ */}
      </div>
      <p className="text-sm font-medium text-text/65">{label}</p>
      <p className="mt-2 text-3xl font-medium tracking-tight text-text">{value}</p>
      <p className="mt-2 text-xs text-text/55">{helper}</p>
    </MotionArticle>
  );
};

const UploadPreview = ({ image, className = "h-16 w-16 rounded-2xl" }) => (
  <div className={`overflow-hidden border border-border bg-bg ${className}`}>
    {image ? (
      <img src={image} alt="Uploaded product preview" className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-text/35">
        <ImagePlus size={18} strokeWidth={1.7} />
      </div>
    )}
  </div>
);

const ImageUploadField = ({ id, image, uploading, disabled, onFileSelect, compact = false }) => {
  const labelClassName = compact
    ? "inline-flex items-center gap-2 rounded-full border border-border bg-bg px-4 py-2 text-sm font-medium text-text transition hover:border-accent hover:text-accent"
    : "inline-flex items-center gap-2 rounded-full border border-border bg-bg px-4 py-2.5 text-sm font-medium text-text transition hover:border-accent hover:text-accent";

  return (
    <div
      className={`rounded-[1.5rem] border border-dashed border-accent/30 bg-bg/70 p-4 ${
        compact ? "" : "md:col-span-2"
      }`}
    >
      <div className={`flex gap-4 ${compact ? "items-center" : "flex-col sm:flex-row sm:items-center sm:justify-between"}`}>
        <div className="flex items-center gap-4">
          <UploadPreview image={image} className={compact ? "h-12 w-12 rounded-xl" : "h-16 w-16 rounded-2xl"} />
          <div>
            <p className="text-sm font-medium text-text">
              {image ? "Image ready to use" : "Upload product image"}
            </p>
            <p className="text-xs text-text/55">
              {compact ? "PNG, JPG or WEBP" : "Cloudinary upload with secure URL sync"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor={id}
            className={`${labelClassName} ${disabled ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          >
            {uploading ? (
              <LoaderCircle size={16} strokeWidth={1.7} className="animate-spin" />
            ) : (
              <UploadCloud size={16} strokeWidth={1.7} />
            )}
            {uploading ? "Saving..." : compact ? "Change" : "Upload Image"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              onFileSelect(file);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <p className="mt-3 truncate text-xs text-text/50">
        {image || "No image uploaded yet. The secure Cloudinary URL will appear here after upload."}
      </p>
    </div>
  );
};

const ProductImageCell = ({ image, name }) => (
  <div className="flex items-center gap-3">
    <UploadPreview image={image} className="h-12 w-12 rounded-xl" />
    <span className="max-w-[180px] truncate text-xs text-text/60">{image || `${name} image`}</span>
  </div>
);

const Admin = () => {
  const { api, orders, products, fetchProducts, user, setUser } = useApp();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState("");
  const [backendOrders, setBackendOrders] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const dashboardOrders = backendOrders ?? orders;
  const dashboardHelper = ordersLoading
    ? "Syncing live order data"
    : backendOrders
      ? "Pulled from backend"
      : "Using current app history";

  const dashboardMetrics = useMemo(() => {
    const successfulRevenue = dashboardOrders.reduce(
      (sum, order) => (isSuccessfulOrder(order) ? sum + getOrderAmount(order) : sum),
      0
    );

    return {
      totalRevenue: formatCurrency(successfulRevenue),
      totalProducts: products.length,
      lowStock: products.filter((product) => Number(product.stockCount ?? 0) < 5).length,
      totalOrders: dashboardOrders.length
    };
  }, [dashboardOrders, products]);

  useEffect(() => {
    let ignore = false;

    const loadBackendOrders = async () => {
      if (!user?.token || ORDER_ENDPOINTS.length === 0) {
        setBackendOrders(null);
        setOrdersLoading(false);
        return;
      }

      setOrdersLoading(true);

      for (const endpoint of ORDER_ENDPOINTS) {
        try {
          const { data } = await api.get(endpoint);
          if (!ignore) {
            setBackendOrders(getOrderCollection(data));
          }
          return;
        } catch (error) {
          const status = error?.response?.status;
          if (status && ![404, 405].includes(status)) {
            break;
          }
        }
      }

      if (!ignore) {
        setBackendOrders(null);
      }
    };

    loadBackendOrders().finally(() => {
      if (!ignore) {
        setOrdersLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [api, user?.token]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const buildArPayload = (payload) => ({
    ...payload,
    snapLensId: payload.snapLensId?.trim() || "",
    isArEnabled: Boolean(payload.snapLensId?.trim())
  });

  const handleAdminRequestError = (error, fallbackMessage) => {
    const status = error?.response?.status;
    const message = getApiErrorMessage(error, fallbackMessage);

    if (status === 401 || status === 403) {
      setUser(null);
      toast.error("Session expired or admin access missing. Please login again.");
      return;
    }

    toast.error(message);
  };

  const handleImageUpload = async (file, target = "create") => {
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const folder = import.meta.env.VITE_CLOUDINARY_FOLDER;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary config missing. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.");
      return;
    }

    setUploadingTarget(target);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("upload_preset", uploadPreset);
      if (folder) uploadData.append("folder", folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: uploadData
      });

      const data = await response.json();

      if (!response.ok || !data?.secure_url) {
        throw new Error(data?.error?.message || "Unable to upload image.");
      }

      if (target === "edit") {
        setEditingForm((prev) => ({ ...prev, image: data.secure_url }));
      } else {
        setForm((prev) => ({ ...prev, image: data.secure_url }));
      }

      toast.success("Image uploaded successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Image upload failed."));
    } finally {
      setUploadingTarget("");
    }
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!user?.token) return;

    if (!form.image.trim()) {
      toast.error("Please upload a product image before saving.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/products", buildArPayload({
        ...form,
        price: Number(form.price),
        stockCount: Number(form.stockCount)
      }));
      setForm(initialForm);
      await fetchProducts();
      toast.success("Product added");
    } catch (error) {
      handleAdminRequestError(error, "Unable to add product.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product._id);
    setEditingForm({
      name: product.name,
      price: String(product.price),
      stockCount: String(product.stockCount ?? 0),
      category: product.category,
      description: product.description,
      image: product.image,
      snapLensId: product.snapLensId || "",
      isFlashSale: Boolean(product.isFlashSale),
      discountPercentage: String(product.discountPercentage ?? ""),
      saleDurationHours: String(product.saleDurationHours || 2)
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    if (!editingForm.image.trim()) {
      toast.error("Please upload a product image before saving.");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/products/${editingId}`, buildArPayload({
        ...editingForm,
        price: Number(editingForm.price),
        stockCount: Number(editingForm.stockCount)
      }));
      setEditingId(null);
      await fetchProducts();
      toast.success("Product updated");
    } catch (error) {
      handleAdminRequestError(error, "Unable to update product.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    setSaving(true);
    try {
      await api.delete(`/products/${productId}`);
      await fetchProducts();
      toast.success("Product deleted");
    } catch (error) {
      handleAdminRequestError(error, "Unable to delete product.");
    } finally {
      setSaving(false);
    }
  };

  const resetEditing = () => {
    setEditingId(null);
    setEditingForm(initialForm);
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-bg px-4 py-6 text-text sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <MotionDiv
          {...analyticsMotion}
          className={`${PANEL_CLASS_NAME} relative overflow-hidden px-6 py-7 sm:px-8`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(108,99,255,0.16),_transparent_36%)]" />
          <div className="relative">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-accent">Admin Panel</p>
            <h1 className="text-3xl font-medium tracking-tight text-text sm:text-[2.25rem]">
              Products, orders, and AR inventory in one place
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-text/70">
              Manage products, upload Cloudinary images, and keep Snap Lens IDs safely mapped to each item.
            </p>
          </div>
        </MotionDiv>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsCard
            icon={IndianRupee}
            label="Total Revenue"
            value={dashboardMetrics.totalRevenue}
            helper={`Successful orders only. ${dashboardHelper}.`}
          />
          <AnalyticsCard
            icon={Boxes}
            label="Total Products"
            value={dashboardMetrics.totalProducts}
            helper="Live product count from context state."
          />
          <AnalyticsCard
            icon={AlertTriangle}
            label="Out of Stock / Low Stock"
            value={dashboardMetrics.lowStock}
            helper="Items with stock count lower than five."
          />
          <AnalyticsCard
            icon={ShoppingCart}
            label="Total Orders"
            value={dashboardMetrics.totalOrders}
            helper={dashboardHelper}
          />
        </section>

        <form onSubmit={handleCreateProduct} className={`${PANEL_CLASS_NAME} p-6 sm:p-8`}>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-medium text-text">Create Product</h2>
              <p className="text-sm text-text/65">Dual-theme, responsive form with Cloudinary image upload.</p>
            </div>
            <div className="rounded-full border border-border bg-bg px-4 py-2 text-xs uppercase tracking-[0.2em] text-text/55">
              AR logic preserved
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <span className={fieldLabel}>Product Name</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={INPUT_CLASS_NAME}
                placeholder="Silk Glow Serum"
                required
              />
            </label>

            <label>
              <span className={fieldLabel}>Category</span>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className={INPUT_CLASS_NAME}
                placeholder="Beauty"
                required
              />
            </label>

            <label>
              <span className={fieldLabel}>Price</span>
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                className={INPUT_CLASS_NAME}
                placeholder="1999"
                type="number"
                min="0"
                required
              />
            </label>

            <label>
              <span className={fieldLabel}>Stock Count</span>
              <input
                name="stockCount"
                value={form.stockCount}
                onChange={handleChange}
                className={INPUT_CLASS_NAME}
                placeholder="24"
                type="number"
                min="0"
                required
              />
            </label>

            <div className="rounded-[1.5rem] border border-border bg-bg p-5 md:col-span-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-text">Flash Sale</p>
                  <p className="mt-1 text-sm text-text/60">
                    Turn on a limited-time product discount with automatic end time.
                  </p>
                </div>

                <label className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-text">
                  <input
                    name="isFlashSale"
                    type="checkbox"
                    checked={Boolean(form.isFlashSale)}
                    onChange={handleChange}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  Enable Flash Sale
                </label>
              </div>

              {form.isFlashSale ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className={fieldLabel}>Discount Percentage</span>
                    <input
                      name="discountPercentage"
                      value={form.discountPercentage}
                      onChange={handleChange}
                      className={INPUT_CLASS_NAME}
                      placeholder="20"
                      type="number"
                      min="1"
                      max="90"
                      required={form.isFlashSale}
                    />
                  </label>

                  <label>
                    <span className={fieldLabel}>Sale Duration (Hours)</span>
                    <input
                      name="saleDurationHours"
                      value={form.saleDurationHours}
                      onChange={handleChange}
                      className={INPUT_CLASS_NAME}
                      placeholder="2"
                      type="number"
                      min="1"
                      required={form.isFlashSale}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <ImageUploadField
              id="create-product-image"
              image={form.image}
              uploading={uploadingTarget === "create"}
              disabled={saving || uploadingTarget === "edit"}
              onFileSelect={(file) => handleImageUpload(file, "create")}
            />

            <label className="md:col-span-2">
              <span className={fieldLabel}>Snap Lens ID</span>
              <input
                name="snapLensId"
                value={form.snapLensId}
                onChange={handleChange}
                className={INPUT_CLASS_NAME}
                placeholder="Paste Snap Camera Kit Lens ID"
                title="Paste the Snap Camera Kit Lens ID for this product"
              />
            </label>

            <label className="md:col-span-2">
              <span className={fieldLabel}>Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className={`${INPUT_CLASS_NAME} min-h-32 resize-y`}
                placeholder="Short, premium product description for customers."
                required
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || uploadingTarget === "create"}
              className="pill-button inline-flex items-center gap-2 bg-accent text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={15} strokeWidth={1.7} className="animate-spin" /> : <Plus size={15} strokeWidth={1.7} />}
              {saving ? "Saving..." : "Add Product"}
            </button>
            <span className="text-sm text-text/55">
              Upload image first, then save the product with price, stock, and AR metadata.
            </span>
          </div>
        </form>

        <CouponManager />

        <section className={`${PANEL_CLASS_NAME} overflow-hidden`}>
          <div className="flex flex-col gap-2 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-medium text-text">Product Inventory</h2>
              <p className="text-sm text-text/65">
                Responsive management view with animated add and delete transitions.
              </p>
            </div>
            <div className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-text/60">
              {sortedProducts.length} items
            </div>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[1180px] w-full text-left text-sm text-text">
              <thead className="bg-bg/70 text-text/60">
                <tr>
                  <th className="px-4 py-4 font-medium">Product</th>
                  <th className="px-4 py-4 font-medium">Category</th>
                  <th className="px-4 py-4 font-medium">Price</th>
                  <th className="px-4 py-4 font-medium">Stock</th>
                  <th className="px-4 py-4 font-medium">Image</th>
                  <th className="px-4 py-4 font-medium">Description</th>
                  <th className="px-4 py-4 font-medium">Lens ID</th>
                  <th className="px-4 py-4 font-medium">AR</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {sortedProducts.map((product) => {
                    const isEditing = editingId === product._id;
                    const stockCount = Number(product.stockCount ?? 0);

                    return (
                      <MotionTr
                        key={product._id}
                        layout
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -18 }}
                        transition={{ duration: 0.22 }}
                        className="border-b border-border/70 align-top"
                      >
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <input
                              className={INPUT_CLASS_NAME}
                              value={editingForm.name}
                              onChange={(event) => setEditingForm((prev) => ({ ...prev, name: event.target.value }))}
                            />
                          ) : (
                            <div>
                              <p className="font-medium text-text">{product.name}</p>
                              <p className="mt-1 text-xs text-text/55">SKU: {product._id.slice(-6).toUpperCase()}</p>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {isEditing ? (
                            <input
                              className={INPUT_CLASS_NAME}
                              value={editingForm.category}
                              onChange={(event) => setEditingForm((prev) => ({ ...prev, category: event.target.value }))}
                            />
                          ) : (
                            <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs text-text/70">
                              {product.category}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {isEditing ? (
                            <div className="space-y-3">
                              <input
                                className={INPUT_CLASS_NAME}
                                type="number"
                                min="0"
                                value={editingForm.price}
                                onChange={(event) => setEditingForm((prev) => ({ ...prev, price: event.target.value }))}
                              />
                              <label className="flex items-center gap-2 text-xs text-text/70">
                                <input
                                  type="checkbox"
                                  checked={Boolean(editingForm.isFlashSale)}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({ ...prev, isFlashSale: event.target.checked }))
                                  }
                                  className="h-4 w-4 accent-[var(--color-accent)]"
                                />
                                Flash Sale
                              </label>
                              {editingForm.isFlashSale ? (
                                <div className="grid gap-3">
                                  <input
                                    className={INPUT_CLASS_NAME}
                                    type="number"
                                    min="1"
                                    max="90"
                                    placeholder="Discount %"
                                    value={editingForm.discountPercentage}
                                    onChange={(event) =>
                                      setEditingForm((prev) => ({
                                        ...prev,
                                        discountPercentage: event.target.value
                                      }))
                                    }
                                  />
                                  <input
                                    className={INPUT_CLASS_NAME}
                                    type="number"
                                    min="1"
                                    placeholder="Duration (Hours)"
                                    value={editingForm.saleDurationHours}
                                    onChange={(event) =>
                                      setEditingForm((prev) => ({
                                        ...prev,
                                        saleDurationHours: event.target.value
                                      }))
                                    }
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium text-text">{formatCurrency(product.price)}</span>
                              {product.isFlashSale && product.saleEndTime ? (
                                <div className="mt-2 space-y-1">
                                  <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                                    {product.discountPercentage}% off
                                  </span>
                                  <p className="text-xs text-text/55">
                                    Ends {formatDateTime(product.saleEndTime)}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {isEditing ? (
                            <input
                              className={INPUT_CLASS_NAME}
                              type="number"
                              min="0"
                              value={editingForm.stockCount}
                              onChange={(event) =>
                                setEditingForm((prev) => ({ ...prev, stockCount: event.target.value }))
                              }
                            />
                          ) : (
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                  stockCount < 5 ? "bg-red-500/15 text-red-500" : "bg-accent/10 text-accent"
                                }`}
                              >
                                {stockCount < 5 ? `Low: ${stockCount}` : `${stockCount} in stock`}
                              </span>
                              <p className="text-xs text-text/55">
                                {product.isFlashSale && product.saleEndTime ? "Flash sale scheduled" : "Regular pricing"}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {isEditing ? (
                            <ImageUploadField
                              id={`edit-image-${product._id}`}
                              image={editingForm.image}
                              uploading={uploadingTarget === "edit"}
                              disabled={saving || uploadingTarget === "create"}
                              compact
                              onFileSelect={(file) => handleImageUpload(file, "edit")}
                            />
                          ) : (
                            <ProductImageCell image={product.image} name={product.name} />
                          )}
                        </td>

                        <td className="max-w-[260px] px-4 py-4">
                          {isEditing ? (
                            <textarea
                              className={`${INPUT_CLASS_NAME} min-h-24 resize-y`}
                              value={editingForm.description}
                              onChange={(event) =>
                                setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                              }
                            />
                          ) : (
                            <p className="text-sm text-text/65">{product.description}</p>
                          )}
                        </td>

                        <td className="max-w-[220px] px-4 py-4">
                          {isEditing ? (
                            <input
                              className={INPUT_CLASS_NAME}
                              placeholder="Snap Lens ID"
                              value={editingForm.snapLensId}
                              onChange={(event) => setEditingForm((prev) => ({ ...prev, snapLensId: event.target.value }))}
                            />
                          ) : product.snapLensId ? (
                            <span className="block truncate text-sm text-text/65">{product.snapLensId}</span>
                          ) : (
                            <span className="text-text/45">Not assigned</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {product.snapLensId ? (
                            <span className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                              Enabled
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs text-text/50">
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={saving || uploadingTarget === "edit"}
                                  className="pill-button inline-flex items-center gap-2 bg-accent text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {saving ? (
                                    <LoaderCircle size={14} strokeWidth={1.7} className="animate-spin" />
                                  ) : (
                                    <Save size={14} strokeWidth={1.7} />
                                  )}
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={resetEditing}
                                  className="pill-button inline-flex items-center gap-2 bg-bg text-text"
                                >
                                  <X size={14} strokeWidth={1.7} />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(product)}
                                  className="pill-button inline-flex items-center gap-2 bg-bg text-text"
                                >
                                  <Pencil size={14} strokeWidth={1.7} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteProduct(product._id)}
                                  disabled={saving}
                                  className="pill-button inline-flex items-center gap-2 bg-bg text-text disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 size={14} strokeWidth={1.7} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </MotionTr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 p-4 lg:hidden">
            <AnimatePresence initial={false}>
              {sortedProducts.map((product) => {
                const isEditing = editingId === product._id;
                const stockCount = Number(product.stockCount ?? 0);

                return (
                  <MotionArticle
                    key={product._id}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-[1.5rem] border border-border bg-bg p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <label>
                          <span className={fieldLabel}>Product Name</span>
                          <input
                            className={INPUT_CLASS_NAME}
                            value={editingForm.name}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label>
                            <span className={fieldLabel}>Category</span>
                            <input
                              className={INPUT_CLASS_NAME}
                              value={editingForm.category}
                              onChange={(event) => setEditingForm((prev) => ({ ...prev, category: event.target.value }))}
                            />
                          </label>

                          <label>
                            <span className={fieldLabel}>Price</span>
                            <input
                              className={INPUT_CLASS_NAME}
                              type="number"
                              min="0"
                              value={editingForm.price}
                              onChange={(event) => setEditingForm((prev) => ({ ...prev, price: event.target.value }))}
                            />
                          </label>

                          <label>
                            <span className={fieldLabel}>Stock Count</span>
                            <input
                              className={INPUT_CLASS_NAME}
                              type="number"
                              min="0"
                              value={editingForm.stockCount}
                              onChange={(event) => setEditingForm((prev) => ({ ...prev, stockCount: event.target.value }))}
                            />
                          </label>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-4">
                          <label className="flex items-center gap-3 text-sm text-text">
                            <input
                              type="checkbox"
                              checked={Boolean(editingForm.isFlashSale)}
                              onChange={(event) =>
                                setEditingForm((prev) => ({ ...prev, isFlashSale: event.target.checked }))
                              }
                              className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                            Enable Flash Sale
                          </label>

                          {editingForm.isFlashSale ? (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <label>
                                <span className={fieldLabel}>Discount Percentage</span>
                                <input
                                  className={INPUT_CLASS_NAME}
                                  type="number"
                                  min="1"
                                  max="90"
                                  value={editingForm.discountPercentage}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({
                                      ...prev,
                                      discountPercentage: event.target.value
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span className={fieldLabel}>Sale Duration (Hours)</span>
                                <input
                                  className={INPUT_CLASS_NAME}
                                  type="number"
                                  min="1"
                                  value={editingForm.saleDurationHours}
                                  onChange={(event) =>
                                    setEditingForm((prev) => ({
                                      ...prev,
                                      saleDurationHours: event.target.value
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>

                        <ImageUploadField
                          id={`mobile-edit-image-${product._id}`}
                          image={editingForm.image}
                          uploading={uploadingTarget === "edit"}
                          disabled={saving || uploadingTarget === "create"}
                          onFileSelect={(file) => handleImageUpload(file, "edit")}
                        />

                        <label>
                          <span className={fieldLabel}>Snap Lens ID</span>
                          <input
                            className={INPUT_CLASS_NAME}
                            value={editingForm.snapLensId}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, snapLensId: event.target.value }))}
                          />
                        </label>

                        <label>
                          <span className={fieldLabel}>Description</span>
                          <textarea
                            className={`${INPUT_CLASS_NAME} min-h-28 resize-y`}
                            value={editingForm.description}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, description: event.target.value }))}
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving || uploadingTarget === "edit"}
                            className="pill-button inline-flex items-center gap-2 bg-accent text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving ? (
                              <LoaderCircle size={14} strokeWidth={1.7} className="animate-spin" />
                            ) : (
                              <Save size={14} strokeWidth={1.7} />
                            )}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={resetEditing}
                            className="pill-button inline-flex items-center gap-2 bg-card text-text"
                          >
                            <X size={14} strokeWidth={1.7} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-medium text-text">{product.name}</h3>
                            <p className="mt-1 text-sm text-text/60">{product.category}</p>
                          </div>
                          <UploadPreview image={product.image} className="h-16 w-16 rounded-2xl" />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-card p-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-text/50">Price</p>
                            <p className="mt-2 text-base font-medium text-text">{formatCurrency(product.price)}</p>
                            {product.isFlashSale && product.saleEndTime ? (
                              <p className="mt-2 text-xs text-accent">
                                {product.discountPercentage}% off until {formatDateTime(product.saleEndTime)}
                              </p>
                            ) : null}
                          </div>
                          <div className="rounded-2xl border border-border bg-card p-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-text/50">Stock</p>
                            <p className={`mt-2 text-base font-medium ${stockCount < 5 ? "text-red-500" : "text-text"}`}>
                              {stockCount}
                            </p>
                            <p className="mt-2 text-xs text-text/50">
                              {product.isFlashSale && product.saleEndTime ? "Flash sale active" : "Regular pricing"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-text/50">Description</p>
                          <p className="mt-2 text-sm text-text/65">{product.description}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-text/50">Lens ID</p>
                            <p className="mt-2 max-w-[220px] truncate text-sm text-text/65">
                              {product.snapLensId || "Not assigned"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              product.snapLensId ? "bg-accent/15 text-accent" : "border border-border text-text/50"
                            }`}
                          >
                            {product.snapLensId ? "AR Enabled" : "AR Disabled"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="pill-button inline-flex items-center gap-2 bg-card text-text"
                          >
                            <Pencil size={14} strokeWidth={1.7} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(product._id)}
                            disabled={saving}
                            className="pill-button inline-flex items-center gap-2 bg-card text-text disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={14} strokeWidth={1.7} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </MotionArticle>
                );
              })}
            </AnimatePresence>

            {sortedProducts.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-bg px-5 py-10 text-center text-sm text-text/60">
                No products yet. Use the form above to create your first catalog item.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
};

export default Admin;
