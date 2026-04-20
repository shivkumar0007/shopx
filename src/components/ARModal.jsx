import { createMediaStreamSource, bootstrapCameraKit, Transform2D } from "@snap/camera-kit";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
    if (!open || !resolvedLensId || !canvasRef.current) return;

    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");

    const cleanupSession = async () => {
      try {
        await sessionRef.current?.pause("live");
      } catch {}

      try {
        await sessionRef.current?.destroy();
      } catch {}

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      sessionRef.current = null;
    };

    const init = async () => {
      try {
        const cameraKit = await bootstrapCameraKit({
          apiToken: import.meta.env.VITE_SNAP_API_TOKEN
        });

        const session = await cameraKit.createSession({
          liveRenderTarget: canvasRef.current
        });

        sessionRef.current = session;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user" }
        });

        streamRef.current = stream;

        const source = createMediaStreamSource(stream, {
          cameraType: "user",
          transform: Transform2D.MirrorX
        });

        await session.setSource(source);

        const lens = await cameraKit.lensRepository.loadLens(
          resolvedLensId,
          import.meta.env.VITE_SNAP_LENS_GROUP_ID
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
        } else if (String(error?.message || "").toLowerCase().includes("permission denied")) {
          setStatus("error");
          setErrorMessage(
            "This lens is not accessible to the current Camera Kit app. Add the lens to the configured Lens Group, save changes in Lens Scheduler, and make sure the API token belongs to the same Camera Kit organization."
          );
        } else if (String(error?.message || "").toLowerCase().includes("lens not found")) {
          setStatus("error");
          setErrorMessage(
            `Lens ID ${resolvedLensId} is saved in the product, but Snap Camera Kit cannot find it inside Lens Group ${lensGroupId}. Add/publish this exact lens to that Lens Group in Snap Lens Manager, then try again.`
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
  }, [open, resolvedLensId, retryNonce]);

  const handleRetry = () => {
    setStatus("idle");
    setErrorMessage("");
    setRetryNonce((prev) => prev + 1);
  };

  return (
    <AnimatePresence>
      {open && resolvedLensId && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ willChange: "opacity, transform", transform: "translateZ(0)" }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-5xl transform-gpu rounded-2xl border border-border bg-card p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ willChange: "opacity, transform", transform: "translateZ(0)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-text">Virtual Try-On</h3>
              <button type="button" onClick={onClose} className="pill-button bg-bg text-text hover:bg-card">
                Close
              </button>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
              {status === "loading" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/92 backdrop-blur-sm">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
                  <p className="text-sm font-normal text-text">Camera Initializing...</p>
                </div>
              )}

              {status === "denied" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/92 px-6 text-center backdrop-blur-sm">
                  <p className="text-base font-medium text-text">Camera access is required for Virtual Try-On</p>
                  <button type="button" onClick={handleRetry} className="pill-button bg-accent text-white">
                    Try Again
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/92 px-6 text-center backdrop-blur-sm">
                  <p className="max-w-xl text-base font-medium text-text">
                    {errorMessage || "Unable to load the virtual try-on experience."}
                  </p>
                  <button type="button" onClick={handleRetry} className="pill-button bg-accent text-white">
                    Try Again
                  </button>
                </div>
              )}

              <canvas
                key={`${open}-${retryNonce}`}
                ref={canvasRef}
                className="aspect-[9/16] max-h-[78vh] min-h-[420px] w-full md:aspect-[16/10]"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ARModal;
