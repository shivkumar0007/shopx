/* eslint-disable react-hooks/immutability */
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Html, useAnimations, useFBX } from "@react-three/drei";
import { LoopOnce, LoopRepeat } from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

const IDLE_PATH = "/models/Breathing Idle.fbx";
const GREETING_PATH = "/models/Waving.fbx";
const TALKING_PATH = "/models/Talking.fbx";
const TRANSITION = 0.35;

const renameClip = (fbx, name) => {
  const clip = fbx?.animations?.[0]?.clone();
  if (!clip) return null;
  clip.name = name;
  return clip;
};

const AssistantAvatar = ({ active }) => {
  const groupRef = useRef(null);
  const actionRef = useRef(null);
  const greetingDoneRef = useRef(false);
  const greetingPlayedRef = useRef(false);
  const activeRef = useRef(active);

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

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

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
      fadeToAction(activeRef.current ? "Talking" : "Idle");
      return;
    }

    const handleFinished = (event) => {
      if (event.action !== greetingAction) return;
      greetingDoneRef.current = true;
      fadeToAction(activeRef.current ? "Talking" : "Idle", 0.5);
    };

    greetingPlayedRef.current = true;
    mixer.addEventListener("finished", handleFinished);
    fadeToAction("Greeting", 0.15);

    return () => mixer.removeEventListener("finished", handleFinished);
  }, [actions, fadeToAction, mixer]);

  useEffect(() => {
    if (!actions || !greetingDoneRef.current) return;
    fadeToAction(active ? "Talking" : "Idle");
  }, [actions, active, fadeToAction]);

  return (
    <group ref={groupRef} position={[0, -2.1, 0]} rotation={[0, -0.2, 0]} dispose={null}>
      <primitive object={character} scale={0.021} />
    </group>
  );
};

const LoadingFallback = () => (
  <Html center>
    <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70">
      Loading
    </div>
  </Html>
);

// --- Text-to-Speech hook ---
const useSpeech = () => {
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  const speak = useCallback((text) => {
    const synth = synthRef.current;
    if (!synth) return;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    utterance.volume = 0.92;

    // Pick a good voice if available
    const voices = synth.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("google") ||
          v.name.toLowerCase().includes("samantha"))
    );
    if (preferred) utterance.voice = preferred;

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    synthRef.current?.cancel();
  }, []);

  return { speak, cancel };
};

const AssistantMiniBot = ({ message, active }) => {
  const { speak, cancel } = useSpeech();
  const lastMessageRef = useRef("");

  useEffect(() => {
    if (!message || message === lastMessageRef.current) return;
    lastMessageRef.current = message;

    // Small delay so user has settled near shelf/counter
    const timer = setTimeout(() => {
      speak(message);
    }, 400);

    return () => {
      clearTimeout(timer);
      cancel();
    };
  }, [message, speak, cancel]);

  return (
    <Motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none fixed bottom-5 left-5 z-20 flex max-w-[18rem] items-end gap-3 sm:bottom-6 sm:left-6"
    >
      <div className="pointer-events-auto h-28 w-24 overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0b1020]/95 shadow-[0_20px_60px_rgba(15,23,42,0.38)]">
        <Canvas camera={{ position: [0, 1.2, 4], fov: 36 }} gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={<LoadingFallback />}>
            <ambientLight intensity={1} />
            <directionalLight position={[3, 5, 4]} intensity={1.6} />
            <AssistantAvatar active={active} />
            <Environment preset="city" />
            <ContactShadows position={[0, -2.3, 0]} opacity={0.4} scale={5} blur={2.2} far={4} />
          </Suspense>
        </Canvas>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <Motion.div
          key={message}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto rounded-[1.4rem] border border-white/15 bg-[#11182f]/95 px-4 py-3 text-sm leading-6 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)] backdrop-blur-md"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#87f2d3]">Shopx AI</p>
          <p className="mt-1 text-sm text-white/90">{message}</p>
        </Motion.div>
      </AnimatePresence>
    </Motion.div>
  );
};

useFBX.preload(IDLE_PATH);
useFBX.preload(GREETING_PATH);
useFBX.preload(TALKING_PATH);

export default AssistantMiniBot;