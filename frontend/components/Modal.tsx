
import React from 'react';
// FIX: Import `Variants` from `framer-motion` to explicitly type the modal variants object.
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const backdrop = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

// FIX: Explicitly type `modal` with `Variants` to resolve type incompatibility error.
const modal: Variants = {
  hidden: { y: "-50vh", opacity: 0 },
  visible: {
    y: "0",
    opacity: 1,
    transition: { delay: 0.2, type: "spring", stiffness: 120 },
  },
  exit: { y: "50vh", opacity: 0, transition: { duration: 0.3 } }
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="bg-brand-secondary rounded-lg shadow-xl w-full max-w-md m-4 border border-brand-border"
            variants={modal}
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-brand-border">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;