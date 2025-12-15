import { AnimatePresence, motion } from "framer-motion";
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
          transition={{ duration: 0.3 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          ref={ref}
          className="fixed inset-0 z-5 flex items-center-safe justify-center bg-background/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === ref.current) {
              onClose();
            }
          }}
        >
          <motion.div
            layoutId="rootModalFadeZoom"
            transition={{ duration: 0.3 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
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
