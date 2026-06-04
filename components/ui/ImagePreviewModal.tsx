import React from "react";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "./Portal";

interface ImagePreviewModalProps {
  imageUrl: string | null;
  mediaType?: string;
  onClose: () => void;
}

const ImagePreviewModal = ({ imageUrl, mediaType, onClose }: ImagePreviewModalProps) => {
  if (!imageUrl) return null;

  const isVideo = mediaType === "video" || 
    imageUrl.toLowerCase().endsWith(".mp4") || 
    imageUrl.toLowerCase().endsWith(".webm") || 
    imageUrl.toLowerCase().endsWith(".ogg") || 
    imageUrl.toLowerCase().endsWith(".mov");

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = imageUrl.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <Portal>
      <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-10"
        onClick={onClose}
      >
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
          <button
            onClick={handleDownload}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
            title="Download file"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative max-w-5xl w-full h-full flex items-center justify-center cursor-zoom-out"
        >
          {isVideo ? (
            <video
              src={imageUrl}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
            />
          ) : (
            <img
              src={imageUrl}
              alt="Preview"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none cursor-default"
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </Portal>
  );
};

export default ImagePreviewModal;
