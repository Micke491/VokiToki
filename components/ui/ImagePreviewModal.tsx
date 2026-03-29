import React from "react";
import { X, Download, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePreviewModal = ({ imageUrl, onClose }: ImagePreviewModalProps) => {
  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative max-w-5xl w-full h-full flex items-center justify-center cursor-zoom-out"
        >
          
          {/* Main Image */}
          <img
            src={imageUrl}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none cursor-default"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImagePreviewModal;
