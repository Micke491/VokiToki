import React, { useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import {
  Mic,
  Smile,
  Reply,
  MoreVertical,
  Pencil,
  Trash2,
  Bookmark,
  Share2,
  Info,
  X,
  Video,
  Phone,
  Zap,
  Download,
  Image as ImageIcon,
  ShieldAlert,
} from "lucide-react";
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
  onPin: (message: Message) => void;
  onForward: (message: Message) => void;
  onViewStatus: (message: Message) => void;
  onReaction: (emojiData: EmojiClickData, messageId: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  scrollToBottom: () => void;
  showEmojiPicker: string | null;
  setShowEmojiPicker: (id: string | null) => void;
  showMoreMenu: string | null;
  setShowMoreMenu: (id: string | null) => void;
  chatId: string;
  isGroup?: boolean;
  groupAdminId?: string;
  onJumpToMessage?: (messageId: string) => Promise<void> | void;
  onPreviewImage: (url: string) => void;
  onCallAction?: (callType: "voice" | "video") => void;
  onReport: (message: Message) => void;
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
  onPin,
  onForward,
  onViewStatus,
  onReaction,
  onRemoveReaction,
  scrollToBottom,
  showEmojiPicker,
  setShowEmojiPicker,
  showMoreMenu,
  setShowMoreMenu,
  chatId,
  isGroup,
  groupAdminId,
  onJumpToMessage,
  onPreviewImage,
  onCallAction,
  onReport,
}: MessageItemProps) => {
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const sender = message.sender || {
    _id: "unknown",
    username: "Unknown User",
    avatar: "",
  };

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
        if (!down)
          controls.start({
            x: 0,
            transition: { type: "spring", stiffness: 300, damping: 30 },
          });
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
    { axis: "x", filterTaps: true },
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

  const handleDownload = async (
    e: React.MouseEvent,
    url: string,
    filename: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      window.open(url, "_blank");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
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
          className={`group flex flex-col ${isOwn ? "items-end" : "items-start"} mb-2 transition-all duration-300 relative touch-pan-y`}
          style={{ zIndex: showEmojiPicker === message._id ? 1000 : 10 }}
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
              <span>
                Replying to {message.replyTo.sender?.username || "Unknown User"}
              </span>
            </div>
          )}

          <div
            className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] min-w-0 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar (Partner) */}
            {!isOwn && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chat-bg-secondary flex items-center justify-center text-xs font-bold text-chat-text-secondary select-none overflow-hidden">
                {sender.avatar ? (
                  <img
                    src={sender.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (sender.username || "U").charAt(0).toUpperCase()
                )}
              </div>
            )}

            {/* Bubble */}
            <div className="relative group/bubble flex flex-col">
              {isGroup && !isOwn && (
                <div className="flex items-center gap-1.5 mb-1 ml-1 px-1">
                  <span className="text-[11px] font-bold text-chat-text-tertiary truncate max-w-[120px]">
                    {sender.username}
                  </span>
                </div>
              )}

              {message.isForwarded && (
                <div
                  className={`flex items-center gap-1 mb-1 text-[10.5px] font-semibold text-chat-text-tertiary/70 italic ${isOwn ? "justify-end mr-1" : "ml-1"}`}
                >
                  <svg
                    className="w-3 h-3"
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
                  Forwarded
                </div>
              )}

              {message.isPinned && (
                <div
                  className={`flex items-center gap-1 mb-1 text-[10px] font-bold text-chat-text-tertiary/60 capitalize ${isOwn ? "justify-end mr-1" : "ml-1"}`}
                >
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                      ${(message.mediaUrl && !message.text) || message.mediaType === "call" ? "bg-transparent !p-0 shadow-none border-none" : "px-4 py-2.5 shadow-sm"}
                  `}
              >
                {!message.isDeletedForEveryone && message.replyTo && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (message.replyTo?._id && onJumpToMessage) {
                        onJumpToMessage(
                          message.replyTo._id as unknown as string,
                        );
                      }
                    }}
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
                        {message.replyTo.sender?.username || "Unknown User"}
                      </p>
                      <p className="line-clamp-1 truncate">
                        {message.replyTo.text ||
                          (message.replyTo.mediaUrl
                            ? message.replyTo.mediaType === "video"
                              ? "Video"
                              : message.replyTo.mediaType === "gif"
                                ? "GIF"
                                : message.replyTo.mediaType === "audio"
                                  ? "Voice record"
                                  : "Photo"
                            : "")}
                      </p>
                    </div>
                    {message.replyTo.mediaUrl && (
                      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border border-white/20 ml-2">
                        {message.replyTo.mediaType === "video" ? (
                          <div className="w-full h-full bg-chat-bg-secondary flex items-center justify-center">
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
                          <div className="w-full h-full bg-chat-bg-secondary flex items-center justify-center">
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

                {message.mediaType === "call" &&
                  !message.isDeletedForEveryone &&
                  (() => {
                    const isEnded = message.text
                      ?.toLowerCase()
                      .includes("ended");
                    const isVideo = message.text
                      ?.toLowerCase()
                      .includes("video");

                    return (
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                          isEnded
                            ? "bg-chat-bg-secondary/50 border border-chat-border opacity-80"
                            : isOwn
                              ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 shadow-lg shadow-green-500/5"
                              : "bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 shadow-lg shadow-blue-500/5"
                        }`}
                      >
                        <div
                          className={`p-2.5 rounded-full transition-colors ${
                            isEnded
                              ? "bg-chat-bg-primary text-chat-text-tertiary"
                              : isOwn
                                ? "bg-green-500/20 text-green-400"
                                : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {isVideo ? (
                            <Video className="w-5 h-5" />
                          ) : (
                            <Phone className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-sm font-bold truncate ${
                              isEnded
                                ? "text-chat-text-secondary"
                                : isOwn
                                  ? "text-green-300"
                                  : "text-blue-300"
                            }`}
                          >
                            {message.text}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              isEnded
                                ? "text-chat-text-tertiary"
                                : isOwn
                                  ? "text-green-400/70"
                                  : "text-blue-400/70"
                            }`}
                          >
                            {isEnded
                              ? "Call Ended"
                              : isOwn
                                ? "Outgoing"
                                : "Incoming"}
                          </span>
                        </div>

                        {onCallAction && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCallAction(isVideo ? "video" : "voice");
                            }}
                            className={`ml-auto px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                              isEnded
                                ? "bg-chat-bg-primary hover:bg-chat-hover text-chat-text-primary border border-chat-border"
                                : isOwn
                                  ? "bg-green-500/30 hover:bg-green-500/50 text-green-200 border border-green-500/20"
                                  : "bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 border border-blue-500/20"
                            }`}
                          >
                            {isVideo ? (
                              <Video className="w-3.5 h-3.5" />
                            ) : (
                              <Phone className="w-3.5 h-3.5" />
                            )}
                            {isEnded
                              ? "Call Again"
                              : isOwn
                                ? "Call Again"
                                : "Join Call"}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                {message.mediaUrl && !message.isDeletedForEveryone && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-chat-border max-w-[320px] bg-chat-bg-secondary relative group">
                    {["gif", "sticker"].includes(message.mediaType!) && (
                      <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-white text-[10px] font-bold leading-none select-none pointer-events-none border border-white/10 shadow-lg uppercase tracking-wider">
                        {message.mediaType}
                      </div>
                    )}
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
                          className={`w-full max-h-[320px] object-cover cursor-pointer hover:opacity-95 transition-opacity ${message.mediaType === "sticker" ? "max-w-[160px] aspect-square object-contain mx-auto" : ""}`}
                          onClick={(e) => {
                            if (
                              message.mediaType === "gif" ||
                              message.mediaType === "sticker"
                            ) {
                              const target = e.target as HTMLImageElement;
                              const originalSrc = target.src.split("?t=")[0];
                              target.src = originalSrc + "?t=" + Date.now();
                            } else {
                              onPreviewImage(message.mediaUrl!);
                            }
                          }}
                          onLoad={scrollToBottom}
                        />
                        <button
                          onClick={(e) =>
                            handleDownload(
                              e,
                              message.mediaUrl!,
                              `download-${message._id}`,
                            )
                          }
                          className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-black/70 rounded-full text-white backdrop-blur-sm shadow-lg transition-all z-30"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {message.text && message.mediaType !== "call" && (
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
              {message.reactions &&
                message.reactions.length > 0 &&
                !message.isDeletedForEveryone && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute -bottom-6 ${
                      isOwn ? "right-0" : "left-0"
                    } flex items-center z-10 cursor-pointer group/reactions`}
                  >
                    <div
                      className={`
                    flex items-center bg-chat-bg-primary border border-chat-border 
                    rounded-full px-1.5 py-0.5 shadow-sm hover:shadow-md transition-all duration-200 gap-1
                    ${isOwn ? "flex-row-reverse" : "flex-row"}
                  `}
                    >
                      <div className="flex -space-x-1.5">
                        {Array.from(
                          new Set(message.reactions.map((r) => r.emoji)),
                        )
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
                        {Array.from(
                          new Set(message.reactions.map((r) => r.emoji)),
                        ).map((emoji) => {
                          const userReacted = message.reactions!.some(
                            (r) =>
                              r.userId === currentUserId && r.emoji === emoji,
                          );
                          return (
                            <div
                              key={emoji}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${userReacted ? "hover:bg-red-500/20 text-blue-400" : "hover:bg-white/10"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (userReacted) {
                                  onRemoveReaction(message._id, emoji);
                                } else {
                                  apiFetch(
                                    `/api/chat/message/messages/${message._id}/reaction`,
                                    {
                                      method: "POST",
                                      body: JSON.stringify({ chatId, emoji }),
                                    },
                                  );
                                }
                              }}
                            >
                              <span>{emoji}</span>
                              <span className="opacity-70">
                                {
                                  message.reactions!.filter(
                                    (r) => r.emoji === emoji,
                                  ).length
                                }
                              </span>
                              {userReacted && (
                                <span className="text-[8px] opacity-50 ml-1">
                                  (click to remove)
                                </span>
                              )}
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
                    fixed z-[99999] shadow-2xl rounded-xl overflow-hidden
                    ${
                      isOwn
                        ? "right-4 sm:right-auto sm:translate-x-0"
                        : "left-4 sm:left-auto sm:translate-x-0"
                    }
                    bottom-20 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2
                    animate-in zoom-in duration-200
                  `}
                >
                  <div className="bg-chat-bg-primary p-1 border-b border-chat-border flex justify-between items-center">
                    <span className="text-xs font-bold px-2 text-chat-text-tertiary">
                      Select Reaction
                    </span>
                    <button
                      onClick={() => setShowEmojiPicker(null)}
                      className="p-1 hover:bg-chat-hover rounded-full text-chat-text-tertiary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
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
                <>
                  {/* New Simplified Message Actions */}
                  <div
                    className={`
                      absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 z-20
                      ${isOwn ? "-left-1 -translate-x-full pr-1 font-sans" : "-right-1 translate-x-full pl-1"}
                    `}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmojiPicker(
                          showEmojiPicker === message._id ? null : message._id,
                        );
                      }}
                      className="p-2 hover:bg-chat-bg-secondary rounded-full text-chat-text-tertiary hover:text-yellow-500 transition-all shadow-md border border-chat-border/50 bg-chat-bg-primary/90 backdrop-blur-sm h-9 w-9 flex items-center justify-center"
                      title="React"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReply(message);
                      }}
                      className="p-2 hover:bg-chat-bg-secondary rounded-full text-chat-text-tertiary hover:text-chat-accent transition-all shadow-md border border-chat-border/50 bg-chat-bg-primary/90 backdrop-blur-sm group/replybtn h-9 w-9 flex items-center justify-center"
                      title="Reply"
                    >
                      <Reply className="w-4 h-4 group-active/replybtn:scale-90 transition-transform" />
                    </button>

                    <div className="relative h-9 w-9 flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoreMenu(
                            showMoreMenu === message._id ? null : message._id,
                          );
                        }}
                        data-more-menu-trigger
                        className={`p-2 rounded-full transition-all shadow-md border border-chat-border/50 bg-chat-bg-primary/90 backdrop-blur-sm ${showMoreMenu === message._id ? "text-chat-accent bg-chat-bg-secondary" : "text-chat-text-tertiary hover:bg-chat-bg-secondary hover:text-chat-accent"}`}
                        title="More"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* More Menu Dropdown (Controlled by Click) */}
                      {showMoreMenu === message._id && (
                        <div
                          data-more-menu
                          className={`
                          absolute bottom-full mb-2 flex flex-col bg-chat-bg-primary border border-chat-border rounded-xl shadow-2xl py-1 min-w-[150px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200
                          ${isOwn ? "left-0" : "right-0"}
                        `}
                        >
                          {isOwn &&
                            message.text &&
                            Date.now() -
                              new Date(message.createdAt).getTime() <=
                              15 * 60 * 1000 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(message);
                                  setShowMoreMenu(null);
                                }}
                                className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-chat-hover text-chat-text-primary transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  Edit Message
                                </span>
                              </button>
                            )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onForward(message);
                              setShowMoreMenu(null);
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-chat-hover text-chat-text-primary transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="font-medium">Forward Message</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPin(message);
                              setShowMoreMenu(null);
                            }}
                            className={`flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-chat-hover transition-colors ${
                              message.isPinned
                                ? "text-red-500 bg-red-500/5"
                                : "text-chat-text-primary"
                            }`}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${message.isPinned ? "fill-current" : ""}`}
                            />
                            <span className="font-medium">
                              {message.isPinned
                                ? "Unpin Message"
                                : "Pin Message"}
                            </span>
                          </button>
                          {isOwn && isGroup && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewStatus(message);
                                setShowMoreMenu(null);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-chat-hover text-chat-text-primary transition-colors"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span className="font-medium">View Status</span>
                            </button>
                          )}
                          {!isOwn && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReport(message);
                                setShowMoreMenu(null);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-amber-500/10 text-amber-500 transition-colors"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span className="font-medium">
                                Report Message
                              </span>
                            </button>
                          )}
                          {isOwn && (
                            <>
                              <div className="h-[1px] bg-chat-border my-1 mx-2" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(message._id);
                                  setShowMoreMenu(null);
                                }}
                                className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-red-500/10 text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="font-bold">Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
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
              <MessageStatusIcon status={message.status} className="ml-1" />
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MessageItem;
