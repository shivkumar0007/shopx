import {
  createMediaStreamSource,
  bootstrapCameraKit,
  Transform2D,
} from "@snap/camera-kit";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MotionDiv = motion.div;

const ARModal = ({ open, lensId, onClose }) => {
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const resolvedLensId = lensId?.trim() || "";
  const lensGroupId = import.meta.env.VITE_SNAP_LENS_GROUP_ID;

  useEffect(() => {
    if (!open) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !resolvedLensId || !canvasRef.current) return;

    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");

    const cleanupSession = async () => {
      try {
        await sessionRef.current?.pause("live");
      } catch {
        // Ignore session pause errors during cleanup.
      }

      try {
        await sessionRef.current?.destroy();
      } catch {
        // Ignore session destroy errors during cleanup.
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      sessionRef.current = null;
    };

    const init = async () => {
      try {
        const cameraKit = await bootstrapCameraKit({
          apiToken: import.meta.env.VITE_SNAP_API_TOKEN,
        });

        const session = await cameraKit.createSession({
          liveRenderTarget: canvasRef.current,
        });

        sessionRef.current = session;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user" },
        });

        streamRef.current = stream;

        const source = createMediaStreamSource(stream, {
          cameraType: "user",
          transform: Transform2D.MirrorX,
        });

        await session.setSource(source);

        const lens = await cameraKit.lensRepository.loadLens(
          resolvedLensId,
          import.meta.env.VITE_SNAP_LENS_GROUP_ID,
        );

        if (cancelled) return;

        await session.applyLens(lens);
        await session.play("live");

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (cancelled) return;

        if (error?.name === "NotAllowedError") {
          setStatus("denied");
        } else if (
          String(error?.message || "")
            .toLowerCase()
            .includes("permission denied")
        ) {
          setStatus("error");
          setErrorMessage(
            "This lens is not accessible to the current Camera Kit app. Add the lens to the configured Lens Group, save changes in Lens Scheduler, and make sure the API token belongs to the same Camera Kit organization.",
          );
        } else if (
          String(error?.message || "")
            .toLowerCase()
            .includes("lens not found")
        ) {
          setStatus("error");
          setErrorMessage(
            `Lens ID ${resolvedLensId} is saved in the product, but Snap Camera Kit cannot find it inside Lens Group ${lensGroupId}. Add/publish this exact lens to that Lens Group in Snap Lens Manager, then try again.`,
          );
        } else {
          setStatus("error");
          setErrorMessage("Unable to load the virtual try-on experience.");
        }

        console.error("Camera Kit error:", error);
        await cleanupSession();
      }
    };

    init();

    return () => {
      cancelled = true;
      void cleanupSession();
    };
  }, [open, resolvedLensId, retryNonce, lensGroupId]);

  const handleRetry = () => {
    setStatus("idle");
    setErrorMessage("");
    setRetryNonce((prev) => prev + 1);
  };

  const modalContent = (
    <AnimatePresence>
      {open && resolvedLensId && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <MotionDiv
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: "56rem",
              height: "min(calc(100dvh - 2rem), 820px)",
              overflow: "hidden",
              borderRadius: "1.8rem",
              border: "1px solid var(--border, #e5e7eb)",
              backgroundColor: "var(--card, #fff)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "1rem 1.5rem",
              }}
            >
              <div>
                <h3 className="text-lg font-medium text-text">Virtual Try-On</h3>
                <p className="mt-0.5 text-sm text-text/60">
                  Camera view ab directly screen ke center me open hogi.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="pill-button shrink-0 bg-bg text-text hover:bg-card"
              >
                Close
              </button>
            </div>

            {/* Camera area — flex-1 fills remaining height */}
            <div
              style={{
                position: "relative",
                flex: 1,
                minHeight: 0,
                margin: "0 1.25rem 1.25rem",
                overflow: "hidden",
                borderRadius: "1rem",
                border: "1px solid var(--border, #e5e7eb)",
                backgroundColor: "#000",
              }}
            >
              {status === "loading" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/92 backdrop-blur-sm">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
                  <p className="text-sm font-normal text-text">Camera Initializing...</p>
                </div>
              )}

              {status === "denied" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/92 px-6 text-center backdrop-blur-sm">
                  <p className="text-base font-medium text-text">
                    Camera access is required for Virtual Try-On
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="pill-button bg-accent text-white"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/92 px-6 text-center backdrop-blur-sm">
                  <p className="max-w-xl text-base font-medium text-text">
                    {errorMessage || "Unable to load the virtual try-on experience."}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="pill-button bg-accent text-white"
                  >
                    Try Again
                  </button>
                </div>
              )}

              <canvas
                key={`${open}-${retryNonce}`}
                ref={canvasRef}
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ARModal;