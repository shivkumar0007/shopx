import { Download, LoaderCircle, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import OrderTracking from "../components/OrderTracking.jsx";
import { useApp } from "../context/useApp.jsx";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatDate = (value) =>
  new Date(value || Date.now()).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

const normalizeLocalOrder = (order) => ({
  _id: order._id,
  id: order.id,
  razorpayOrderId: order.razorpayOrderId || order.id,
  status: order.status || "paid",
  orderStatus: order.orderStatus || "Processing",
  amount: order.totalPrice ?? order.amount ?? 0,
  invoiceNumber: order.invoiceNumber || "",
  createdAt: order.createdAt,
  items: (order.items || []).map((item) => ({
    productName: item.productName || item.name || "Product",
    productImage: item.productImage || item.image || "",
    quantity: item.quantity,
    price: item.price
  }))
});

const Orders = () => {
  const { api, orders, user } = useApp();
  const [remoteOrders, setRemoteOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingOrderId, setDownloadingOrderId] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadOrders = async () => {
      if (!user?.token) {
        if (!ignore) {
          setRemoteOrders([]);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get("/payments/orders");
        if (!ignore) {
          setRemoteOrders(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!ignore) {
          setRemoteOrders([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      ignore = true;
    };
  }, [api, user?.token]);

  const visibleOrders = useMemo(() => {
    if (remoteOrders.length > 0) return remoteOrders;
    return orders.map(normalizeLocalOrder);
  }, [orders, remoteOrders]);

  const handleInvoiceDownload = async (order) => {
    if (!order?._id) {
      toast.error("Invoice will be available once backend order sync completes.");
      return;
    }

    setDownloadingOrderId(order._id);
    try {
      const response = await api.get(`/payments/orders/${order._id}/invoice`, {
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${order.invoiceNumber || order.razorpayOrderId || "shopx-invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not download invoice.");
    } finally {
      setDownloadingOrderId("");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-accent">Order History</p>
            <h1 className="mt-2 text-2xl font-medium text-text">Track shipments and download invoices</h1>
          </div>
          <div className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-text/60">
            {visibleOrders.length} orders
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg px-5 py-6 text-sm text-text/65">
            <LoaderCircle size={18} strokeWidth={1.7} className="animate-spin" />
            Loading your latest orders...
          </div>
        ) : visibleOrders.length === 0 ? (
          <p className="text-sm font-normal text-text/70">No order history yet.</p>
        ) : (
          <div className="space-y-5">
            {visibleOrders.map((order) => (
              <article key={order._id || order.id} className="rounded-2xl border border-border bg-bg p-5">
                <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-medium text-text">Order #{order.razorpayOrderId || order.id}</p>
                      <span className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
                        {order.orderStatus || "Processing"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-text/60">{formatDate(order.createdAt)}</p>
                    <p className="mt-1 text-sm text-text/60">Payment Status: {order.status}</p>
                    {order.invoiceNumber ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text/45">
                        Invoice {order.invoiceNumber}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-[1.2rem] border border-border bg-card px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-text/45">Total</p>
                      <p className="mt-1 text-lg font-medium text-text">{formatCurrency(order.amount)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInvoiceDownload(order)}
                      disabled={downloadingOrderId === order._id || order.status !== "paid"}
                      className="pill-button inline-flex items-center gap-2 bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {downloadingOrderId === order._id ? (
                        <LoaderCircle size={15} strokeWidth={1.7} className="animate-spin" />
                      ) : (
                        <Download size={15} strokeWidth={1.7} />
                      )}
                      {downloadingOrderId === order._id ? "Preparing..." : "Download Invoice"}
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <OrderTracking orderStatus={order.orderStatus || "Processing"} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {(order.items || []).map((item, index) => (
                    <div key={`${item.productName}-${index}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg text-text/30">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <ReceiptText size={18} strokeWidth={1.8} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{item.productName}</p>
                        <p className="mt-1 text-xs text-text/55">
                          Qty {item.quantity} x {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Orders;
