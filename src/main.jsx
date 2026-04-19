import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary.jsx";
import "./index.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3200,
          className: "!font-normal !text-sm !max-w-md",
          style: {
            borderRadius: "980px",
            border: "1px solid var(--color-border)",
            background: "var(--color-card)",
            color: "var(--color-text)",
            fontWeight: 400,
            boxShadow: "none"
          },
          success: { iconTheme: { primary: "#6c63ff", secondary: "var(--color-card)" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "var(--color-card)" } }
        }}
      />
    </GlobalErrorBoundary>
  </StrictMode>,
);
