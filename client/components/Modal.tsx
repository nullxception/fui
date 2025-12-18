import { AnimatePresence, motion } from "motion/react";
import { useRef, type ReactNode } from "react";
import ReactDOM from "react-dom";

export default function Modal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return ReactDOM.createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          layoutId="rootModalFade"
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0)" }}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          ref={ref}
          className="fixed inset-0 z-5 flex items-center-safe justify-center bg-background/75 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === ref.current) {
              onClose();
            }
          }}
        >
          <motion.div
            layoutId="rootModalFadeZoom"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            ref={ref}
            className="flex items-center-safe justify-center"
            onClick={(e) => {
              if (e.target === ref.current) {
                onClose();
              }
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
