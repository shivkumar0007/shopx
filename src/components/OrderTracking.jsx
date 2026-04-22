import { motion } from "framer-motion";
import { Check, PackageCheck, Truck } from "lucide-react";

const ORDER_STEPS = [
  { label: "Processing", icon: PackageCheck },
  { label: "Shipped", icon: Truck },
  { label: "Delivered", icon: Check }
];

const MotionDiv = motion.div;

const OrderTracking = ({ orderStatus = "Processing" }) => {
  const activeIndex = Math.max(
    ORDER_STEPS.findIndex((step) => step.label === orderStatus),
    0
  );

  return (
    <div className="w-full rounded-[1.4rem] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        {ORDER_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div key={step.label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center text-center">
                <MotionDiv
                  animate={isCurrent ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={isCurrent ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border ${
                    isActive ? "border-accent bg-accent text-white" : "border-text/20 text-text/20"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.9} />
                </MotionDiv>
                <p className={`mt-2 text-xs font-medium ${isActive ? "text-accent" : "text-text/20"}`}>
                  {step.label}
                </p>
              </div>

              {index < ORDER_STEPS.length - 1 ? (
                <div className="mt-5 h-px flex-1 overflow-hidden rounded-full bg-text/10">
                  <MotionDiv
                    initial={false}
                    animate={{ width: index < activeIndex ? "100%" : "0%" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="h-full bg-accent"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTracking;
