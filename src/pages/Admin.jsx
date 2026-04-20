import { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext.jsx";

const initialForm = {
  name: "",
  price: "",
  stockCount: "",
  category: "",
  description: "",
  image: "",
  snapLensId: ""
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || error?.message;
  return message || fallbackMessage;
};

const Admin = () => {
  const { api, products, fetchProducts, user, setUser } = useApp();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

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

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!user?.token) return;
    setSaving(true);
    try {
      await api.post("/products", buildArPayload({
        ...form,
        price: Number(form.price)
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
      snapLensId: product.snapLensId || ""
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
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
    if (!confirm("Delete this product?")) return;
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

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#000000] px-8 py-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="rounded-2xl border border-[#2b2b30] bg-[#1c1c1e] p-8">
          <h1 className="mb-2 text-3xl font-medium tracking-tight text-[#f5f5f7]">Admin Dashboard</h1>
          <p className="text-sm font-normal text-[#f5f5f7]/70">
            Manage products and save project-specific Snap Lens IDs in MongoDB.
          </p>
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
            name="snapLensId"
            value={form.snapLensId}
            onChange={handleChange}
            className="admin-input md:col-span-2"
            placeholder="Snap Lens ID"
            title="Paste the Snap Camera Kit Lens ID for this product"
          />
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
                <th className="px-3 py-3 font-medium">Lens ID</th>
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
                          placeholder="Snap Lens ID"
                          value={editingForm.snapLensId}
                          onChange={(event) => setEditingForm((prev) => ({ ...prev, snapLensId: event.target.value }))}
                        />
                      ) : product.snapLensId ? (
                        <span className="max-w-[180px] truncate text-[#f5f5f7]/70">{product.snapLensId}</span>
                      ) : (
                        <span className="text-[#f5f5f7]/60">Not assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {product.snapLensId ? (
                        <span className="rounded-full bg-accent/25 px-2.5 py-1 text-xs text-white">Enabled</span>
                      ) : (
                        <span className="text-[#f5f5f7]/60">Disabled</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
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
      </section>
    </main>
  );
};

export default Admin;
