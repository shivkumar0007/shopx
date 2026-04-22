import { CalendarDays, LoaderCircle, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/useApp.jsx";

const INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

const CouponManager = () => {
  const { api } = useApp();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountPercentage: "",
    expiryDate: ""
  });

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/coupons");
      setCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load coupons.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    api
      .get("/coupons")
      .then(({ data }) => {
        if (!ignore) {
          setCoupons(Array.isArray(data) ? data : []);
        }
      })
      .catch((error) => {
        if (!ignore) {
          toast.error(error?.response?.data?.message || "Could not load coupons.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [api]);

  const handleCreateCoupon = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/coupons", {
        code: form.code.trim().toUpperCase(),
        discountPercentage: Number(form.discountPercentage),
        expiryDate: form.expiryDate
      });
      setForm({ code: "", discountPercentage: "", expiryDate: "" });
      await loadCoupons();
      toast.success("Coupon created.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not create coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm("Delete this coupon?")) return;

    try {
      await api.delete(`/coupons/${couponId}`);
      setCoupons((prev) => prev.filter((coupon) => coupon._id !== couponId));
      toast.success("Coupon deleted.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete coupon.");
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-accent">Coupons</p>
          <h2 className="mt-2 text-2xl font-medium text-text">Promo code management</h2>
          <p className="mt-2 text-sm text-text/65">
            Create, review, and delete limited-time discount codes for checkout.
          </p>
        </div>
        <div className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-text/60">
          {coupons.length} active records
        </div>
      </div>

      <form onSubmit={handleCreateCoupon} className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_1fr_auto]">
        <input
          value={form.code}
          onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
          className={INPUT_CLASS_NAME}
          placeholder="WELCOME10"
          required
        />
        <input
          value={form.discountPercentage}
          onChange={(event) => setForm((prev) => ({ ...prev, discountPercentage: event.target.value }))}
          className={INPUT_CLASS_NAME}
          placeholder="10"
          type="number"
          min="1"
          max="90"
          required
        />
        <input
          value={form.expiryDate}
          onChange={(event) => setForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
          className={INPUT_CLASS_NAME}
          type="datetime-local"
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="pill-button inline-flex items-center justify-center gap-2 bg-accent text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <LoaderCircle size={16} strokeWidth={1.7} className="animate-spin" /> : <Plus size={16} strokeWidth={1.7} />}
          {saving ? "Saving..." : "Add Coupon"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-bg px-5 py-6 text-sm text-text/60">
            Loading coupon list...
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg px-5 py-10 text-center text-sm text-text/60">
            No coupons yet. Create your first checkout incentive above.
          </div>
        ) : (
          coupons.map((coupon) => (
            <article key={coupon._id} className="flex flex-col gap-4 rounded-2xl border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-accent/10 p-3 text-accent">
                  <Tag size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-base font-medium text-text">{coupon.code}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text/60">
                    <span>{coupon.discountPercentage}% off</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} strokeWidth={1.7} />
                      {new Date(coupon.expiryDate).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteCoupon(coupon._id)}
                className="pill-button inline-flex items-center gap-2 bg-card text-text"
              >
                <Trash2 size={15} strokeWidth={1.7} />
                Delete
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default CouponManager;
