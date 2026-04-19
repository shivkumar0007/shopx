import { Link } from "react-router-dom";

const NotFound = () => (
  <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-8 py-8">
    <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-10 text-center">
      <p className="mb-2 text-sm font-normal uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mb-3 text-3xl font-medium text-text">Page Not Found</h1>
      <p className="mb-6 text-sm font-normal text-text/70">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="pill-button bg-accent text-white">
        Back to Home
      </Link>
    </section>
  </main>
);

export default NotFound;
