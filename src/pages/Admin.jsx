import { useEffect, useMemo, useState } from "react";
import { Camera, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext.jsx";
import {
  assignLensToProduct,
  deleteLens,
  getAllLenses,
  getLensAssignedProductIds,
  removeProductLensAssignments,
  saveLens
} from "../utils/lensManager.js";

const initialForm = {
  name: "",
  price: "",
  stockCount: "",
  category: "",
  description: "",
  image: "",
  snapLensUrl: "",
  isArEnabled: false
};

const initialLensForm = {
  id: "",
  name: "",
  lensId: "",
  status: "active",
  productId: ""
};

const truncateLensId = (value = "") =>
  value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;

const Admin = () => {
  const { api, products, fetchProducts, user } = useApp();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [lenses, setLenses] = useState([]);
  const [lensForm, setLensForm] = useState(initialLensForm);
  const [lensFormOpen, setLensFormOpen] = useState(false);
  const [savingLens, setSavingLens] = useState(false);

  useEffect(() => {
    setLenses(getAllLenses());
  }, []);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!user?.token) return;
    setSaving(true);
    try {
      await api.post("/products", {
        ...form,
        price: Number(form.price)
      });
      setForm(initialForm);
      await fetchProducts();
      toast.success("Product added");
    } catch {
      toast.error("Unable to add product.");
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
      snapLensUrl: product.snapLensUrl || "",
      isArEnabled: Boolean(product.isArEnabled)
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await api.put(`/products/${editingId}`, {
        ...editingForm,
        price: Number(editingForm.price),
        stockCount: Number(editingForm.stockCount)
      });
      setEditingId(null);
      await fetchProducts();
      toast.success("Product updated");
    } catch {
      toast.error("Unable to update product.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!confirm("Delete this product?")) return;
    setSaving(true);
    try {
      await api.delete(`/products/${productId}`);
      await fetchProducts();
      toast.success("Product deleted");
    } catch {
      toast.error("Unable to delete product.");
    } finally {
      setSaving(false);
    }
  };

  const handleLensChange = (event) => {
    const { name, value } = event.target;
    setLensForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleLensStatus = () => {
    setLensForm((prev) => ({
      ...prev,
      status: prev.status === "active" ? "inactive" : "active"
    }));
  };

  const resetLensForm = () => {
    setLensForm(initialLensForm);
    setLensFormOpen(false);
  };

  const handleSaveLens = (event) => {
    event.preventDefault();
    setSavingLens(true);

    try {
      const nextLenses = saveLens(lensForm);
      removeProductLensAssignments(lensForm.lensId);
      if (lensForm.productId) {
        assignLensToProduct(lensForm.productId, lensForm.lensId.trim());
      }
      setLenses(nextLenses);
      toast.success(lensForm.id ? "Lens updated" : "Lens saved");
      resetLensForm();
    } catch {
      toast.error("Unable to save lens.");
    } finally {
      setSavingLens(false);
    }
  };

  const handleEditLens = (lens) => {
    const assignedProductIds = getLensAssignedProductIds(lens.lensId);
    setLensForm({
      id: lens.id,
      name: lens.name,
      lensId: lens.lensId,
      status: lens.status,
      productId: assignedProductIds[0] || ""
    });
    setLensFormOpen(true);
  };

  const handleDeleteLens = (lensId) => {
    if (!confirm("Delete this lens?")) return;

    try {
      const lensToDelete = lenses.find((entry) => entry.id === lensId);
      if (lensToDelete) {
        removeProductLensAssignments(lensToDelete.lensId);
      }

      const nextLenses = deleteLens(lensId);
      setLenses(nextLenses);

      if (lensForm.id === lensId) {
        resetLensForm();
      }

      toast.success("Lens deleted");
    } catch {
      toast.error("Unable to delete lens.");
    }
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#000000] px-8 py-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="rounded-2xl border border-[#2b2b30] bg-[#1c1c1e] p-8">
          <h1 className="mb-2 text-3xl font-medium tracking-tight text-[#f5f5f7]">Admin Dashboard</h1>
          <p className="text-sm font-normal text-[#f5f5f7]/70">Manage products and AR configuration.</p>
        </div>

        <form
          onSubmit={handleCreateProduct}
          className="grid gap-4 rounded-2xl border border-[#2b2b30] bg-[#1c1c1e] p-8 md:grid-cols-2"
        >
          <input name="name" value={form.name} onChange={handleChange} className="admin-input" placeholder="Name" required />
          <input
            name="price"
            value={form.price}
            onChange={handleChange}
            className="admin-input"
            placeholder="Price"
            type="number"
            required
          />
          <input
            name="stockCount"
            value={form.stockCount}
            onChange={handleChange}
            className="admin-input"
            placeholder="Stock Count"
            type="number"
            min="0"
            required
          />
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            className="admin-input"
            placeholder="Category"
            required
          />
          <input name="image" value={form.image} onChange={handleChange} className="admin-input" placeholder="Image URL" required />
          <input
            name="snapLensUrl"
            value={form.snapLensUrl}
            onChange={handleChange}
            className="admin-input md:col-span-2"
            placeholder="Snap Lens URL (optional)"
            title="Paste the Snapchat Lens Web URL here"
          />
          <label className="inline-flex items-center gap-2 text-sm font-normal text-[#f5f5f7] md:col-span-2">
            <input
              type="checkbox"
              name="isArEnabled"
              checked={form.isArEnabled}
              onChange={handleChange}
              className="h-4 w-4 accent-[#6c63ff]"
            />
            Enable AR manually
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="admin-input min-h-28 resize-y md:col-span-2"
            placeholder="Description"
            required
          />
          <div className="md:col-span-2">
            <button disabled={saving} className="pill-button inline-flex items-center gap-2 bg-accent text-white">
              <Plus size={15} strokeWidth={1.5} /> Add Product
            </button>
          </div>
        </form>

        <section className="overflow-x-auto rounded-2xl border border-[#2b2b30] bg-[#1c1c1e] p-6">
          <h2 className="mb-4 text-xl font-medium text-[#f5f5f7]">Product List</h2>
          <table className="w-full min-w-[780px] text-left text-sm text-[#f5f5f7]">
            <thead>
              <tr className="border-b border-[#2b2b30] text-[#f5f5f7]/70">
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Price</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Image</th>
                <th className="px-3 py-3 font-medium">Description</th>
                <th className="px-3 py-3 font-medium">AR</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((product) => {
                const isEditing = editingId === product._id;
                return (
                  <tr key={product._id} className="border-b border-[#2b2b30]/70">
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          className="admin-input"
                          value={editingForm.name}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, name: event.target.value }))}
                        />
                      ) : (
                        product.name
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          className="admin-input"
                          value={editingForm.category}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, category: event.target.value }))}
                        />
                      ) : (
                        product.category
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          className="admin-input"
                          type="number"
                          value={editingForm.price}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, price: event.target.value }))}
                        />
                      ) : (
                        `Rs. ${product.price}`
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          className="admin-input"
                          type="number"
                          min="0"
                          value={editingForm.stockCount}
                          onChange={(event) =>
                            setEditingForm((prev) => ({ ...prev, stockCount: event.target.value }))
                          }
                        />
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            Number(product.stockCount) < 5
                              ? "bg-red-500/20 text-red-400"
                              : "bg-card text-[#f5f5f7]/75"
                          }`}
                        >
                          {product.stockCount ?? 0}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          className="admin-input"
                          value={editingForm.image}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, image: event.target.value }))}
                        />
                      ) : (
                        <span className="max-w-[220px] truncate text-[#f5f5f7]/70">{product.image}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <textarea
                          className="admin-input min-h-20 resize-y"
                          value={editingForm.description}
                          onChange={(event) =>
                            setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                        />
                      ) : (
                        <span className="max-w-[260px] truncate text-[#f5f5f7]/70">{product.description}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <input
                          className="admin-input"
                          placeholder="Snap Lens URL"
                          title="Paste the Snapchat Lens Web URL here"
                          value={editingForm.snapLensUrl}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, snapLensUrl: event.target.value }))}
                        />
                      ) : product.isArEnabled ? (
                        <span className="rounded-full bg-accent/25 px-2.5 py-1 text-xs text-white">Enabled</span>
                      ) : (
                        <span className="text-[#f5f5f7]/60">Disabled</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <label className="inline-flex items-center gap-2 rounded-full border border-[#2b2b30] px-3 py-2 text-xs text-[#f5f5f7]">
                              <input
                                type="checkbox"
                                checked={Boolean(editingForm.isArEnabled)}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, isArEnabled: event.target.checked }))
                                }
                                className="h-3.5 w-3.5 accent-[#6c63ff]"
                              />
                              AR
                            </label>
                            <button onClick={saveEdit} className="pill-button bg-accent text-white">
                              <Save size={14} strokeWidth={1.5} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="pill-button bg-[#000] text-[#f5f5f7]">
                              <X size={14} strokeWidth={1.5} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(product)} className="pill-button bg-[#000] text-[#f5f5f7]">
                              <Pencil size={14} strokeWidth={1.5} />
                            </button>
                            <button onClick={() => deleteProduct(product._id)} className="pill-button bg-[#000] text-[#f5f5f7]">
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-[#2b2b30] bg-[#1c1c1e] p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#000000] text-[#f5f5f7]">
                <Camera size={18} strokeWidth={1.6} />
              </span>
              <div>
                <h2 className="text-2xl font-medium text-[#f5f5f7]">AR Lens Manager</h2>
                <p className="text-sm font-normal text-[#f5f5f7]/70">
                  Manage Snap lenses used for virtual try-on experiences.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (lensFormOpen) {
                  resetLensForm();
                } else {
                  setLensForm(initialLensForm);
                  setLensFormOpen(true);
                }
              }}
              className="pill-button inline-flex items-center gap-2 bg-accent text-white"
            >
              <Plus size={15} strokeWidth={1.5} /> Add New Lens
            </button>
          </div>

          {lensFormOpen && (
            <form
              onSubmit={handleSaveLens}
              className="mb-6 grid gap-4 rounded-2xl border border-[#2b2b30] bg-[#000000] p-6 md:grid-cols-2"
            >
              <input
                name="name"
                value={lensForm.name}
                onChange={handleLensChange}
                className="admin-input"
                placeholder="Lens Name"
                required
              />
              <input
                name="lensId"
                value={lensForm.lensId}
                onChange={handleLensChange}
                className="admin-input"
                placeholder="Lens ID"
                required
              />
              <select
                name="productId"
                value={lensForm.productId}
                onChange={handleLensChange}
                className="admin-input"
              >
                <option value="">Assign to Product</option>
                {sortedProducts.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3 text-sm text-[#f5f5f7]">
                <span>Status</span>
                <button
                  type="button"
                  onClick={toggleLensStatus}
                  className={`pill-button ${
                    lensForm.status === "active" ? "bg-accent text-white" : "bg-[#1c1c1e] text-[#f5f5f7]"
                  }`}
                >
                  {lensForm.status === "active" ? "Active" : "Inactive"}
                </button>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={savingLens}
                  className="pill-button inline-flex items-center gap-2 bg-accent text-white"
                >
                  <Save size={14} strokeWidth={1.5} /> {lensForm.id ? "Update Lens" : "Save Lens"}
                </button>
                <button
                  type="button"
                  onClick={resetLensForm}
                  className="pill-button inline-flex items-center gap-2 bg-[#000000] text-[#f5f5f7]"
                >
                  <X size={14} strokeWidth={1.5} /> Cancel
                </button>
              </div>
            </form>
          )}

          {lenses.length === 0 ? (
            <div className="rounded-2xl border border-[#2b2b30] bg-[#000000] p-6 text-sm font-normal text-[#f5f5f7]/70">
              No lenses added yet. Add your first lens above.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lenses.map((lens) => (
                <article key={lens.id} className="rounded-2xl border border-[#2b2b30] bg-[#000000] p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-medium text-[#f5f5f7]">{lens.name}</h3>
                      <p className="mt-1 text-sm text-[#f5f5f7]/60">{truncateLensId(lens.lensId)}</p>
                      <p className="mt-2 text-sm text-[#f5f5f7]/60">
                        Assigned to:{" "}
                        {(() => {
                          const assignedProductIds = getLensAssignedProductIds(lens.lensId);
                          const assignedProducts = sortedProducts.filter((product) =>
                            assignedProductIds.includes(product._id)
                          );

                          return assignedProducts.length > 0
                            ? assignedProducts.map((product) => product.name).join(", ")
                            : "No product assigned";
                        })()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        lens.status === "active"
                          ? "bg-accent/25 text-white"
                          : "bg-[#1c1c1e] text-[#f5f5f7]/70"
                      }`}
                    >
                      {lens.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditLens(lens)}
                      className="pill-button inline-flex items-center gap-2 bg-[#1c1c1e] text-[#f5f5f7]"
                    >
                      <Pencil size={14} strokeWidth={1.5} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLens(lens.id)}
                      className="pill-button inline-flex items-center gap-2 bg-[#1c1c1e] text-[#f5f5f7]"
                    >
                      <Trash2 size={14} strokeWidth={1.5} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default Admin;
