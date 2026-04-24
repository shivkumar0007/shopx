import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import PageFade from "./components/PageFade.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import VirtualAssistant from "./components/VirtualAssistant.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";

const Home = lazy(() => import("./pages/Home.jsx"));
const ProductPage = lazy(() => import("./pages/ProductPage.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const VirtualStore = lazy(() => import("./pages/VirtualStore.jsx"));

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageFade>
              <Home />
            </PageFade>
          }
        />
        <Route
          path="/products/:id"
          element={
            <PageFade>
              <ProductPage />
            </PageFade>
          }
        />
        <Route
          path="/virtual-store"
          element={
            <PageFade>
              <VirtualStore />
            </PageFade>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <PageFade>
                <Cart />
              </PageFade>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <PageFade>
              <Wishlist />
            </PageFade>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PageFade>
                <Profile />
              </PageFade>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <PageFade>
                <Orders />
              </PageFade>
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PageFade>
              <Login />
            </PageFade>
          }
        />
        <Route
          path="/register"
          element={
            <PageFade>
              <Register />
            </PageFade>
          }
        />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <PageFade>
                <Admin />
              </PageFade>
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <PageFade>
              <NotFound />
            </PageFade>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const AppShell = () => {
  const location = useLocation();
  const isVirtualStore = location.pathname === "/virtual-store";
  const showGlobalAssistant = !isVirtualStore;

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300">
      {!isVirtualStore ? <Navbar /> : null}
      <Suspense
        fallback={
          <main className="mx-auto max-w-7xl px-8 py-8">
            <div className="skeleton-shimmer h-28 rounded-2xl border border-border bg-card" />
          </main>
        }
      >
        <AnimatedRoutes />
      </Suspense>
      {showGlobalAssistant ? <VirtualAssistant /> : null}
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
