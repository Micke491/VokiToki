import React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useGiphyPicker } from "../hooks/useGiphyPicker";

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const { search, setSearch, items: gifs, loading, error, scrollRef } = useGiphyPicker("gifs");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-20 left-4 right-4 md:left-auto md:right-auto md:w-[400px] h-[450px] bg-chat-glass backdrop-blur-2xl border border-chat-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[100]"
    >
      <div className="p-4 border-b border-chat-border flex items-center gap-3 bg-chat-bg-secondary/50 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-chat-text-tertiary" />
          <input
            type="text"
            autoFocus
            placeholder="Search GIPHY..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-chat-bg-primary border border-chat-border rounded-full text-sm text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all"
          />
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-chat-hover rounded-full text-chat-text-tertiary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-chat-text-tertiary gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-chat-accent" />
            <p className="text-xs font-medium">Fetching awesome GIFs...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-chat-text-tertiary">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <motion.div
                key={gif.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(gif.images.fixed_height.url)}
                className="relative aspect-video bg-chat-bg-secondary rounded-lg overflow-hidden cursor-pointer group"
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHRreXQ0Yzh0eHR4eHR4eHR4eHR4eHR4eHR4eHR4eHR4eHR4eHR4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKMGpxN8XW8Dk4M/giphy.gif";
                  }}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-chat-text-tertiary">
            <p className="text-sm font-medium">No GIFs found</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-chat-border flex items-center justify-center bg-chat-bg-secondary gap-3">
        <span className="text-xs uppercase tracking-widest font-bold text-chat-text-primary">Powered by</span>
        <img
          src="https://giphy.com/static/img/powered_by_giphy_light.png"
          alt="GIPHY"
          className="h-5 opacity-100 drop-shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          onClick={() => window.open('https://giphy.com', '_blank')}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <span
          className="text-lg font-black tracking-tighter text-white"
          style={{ textShadow: '2px 2px 0px #cf0a2c, -2px -2px 0px #00ff99' }}
        >
          GIPHY
        </span>
      </div>
    </motion.div>
  );
};

export default GifPicker;
