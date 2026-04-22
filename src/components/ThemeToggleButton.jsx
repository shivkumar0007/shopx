import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeContext.jsx";

const MotionButton = motion.button;
const MotionDiv = motion.div;

const spring = {
  type: "spring",
  stiffness: 280,
  damping: 18
};

const ThemeToggleButton = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <MotionButton
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.95 }}
      transition={spring}
      className="icon-pill relative overflow-hidden border border-border bg-card p-2.5 hover:bg-card"
      aria-label="Toggle theme"
    >
      <MotionDiv
        animate={{
          rotate: isDark ? 180 : 0,
          scale: isDark ? 1.04 : 1
        }}
        transition={spring}
        className="relative h-[18px] w-[18px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <MotionDiv
              key="moon"
              initial={{ opacity: 0, rotate: 90, scale: 0.45, y: -4 }}
              animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.45, y: 4 }}
              transition={spring}
              className="absolute inset-0"
            >
              <Moon size={18} className="text-text" />
            </MotionDiv>
          ) : (
            <MotionDiv
              key="sun"
              initial={{ opacity: 0, rotate: -90, scale: 0.45, y: 4 }}
              animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.45, y: -4 }}
              transition={spring}
              className="absolute inset-0"
            >
              <Sun size={18} className="text-text" />
            </MotionDiv>
          )}
        </AnimatePresence>
      </MotionDiv>
    </MotionButton>
  );
};

export default ThemeToggleButton;
