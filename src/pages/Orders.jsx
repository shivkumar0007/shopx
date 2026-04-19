import { CheckCircle2, Clock3, Truck } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

const stepClass = (active) =>
  `flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
    active ? "border-accent bg-accent text-white" : "border-border text-text/60"
  }`;

const Orders = () => {
  const { orders } = useApp();

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <section className="rounded-2xl border border-border bg-card p-8">
        <h1 className="mb-6 text-2xl font-medium text-text">Orders</h1>
        {orders.length === 0 ? (
          <p className="text-sm font-normal text-text/70">No order history yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = order.status?.toLowerCase() === "paid" || order.status === "Success" ? "Success" : "Pending";
              const paid = status === "Success";
              return (
                <article key={order.id} className="rounded-2xl border border-border bg-bg p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text">Order #{order.id}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        paid ? "bg-accent/20 text-accent" : "bg-card text-text/70"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="mb-4 text-sm font-normal text-text/70">Total: Rs. {order.amount}</p>
                  <div className="flex items-center gap-3">
                    <div className={stepClass(true)}>
                      <Clock3 size={12} />
                    </div>
                    <div className={`h-px w-8 ${paid ? "bg-accent" : "bg-border"}`} />
                    <div className={stepClass(paid)}>
                      <CheckCircle2 size={12} />
                    </div>
                    <div className={`h-px w-8 ${paid ? "bg-accent" : "bg-border"}`} />
                    <div className={stepClass(paid)}>
                      <Truck size={12} />
                    </div>
                    <span className="ml-2 text-xs text-text/65">Track Order</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Orders;
