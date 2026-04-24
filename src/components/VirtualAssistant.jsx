/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/immutability */
import axios from "axios";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Html, useAnimations, useFBX } from "@react-three/drei";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { LoopOnce, LoopRepeat } from "three";
import ProductImage from "./ProductImage.jsx";
import { API_BASE_URL } from "../config/api.js";

const IDLE_PATH = "/models/Breathing Idle.fbx";
const GREETING_PATH = "/models/Waving.fbx";
const TALKING_PATH = "/models/Talking.fbx";
const TRANSITION = 0.4;
const MODEL_LOAD_TIMEOUT_MS = 8000;

const initialAssistantMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Hi! I am your ShopX AI assistant. Ask me about products, gifts, price range, styles, or order help and I will also show matching products below.",
  products: []
};

const renameClip = (fbx, name) => {
  const clip = fbx?.animations?.[0]?.clone();
  if (!clip) return null;
  clip.name = name;
  return clip;
};

const shouldUse3DAssistant = () => {
  if (typeof window === "undefined") return false;

  const supportsMatchMedia = typeof window.matchMedia === "function";
  const smallViewport = supportsMatchMedia ? window.matchMedia("(max-width: 768px)").matches : window.innerWidth <= 768;
  const coarsePointer = supportsMatchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = connection?.saveData === true;
  const deviceMemory = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : null;
  const hardwareConcurrency = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : null;

  try {
    const canvas = document.createElement("canvas");
    const hasWebGL = Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));

    if (!hasWebGL) {
      return false;
    }
  } catch {
    return false;
  }

  const constrainedDevice =
    saveData || (deviceMemory !== null && deviceMemory <= 4) || (hardwareConcurrency !== null && hardwareConcurrency <= 4);

  return !(smallViewport || coarsePointer || constrainedDevice);
};

const AssistantModel = ({ isSpeaking = false, text = "", onReady, onSpeechStateChange }) => {
  const groupRef = useRef(null);
  const actionRef = useRef(null);
  const utteranceRef = useRef(null);
  const voicesChangedHandlerRef = useRef(null);
  const greetingDoneRef = useRef(false);
  const greetingPlayedRef = useRef(false);
  const speakingRef = useRef(isSpeaking);

  const idleFBX = useFBX(IDLE_PATH);
  const greetingFBX = useFBX(GREETING_PATH);
  const talkingFBX = useFBX(TALKING_PATH);

  const character = useMemo(() => SkeletonUtils.clone(idleFBX), [idleFBX]);
  const clips = useMemo(
    () =>
      [renameClip(idleFBX, "Idle"), renameClip(greetingFBX, "Greeting"), renameClip(talkingFBX, "Talking")].filter(
        Boolean
      ),
    [idleFBX, greetingFBX, talkingFBX]
  );

  const { actions, mixer } = useAnimations(clips, groupRef);
  const [isSynthSpeaking, setIsSynthSpeaking] = useState(false);
  const effectiveSpeaking = isSpeaking || isSynthSpeaking;

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    speakingRef.current = effectiveSpeaking;
  }, [effectiveSpeaking]);

  useEffect(() => {
    onSpeechStateChange?.(isSynthSpeaking);
  }, [isSynthSpeaking, onSpeechStateChange]);

  const fadeToAction = useCallback(
    (name, duration = TRANSITION) => {
      const nextAction = actions?.[name];
      if (!nextAction) return;

      nextAction.reset();
      nextAction.setLoop(name === "Greeting" ? LoopOnce : LoopRepeat, name === "Greeting" ? 1 : Infinity);
      nextAction.clampWhenFinished = name === "Greeting";

      const previousAction = actionRef.current;
      if (previousAction && previousAction !== nextAction) {
        nextAction.enabled = true;
        nextAction.crossFadeFrom(previousAction, duration, true);
        nextAction.play();
      } else if (!nextAction.isRunning()) {
        nextAction.fadeIn(duration);
        nextAction.play();
      }

      actionRef.current = nextAction;
    },
    [actions]
  );

  useEffect(() => {
    if (!mixer || !actions || greetingPlayedRef.current) return;

    const greetingAction = actions.Greeting;
    const idleAction = actions.Idle;

    if (!greetingAction || !idleAction) {
      greetingDoneRef.current = true;
      greetingPlayedRef.current = true;
      fadeToAction(speakingRef.current ? "Talking" : "Idle");
      return;
    }

    const handleFinished = (event) => {
      if (event.action !== greetingAction) return;
      greetingDoneRef.current = true;
      fadeToAction(speakingRef.current ? "Talking" : "Idle", 0.55);
    };

    greetingPlayedRef.current = true;
    mixer.addEventListener("finished", handleFinished);
    fadeToAction("Greeting", 0.2);

    return () => mixer.removeEventListener("finished", handleFinished);
  }, [actions, fadeToAction, mixer]);

  useEffect(() => {
    if (!actions || !greetingDoneRef.current) return;
    fadeToAction(effectiveSpeaking ? "Talking" : "Idle");
  }, [actions, effectiveSpeaking, fadeToAction]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmedText);
    utteranceRef.current = utterance;

    const assignVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (voice) =>
            voice.lang.toLowerCase().startsWith("en") &&
            /(female|google|samantha|zira|aria|jenny)/i.test(voice.name)
        ) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith("en-in")) ||
        voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1;
      utterance.pitch = 1.08;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      assignVoice();
    } else {
      const handleVoicesChanged = () => assignVoice();
      voicesChangedHandlerRef.current = handleVoicesChanged;
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    }

    utterance.onstart = () => setIsSynthSpeaking(true);
    utterance.onend = () => {
      setIsSynthSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSynthSpeaking(false);
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      if (voicesChangedHandlerRef.current) {
        window.speechSynthesis.removeEventListener("voiceschanged", voicesChangedHandlerRef.current);
        voicesChangedHandlerRef.current = null;
      }

      if (utteranceRef.current === utterance) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
        setIsSynthSpeaking(false);
      }
    };
  }, [text]);

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  return (
    <group ref={groupRef} position={[0, -2.2, 0]} rotation={[0, -0.18, 0]} dispose={null}>
      <primitive object={character} scale={0.022} />
    </group>
  );
};

