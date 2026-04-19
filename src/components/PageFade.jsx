import { motion } from "framer-motion";

const PageFade = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
    className="w-full transform-gpu"
    style={{ willChange: "opacity, transform", transform: "translateZ(0)" }}
  >
    {children}
  </motion.div>
);

export default PageFade;
