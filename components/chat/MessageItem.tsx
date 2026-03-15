import React, { useRef, useEffect } from "react";
import { Mic, Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { motion, useAnimation } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { Message } from "../../types/chat";
import MessageStatusIcon from "../ui/MessageStatusIcon";
import AudioPlayer from "../ui/AudioPlayer";
import LinkPreview from "../ui/LinkPreview";
import HighlightText from "../ui/HighlightText";

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  searchQuery: string;
  isOwn: boolean;
  showDate: boolean;
  dateLabel?: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReaction: (emojiData: EmojiClickData, messageId: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  scrollToBottom: () => void;
  showEmojiPicker: string | null;
  setShowEmojiPicker: (id: string | null) => void;
  chatId: string;
  isGroup?: boolean;
  groupAdminId?: string;
}

const MessageItem = ({
  message,
  currentUserId,
  searchQuery,
  isOwn,
  showDate,
  dateLabel,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onRemoveReaction,
  scrollToBottom,
  showEmojiPicker,
  setShowEmojiPicker,
  chatId,
  isGroup,
  groupAdminId,
}: MessageItemProps) => {
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowEmojiPicker]);

  const bind = useDrag(
    ({ down, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy] }) => {
      // Only enable on mobile
      if (typeof window !== "undefined" && window.innerWidth >= 768) return;

      const triggerDistance = 60;
      const isSwipingCorrectDirection = isOwn ? mx < 0 : mx > 0;

      if (!isSwipingCorrectDirection) {
        if (!down) controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });
        return;
      }

      if (down) {
        controls.start({
          x: mx,
          transition: { type: "spring", stiffness: 400, damping: 40 },
        });
      } else {
        controls.start({
          x: 0,
          transition: { type: "spring", stiffness: 300, damping: 30 },
        });
        if (
          Math.abs(mx) > triggerDistance ||
          (Math.abs(vx) > 0.5 && Math.abs(mx) > 20)
        ) {
          onReply(message);
        }
      }
    },
    { axis: "x", filterTaps: true }
  );

  useEffect(() => {
    controls.set({ x: 0 });
  }, [controls]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleReplyClick = () => {
    const replyElement = document.getElementById(`message-${message.replyTo?._id}`);
    if (replyElement) {
      replyElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      replyElement.classList.add("ring-2", "ring-chat-accent");
      setTimeout(() => {
        replyElement.classList.remove("ring-2", "ring-chat-accent");
      }, 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      key={message._id}
      className="relative"
    >
      {showDate && dateLabel && (
        <div className="flex justify-center sticky top-0 z-10 mb-4 pt-2 pointer-events-none">
          <span className="px-3 py-1 text-xs font-semibold text-chat-text-tertiary bg-chat-bg-primary/80 backdrop-blur rounded-full shadow-sm border border-chat-border">
            {dateLabel}
          </span>
        </div>
      )}

      {message.isSystemMessage ? (
        <div className="flex justify-center my-4 w-full">
           <span className="px-4 py-2 text-[11px] font-medium text-chat-text-tertiary bg-chat-bg-secondary border border-chat-border rounded-lg text-center shadow-sm max-w-[85%] mx-auto">
             {message.text}
           </span>
        </div>
      ) : (
        <motion.div
          id={`message-${message._id}`}
          className={`group flex flex-col ${isOwn ? "items-end" : "items-start"} mb-2 transition-all duration-300 relative z-10 touch-pan-y`}
          {...(bind() as any)}
          animate={controls}
        >
          {/* Reply Context */}
          {message.replyTo && !message.isDeletedForEveryone && (
            <div
              className={`
                    flex items-center gap-2 mb-1 text-xs text-chat-text-tertiary 
                    ${isOwn ? "mr-2 flex-row-reverse" : "ml-12"}
                    opacity-70 hover:opacity-100 transition-opacity cursor-pointer
                `}
            >
              <div className="w-1 h-3 bg-chat-border rounded-full"></div>
              <span>Replying to {message.replyTo.sender.username}</span>
            </div>
          )}

          <div
            className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] min-w-0 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar (Partner) */}
            {!isOwn && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chat-bg-secondary flex items-center justify-center text-xs font-bold text-chat-text-secondary select-none overflow-hidden">
                {message.sender.avatar ? (
                  <img
                    src={message.sender.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  message.sender.username.charAt(0).toUpperCase()
                )}
              </div>
            )}

            {/* Bubble */}
            <div className="relative group/bubble flex flex-col">
              {isGroup && !isOwn && (
                <div className="flex items-center gap-1.5 mb-1 ml-1 px-1">
                  <span className="text-[11px] font-bold text-chat-text-tertiary truncate max-w-[120px]">
                    {message.sender.username}
                  </span>
                </div>
              )}
              
              {message.isForwarded && (
                 <div className={`flex items-center gap-1 mb-1 text-[10.5px] font-semibold text-chat-text-tertiary/70 italic ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Forwarded
                 </div>
              )}

              {message.isPinned && (
                <div className={`flex items-center gap-1 mb-1 text-[10px] font-bold text-chat-text-tertiary/60 capitalize ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Pinned
                </div>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm relative min-w-0 [overflow-wrap:anywhere] [word-break:break-word]
                      ${
                        isOwn
                          ? "bg-chat-accent text-white rounded-br-none"
                          : "bg-chat-bg-secondary text-chat-text-primary rounded-bl-none"
                      }
                      ${message.isDeletedForEveryone ? "italic opacity-60" : ""}
                  `}
              >
                {!message.isDeletedForEveryone && message.replyTo && (
                  <div
                    onClick={handleReplyClick}
                    className={`
                              flex mb-2 p-2 rounded text-xs border-l-2 opacity-90 cursor-pointer hover:opacity-100 transition-opacity
                              ${
                                isOwn
                                  ? "bg-white/10 border-white/30 hover:bg-white/20 text-white"
                                  : "bg-chat-bg-primary/50 border-chat-border hover:bg-chat-bg-primary/70 text-chat-text-primary"
                              }
                          `}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold mb-0.5 opacity-75">
                        {message.replyTo.sender.username}
                      </p>
                      <p className="line-clamp-1 truncate">
                        {message.replyTo.text ||
                          (message.replyTo.mediaUrl
                            ? message.replyTo.mediaType === "video"
                              ? "Video"
                              : message.replyTo.mediaType === "audio"
                                ? "Voice record"
                                : "Photo"
                            : "")}
                      </p>
                    </div>
                    {message.replyTo.mediaUrl && (
                      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border border-white/20 ml-2">
                        {message.replyTo.mediaType === "video" ? (
                          <div className="w-full h-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-chat-text-tertiary"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        ) : message.replyTo.mediaType === "audio" ? (
                          <div className="w-full h-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                            <Mic className="w-6 h-6 text-chat-text-tertiary" />
                          </div>
                        ) : (
                          <img
                            src={message.replyTo.mediaUrl}
                            className="w-full h-full object-cover"
                            alt="Reply preview"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {message.mediaUrl && !message.isDeletedForEveryone && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-chat-border max-w-[320px] bg-chat-bg-secondary relative group">
                    {message.mediaType === "video" ? (
                      <div className="relative">
                        <video
                          src={message.mediaUrl}
                          controls
                          controlsList="noremoteplayback"
                          disablePictureInPicture
                          className="w-full max-h-[320px] object-contain"
                          onLoadedData={scrollToBottom}
                        />
                      </div>
                    ) : message.mediaType === "audio" ? (
                      <AudioPlayer src={message.mediaUrl!} />
                    ) : (
                      <>
                        <img
                          src={message.mediaUrl}
                          alt="Shared media"
                          className="w-full max-h-[320px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() =>
                            window.open(message.mediaUrl, "_blank")
                          }
                          onLoad={scrollToBottom}
                        />
                        <a
                          href={message.mediaUrl}
                          download
                          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Download"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </a>
                      </>
                    )}
                  </div>
                )}

                {message.text && (
                  <>
                    <HighlightText
                      text={message.text}
                      highlight={searchQuery}
                    />
                    {(() => {
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const matches = message.text.match(urlRegex);
                      if (matches && matches.length > 0) {
                        return <LinkPreview url={matches[0]} />;
                      }
                      return null;
                    })()}
                  </>
                )}
              </div>

              {/* Reactions Display (Stacked) */}
              {message.reactions && message.reactions.length > 0 && !message.isDeletedForEveryone && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute -bottom-6 ${
                    isOwn ? "right-0" : "left-0"
                  } flex items-center z-10 cursor-pointer group/reactions`}
                >
                  <div className={`
                    flex items-center bg-chat-bg-primary border border-chat-border 
                    rounded-full px-1.5 py-0.5 shadow-sm hover:shadow-md transition-all duration-200 gap-1
                    ${isOwn ? "flex-row-reverse" : "flex-row"}
                  `}>
                    <div className="flex -space-x-1.5">
                      {Array.from(new Set(message.reactions.map((r) => r.emoji)))
                        .slice(0, 3) // Show first 3 distinct emojis
                        .map((emoji, idx) => (
                          <span 
                            key={emoji} 
                            className="text-[13px] bg-chat-bg-primary rounded-full ring-1 ring-chat-border"
                            style={{ zIndex: 10 - idx }}
                          >
                            {emoji}
                          </span>
                        ))}
                    </div>
                    <span className="text-[11px] font-bold text-chat-text-secondary px-0.5">
                      {message.reactions.length}
                    </span>
                  </div>
                  
                  {/* Hover Details Tooltip (with bridge to prevent closing) */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover/reactions:flex flex-col pb-3 z-50 pointer-events-auto">
                     <div className="bg-chat-bg-primary text-chat-text-primary p-2 rounded-lg text-[10px] whitespace-nowrap shadow-xl border border-chat-border animate-in fade-in zoom-in duration-200">
                       {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
                         const userReacted = message.reactions!.some(r => r.userId === currentUserId && r.emoji === emoji);
                         return (
                           <div 
                             key={emoji} 
                             className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${userReacted ? "hover:bg-red-500/20 text-blue-400" : "hover:bg-white/10"}`}
                             onClick={(e) => {
                               e.stopPropagation();
                               if (userReacted) {
                                  onRemoveReaction(message._id, emoji);
                               } else {
                                  fetch(`/api/chat/message/messages/${message._id}/reaction`, {
                                      method: "POST",
                                      headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                                      },
                                      body: JSON.stringify({ chatId, emoji }),
                                  });
                               }
                             }}
                           >
                             <span>{emoji}</span>
                             <span className="opacity-70">{message.reactions!.filter(r => r.emoji === emoji).length}</span>
                             {userReacted && <span className="text-[8px] opacity-50 ml-1">(click to remove)</span>}
                           </div>
                         );
                       })}
                     </div>
                  </div>
                </div>
              )}

              {/* Emoji Picker Popover */}
              {showEmojiPicker === message._id && (
                <div
                  ref={emojiPickerRef}
                  onClick={(e) => e.stopPropagation()}
                  className={`
                    fixed z-[9999] shadow-2xl rounded-xl
                    ${isOwn 
                      ? "right-4 sm:right-auto sm:translate-x-0" 
                      : "left-4 sm:left-auto sm:translate-x-0"
                    }
                    bottom-20 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2
                  `}
                >
                  <EmojiPicker
                    onEmojiClick={(emojiData) =>
                      onReaction(emojiData, message._id)
                    }
                    theme={Theme.AUTO}
                    skinTonesDisabled
                    searchDisabled
                    width={320}
                    height={400}
                  />
                </div>
              )}

              {/* Message Actions Menu */}
              {!message.isDeletedForEveryone && (
                <div
                  className={`
                    absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 bg-chat-bg-primary rounded-lg shadow-md border border-chat-border z-10
                    ${isOwn ? "-left-[120px]" : "-right-[120px]"}
                  `}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmojiPicker(
                        showEmojiPicker === message._id ? null : message._id
                      );
                    }}
                    className="p-1.5 hover:bg-chat-hover rounded text-chat-text-tertiary hover:text-yellow-500 transition-colors"
                    title="React"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onReply(message)}
                    className="p-1.5 hover:bg-chat-hover rounded text-chat-text-tertiary"
                    title="Reply"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  </button>
                  {isOwn && (
                    <>
                      {message.text && (
                        <button
                          onClick={() => onEdit(message)}
                          className="p-1.5 hover:bg-chat-hover rounded text-chat-text-tertiary"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(message._id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    onClick={async () => {
                      if (message.isPinned) {
                        await fetch(`/api/chat/${chatId}/pinned?messageId=${message._id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        });
                      } else {
                        await fetch(`/api/chat/${chatId}/pinned`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${localStorage.getItem('token')}` 
                            },
                            body: JSON.stringify({ messageId: message._id })
                        });
                      }
                    }}
                    className={`p-1.5 rounded transition-colors ${message.isPinned ? "text-chat-accent bg-chat-accent/10" : "text-chat-text-tertiary hover:bg-chat-hover"}`}
                    title={message.isPinned ? "Unpin" : "Pin"}
                  >
                     <svg className="w-4 h-4" fill={message.isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                     </svg>
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('forward-message', { detail: message }))}
                    className="p-1.5 hover:bg-chat-hover rounded text-chat-text-tertiary hover:text-chat-accent transition-colors"
                    title="Forward"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  {isOwn && isGroup && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('view-receipts', { detail: message }))}
                      className="p-1.5 hover:bg-chat-hover rounded text-chat-text-tertiary hover:text-chat-accent transition-colors"
                      title="Info"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div
            className={`flex items-center gap-1 mt-1 text-[10px] sm:text-xs font-medium text-chat-text-tertiary uppercase tracking-wider
              ${isOwn ? "mr-0 justify-end" : "ml-10 justify-start"}
          `}
          >
            {message.isEdited && !message.isDeletedForEveryone && (
              <span className="italic mr-1">edited</span>
            )}
            <span>{formatTime(message.createdAt)}</span>
            {isOwn && !message.isDeletedForEveryone && (
              <MessageStatusIcon
                status={message.status}
                className="ml-1"
              />
            )}
          </div>
        </motion.div>
      )}</motion.div>
  );
};

export default MessageItem;