const LoadingFallback = () => (
  <Html center>
    <div
      style={{
        background: "rgba(0, 0, 0, 0.6)",
        color: "white",
        padding: "8px 16px",
        borderRadius: "999px",
        fontSize: "11px",
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(12px)",
        whiteSpace: "nowrap"
      }}
    >
      Loading assistant...
    </div>
  </Html>
);

const LiteAssistantStage = () => (
  <div
    style={{
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background:
        "radial-gradient(circle at top, rgba(99,102,241,0.36) 0%, rgba(37,99,235,0.16) 32%, rgba(2,4,18,0.92) 72%)"
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: "14% 18% auto",
        height: "44%",
        borderRadius: "999px",
        background: "radial-gradient(circle, rgba(139,92,246,0.42) 0%, rgba(99,102,241,0.12) 55%, transparent 72%)",
        filter: "blur(18px)"
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "1.5rem",
        textAlign: "center"
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 88,
          height: 88,
          borderRadius: "28px",
          color: "white",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "0.14em",
          background: "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(139,92,246,0.94) 100%)",
          boxShadow: "0 18px 55px rgba(99,102,241,0.35)"
        }}
      >
        AI
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)"
          }}
        >
          Mobile Optimized
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 600, color: "white" }}>ShopX Assistant</p>
        <p style={{ margin: "10px auto 0", maxWidth: 260, fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.68)" }}>
          3D avatar is turned off on this device so the assistant opens faster and does not get stuck on loading.
        </p>
      </div>
    </div>
  </div>
);

const MessageBubble = ({ message }) => (
  <div
    style={{
      display: "flex",
      justifyContent: message.role === "user" ? "flex-end" : "flex-start",
      marginBottom: 8
    }}
  >
    <div
      style={{
        maxWidth: "84%",
        padding: "10px 14px",
        borderRadius: message.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background:
          message.role === "user"
            ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            : "rgba(255,255,255,0.08)",
        border: message.role === "user" ? "none" : "1px solid rgba(255,255,255,0.1)",
        color: "white",
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: "pre-wrap"
      }}
    >
      {message.content}
    </div>
  </div>
);

const SuggestedProductCard = ({ product, onOpen }) => (
  <Link
    to={`/products/${product._id}`}
    onClick={onOpen}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: 10,
      borderRadius: 18,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.1)",
      textDecoration: "none",
      color: "white",
      transition: "transform 0.2s ease, border-color 0.2s ease, background 0.2s ease"
    }}
  >
    <ProductImage
      src={product.image}
      alt={product.name}
      className="h-16 w-16 rounded-2xl object-cover"
    />
    <div style={{ minWidth: 0, flex: 1 }}>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          color: "white",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
      >
        {product.name}
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.5)"
        }}
      >
        {product.category}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: "#8b5cf6" }}>
        Rs. {product.price}
      </p>
    </div>
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#c4b5fd",
        whiteSpace: "nowrap"
      }}
    >
      Open
    </span>
  </Link>
);

