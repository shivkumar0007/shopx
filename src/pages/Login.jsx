import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useApp } from "../context/useApp.jsx";

const Login = () => {
  const navigate = useNavigate();
  const { user, loginUser } = useApp();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(form);
      toast.success(`Welcome back, ${data.name}`);
      navigate(data.role === "admin" ? "/admin" : "/");
    } catch (err) {
      const message = err?.response?.data?.message || "Login failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-8 py-8">
      <section className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8">
        <h1 className="mb-2 text-3xl font-medium text-text">Login</h1>
        <p className="mb-6 text-sm font-normal text-text/70">Sign in to continue your personalized shopping.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-2xl border border-border bg-bg px-4 py-3 text-sm font-normal text-text outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="w-full rounded-2xl border border-border bg-bg px-4 py-3 text-sm font-normal text-text outline-none"
            required
          />
          {error && <p className="text-sm font-normal text-red-500">{error}</p>}
          <button disabled={loading} className="pill-button w-full bg-accent text-white disabled:opacity-60">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="mt-5 text-sm font-normal text-text/70">
          New user?{" "}
          <Link to="/register" className="text-accent">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
