import { useApp } from "../context/useApp.jsx";
import { Link } from "react-router-dom";

const Profile = () => {
  const { user, orders, logout } = useApp();

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <section className="max-w-xl rounded-2xl border border-border bg-card p-8">
        <h2 className="mb-5 text-2xl font-medium text-text">Profile</h2>
        {user ? (
          <div className="space-y-4">
            <p className="text-sm font-normal text-text">Name: {user.name}</p>
            <p className="text-sm font-normal text-text">Email: {user.email}</p>
            <button onClick={logout} className="pill-button bg-bg text-text">
              Logout
            </button>
            <Link to="/orders" className="pill-button bg-accent text-white">
              View Order History
            </Link>
            <div className="pt-4">
              <h3 className="mb-3 text-base font-medium text-text">Recent Orders</h3>
              {orders.length === 0 ? (
                <p className="text-sm font-normal text-text/70">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="rounded-2xl border border-border bg-bg p-3">
                      <p className="text-xs font-normal text-text/70">Order #{order.id}</p>
                      <p className="text-sm font-medium text-text">Rs. {order.amount}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-normal text-text/70">No active user session.</p>
            <div className="flex gap-2">
              <Link to="/login" className="pill-button bg-bg text-text">
                Login
              </Link>
              <Link to="/register" className="pill-button bg-accent text-white">
                Register
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Profile;