const TypingDots = () => (
  <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "10px 14px",
        borderRadius: "18px 18px 18px 4px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)"
      }}
    >
      {[0, 0.18, 0.36].map((delay, index) => (
        <span
          key={index}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.45)",
            display: "inline-block",
            animation: `va-bounce 0.9s ${delay}s infinite`
          }}
        />
      ))}
    </div>
  </div>
);

const ChatBubbleButton = ({ onClick, isOpen, hasNew }) => (
  <button
    onClick={onClick}
    style={{
      position: "fixed",
      bottom: "1.5rem",
      left: "1.5rem",
      zIndex: 40,
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      border: "none",
      cursor: "pointer",
      boxShadow: "0 8px 32px rgba(99,102,241,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      transform: isOpen ? "scale(0.92)" : "scale(1)"
    }}
    aria-label="Open virtual assistant"
  >
    {hasNew && !isOpen ? (
      <span
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          width: 11,
          height: 11,
          borderRadius: "50%",
          background: "#6ee7b7",
          border: "2px solid #7c3aed",
          animation: "va-pulse 2s infinite"
        }}
      />
    ) : null}

    {isOpen ? (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 5l10 10M15 5l-10 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ) : (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="11" r="1" fill="white" />
        <circle cx="12" cy="11" r="1" fill="white" />
        <circle cx="15.5" cy="11" r="1" fill="white" />
      </svg>
    )}
  </button>
);

const VirtualAssistant = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([initialAssistantMessage]);
  const [currentSpeechText, setCurrentSpeechText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const [deviceSupports3D, setDeviceSupports3D] = useState(() => shouldUse3DAssistant());
  const [forceLiteMode, setForceLiteMode] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const renderMode = deviceSupports3D && !forceLiteMode ? "3d" : "lite";

  const statusLabel = isThinking ? "Thinking..." : isSpeechPlaying ? "Speaking..." : "Ready";
  const statusStyles = isThinking
    ? {
        color: "#fde68a",
        background: "rgba(251,191,36,0.12)",
        borderColor: "rgba(251,191,36,0.28)"
      }
    : isSpeechPlaying
      ? {
          color: "#6ee7b7",
          background: "rgba(52,211,153,0.1)",
          borderColor: "rgba(52,211,153,0.25)"
        }
      : {
          color: "rgba(255,255,255,0.45)",
          background: "rgba(255,255,255,0.05)",
          borderColor: "rgba(255,255,255,0.08)"
        };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncAssistantMode = () => {
      setDeviceSupports3D(shouldUse3DAssistant());
    };

    syncAssistantMode();
    window.addEventListener("resize", syncAssistantMode);

    return () => window.removeEventListener("resize", syncAssistantMode);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 320);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || renderMode !== "3d" || avatarReady) return undefined;

    const timer = window.setTimeout(() => {
      setForceLiteMode(true);
      setAvatarReady(false);
    }, MODEL_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [avatarReady, open, renderMode]);

  const resetAssistantPresentation = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setCurrentSpeechText("");
    setIsSpeechPlaying(false);
    setForceLiteMode(false);
    setAvatarReady(false);
  }, []);

  const toggleAssistant = useCallback(() => {
    if (open) {
      setOpen(false);
      resetAssistantPresentation();
      return;
    }

    setHasNew(false);
    setForceLiteMode(false);
    setAvatarReady(false);
    setOpen(true);
  }, [open, resetAssistantPresentation]);

  const closeAssistant = useCallback(() => {
    setOpen(false);
    resetAssistantPresentation();
  }, [resetAssistantPresentation]);

  const sendMessage = useCallback(
    async (event) => {
      event?.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput || isThinking) return;

      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmedInput,
        products: []
      };

      const nextHistory = messages.map(({ role, content }) => ({
        role,
        text: content
      }));

      setMessages((previousMessages) => [...previousMessages, userMessage]);
      setInput("");
      setIsThinking(true);

      try {
        const { data } = await axios.post(`${API_BASE_URL}/ai/chat`, {
          message: trimmedInput,
          history: nextHistory
        });

        const assistantText =
          data?.reply ||
          "I could not prepare a full answer right now, but I can still help if you try again.";
        const assistantMessage = {
          id: `assistant-${Date.now() + 1}`,
          role: "assistant",
          content: assistantText,
          products: Array.isArray(data?.relatedProducts) ? data.relatedProducts : []
        };

        setMessages((previousMessages) => [...previousMessages, assistantMessage]);
        setCurrentSpeechText("");
        window.setTimeout(() => setCurrentSpeechText(assistantText), 60);

      } catch (error) {
        const errorText =
          error?.response?.data?.message ||
          "ShopX assistant is not reachable right now. Please try again in a moment.";
        const errorMessage = {
          id: `assistant-error-${Date.now() + 1}`,
          role: "assistant",
          content: errorText,
          products: []
        };

        setMessages((previousMessages) => [...previousMessages, errorMessage]);
        setCurrentSpeechText("");
        window.setTimeout(() => setCurrentSpeechText(errorText), 60);
      } finally {
        setIsThinking(false);
      }
    },
    [input, isThinking, messages, open]
  );

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <ChatBubbleButton onClick={toggleAssistant} isOpen={open} hasNew={hasNew} />

      {open ? (
        <>
          <div
            onClick={closeAssistant}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 45,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              animation: "va-fadein 0.2s ease"
            }}
          />

          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 50,
              width: "min(28rem, calc(100vw - 2rem))",
              height: "min(44rem, 90vh)",
              borderRadius: "2rem",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(175deg, rgba(12,18,40,0.99) 0%, rgba(2,4,18,1) 100%)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.75), 0 0 0 1px rgba(99,102,241,0.18)",
              display: "flex",
              flexDirection: "column",
              animation: "va-slideup 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}
          >
            <div style={{ position: "relative", flex: "0 0 50%", minHeight: 0 }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  pointerEvents: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px 18px"
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.35em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.42)",
                      margin: 0
                    }}
                  >
                    SHOPX AI
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "white", margin: "3px 0 0" }}>
                    Virtual Assistant
                  </p>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: `1px solid ${statusStyles.borderColor}`,
                    borderRadius: "999px",
                    padding: "4px 13px",
                    transition: "all 0.35s",
                    pointerEvents: "none",
                    color: statusStyles.color,
                    background: statusStyles.background
                  }}
                >
                  {statusLabel}
                </div>
              </div>

              <button
                onClick={closeAssistant}
                style={{
                  position: "absolute",
                  top: 13,
                  right: 13,
                  zIndex: 20,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                aria-label="Close assistant"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5l-10 10" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                </svg>
              </button>

              {renderMode === "3d" ? (
                <Canvas
                  shadows
                  camera={{ position: [0, 1.2, 4.2], fov: 38 }}
                  dpr={[1, 2]}
                  gl={{ antialias: true, alpha: true }}
                  style={{ width: "100%", height: "100%" }}
                >
                  <Suspense fallback={<LoadingFallback />}>
                    <ambientLight intensity={0.9} />
                    <spotLight
                      position={[4.5, 8, 5.5]}
                      angle={0.28}
                      penumbra={1}
                      intensity={80}
                      castShadow
                      shadow-bias={-0.0001}
                    />
                    <directionalLight position={[-3, 5, 2]} intensity={1.2} />
                    <AssistantModel
                      isSpeaking={isSpeechPlaying}
                      text={currentSpeechText}
                      onReady={() => setAvatarReady(true)}
                      onSpeechStateChange={setIsSpeechPlaying}
                    />
                    <Environment preset="city" />
                    <ContactShadows
                      position={[0, -2.4, 0]}
                      opacity={0.4}
                      scale={6}
                      blur={2.5}
                      far={4}
                      resolution={512}
                    />
                  </Suspense>
                </Canvas>
              ) : (
                <LiteAssistantStage />
              )}

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 52,
                  background: "linear-gradient(transparent, rgba(2,4,18,1))",
                  pointerEvents: "none"
                }}
              />
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                borderTop: "1px solid rgba(255,255,255,0.06)"
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 16px 0",
                  scrollbarWidth: "none"
                }}
              >
                {messages.map((message) => (
                  <div key={message.id} style={{ marginBottom: 12 }}>
                    <MessageBubble message={message} />

                    {message.role === "assistant" && message.products?.length ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          marginTop: -2,
                          paddingLeft: 2
                        }}
                      >
                        {message.products.map((product) => (
                          <SuggestedProductCard
                            key={product._id}
                            product={product}
                            onOpen={closeAssistant}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {isThinking ? <TypingDots /> : null}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={sendMessage}
                style={{
                  padding: "10px 14px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center"
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ask ShopX AI about products, budget, gifting, or orders..."
                  disabled={isThinking}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.11)",
                    borderRadius: "999px",
                    padding: "11px 16px",
                    color: "white",
                    fontSize: 13,
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  disabled={isThinking || !input.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background:
                      isThinking || !input.trim()
                        ? "rgba(255,255,255,0.07)"
                        : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    border: "none",
                    cursor: isThinking || !input.trim() ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isThinking || !input.trim() ? 0.45 : 1
                  }}
                  aria-label="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </>
      ) : null}

      <style>{`
        @keyframes va-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes va-slideup {
          from { opacity: 0; transform: translate(-50%, -47%) scale(0.94); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        @keyframes va-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-5px); opacity: 1; }
        }

        @keyframes va-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }

        *::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

export default VirtualAssistant;
