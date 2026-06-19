'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import SideBar from '@/features/sidebar/components/Sidebar';
import ImagePreviewModal from '@/components/ui/ImagePreviewModal';
import {
  Bot, Plus, Trash2, Send, Loader2,
  MessageSquare, MoreVertical, Square, User2,
  Sparkles, Code2, Lightbulb, HelpCircle,
  Search, X, Copy, Check, ChevronDown,
  PenLine, Shield, Phone, Palette,
  Paperclip, ImageIcon, Video, FileWarning
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; 

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  name?: string;
  botPersona?: string;
}

interface BotAttachment {
  type: 'image' | 'video';
  mimeType: string;
  fileName: string;
  thumbnailB64?: string;
}

interface BotMessage {
  _id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: BotAttachment[];
  createdAt: string;
}

interface BotChat {
  _id: string;
  title: string;
  messages: BotMessage[];
  updatedAt: string;
}

interface PendingAttachment {
  type: 'image' | 'video';
  mimeType: string;
  fileName: string;
  data: string;
  previewUrl: string;
  sizeBytes: number;
}

const SUGGESTIONS = [
  { icon: HelpCircle, text: "What can you help me with?", color: "from-blue-500/20 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40" },
  { icon: Phone, text: "How do I start a video call?", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 hover:border-emerald-500/40" },
  { icon: Shield, text: "How do I enable Two-Factor Authentication?", color: "from-amber-500/20 to-amber-600/10 border-amber-500/20 hover:border-amber-500/40" },
  { icon: Code2, text: "Help me debug my code", color: "from-purple-500/20 to-purple-600/10 border-purple-500/20 hover:border-purple-500/40" },
  { icon: PenLine, text: "Help me write a professional message", color: "from-rose-500/20 to-rose-600/10 border-rose-500/20 hover:border-rose-500/40" },
  { icon: Palette, text: "How do I customize my chat theme?", color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 hover:border-cyan-500/40" },
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ACCEPT_ATTR = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',');

function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  
  const language = className?.replace('hljs language-', '').replace('language-', '') || '';
  
  const handleCopy = async () => {
    const text = codeRef.current?.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };
  
  return (
    <div className="relative group/code">
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-chat-text-tertiary bg-white/5 rounded-br-lg rounded-tl-lg z-10">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-chat-text-tertiary hover:text-chat-text-primary transition-all opacity-0 group-hover/code:opacity-100 z-10"
        title="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <code ref={codeRef} className={className} {...props}>
        {children}
      </code>
    </div>
  );
}

function groupChatsByDate(chats: BotChat[]): { label: string; chats: BotChat[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; chats: BotChat[] }[] = [
    { label: 'Today', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Previous 7 Days', chats: [] },
    { label: 'Older', chats: [] },
  ];

  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    if (d >= today) groups[0].chats.push(chat);
    else if (d >= yesterday) groups[1].chats.push(chat);
    else if (d >= weekAgo) groups[2].chats.push(chat);
    else groups[3].chats.push(chat);
  }

  return groups.filter(g => g.chats.length > 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx === -1 ? dataUrl : dataUrl.slice(idx + 1);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrlPrefix(reader.result as string));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function BotPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<BotChat[]>([]);
  const [activeChat, setActiveChat] = useState<BotChat | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [modelName, setModelName] = useState('Gemini Flash');
  const [toastError, setToastError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const createdBlobUrls = useRef<string[]>([]);

  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewMediaType, setPreviewMediaType] = useState<string>('image');

  useEffect(() => {
    apiFetch('/api/users/current_user')
      .then(r => r.json())
      .then(d => setCurrentUser(d.user))
      .catch(() => router.push('/auth-pages/login'));
  }, [router]);

  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const res = await apiFetch('/api/bot/chats');
      const data = await res.json();
      setChats(Array.isArray(data) ? data : []);
    } catch {
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeChat]);

  useEffect(() => {
    return () => {
      createdBlobUrls.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(c => c.title.toLowerCase().includes(q));
  }, [chats, searchQuery]);

  const groupedChats = useMemo(() => groupChatsByDate(filteredChats), [filteredChats]);

  const openChat = async (chatId: string) => {
    setLoadingMessages(true);
    setMobileSidebarOpen(false);
    clearPendingAttachment();
    try {
      const res = await apiFetch(`/api/bot/chats/${chatId}`);
      const data = await res.json();
      setActiveChat(data);
    } catch {
      // ignore
    } finally {
      setLoadingMessages(false);
    }
  };

  const createChat = () => {
    setActiveChat(null); 
    setMobileSidebarOpen(false);
    clearPendingAttachment();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(chatId);
    try {
      await apiFetch(`/api/bot/chats/${chatId}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (activeChat?._id === chatId) setActiveChat(null);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setSending(false);
    }
  };

  const clearPendingAttachment = () => {
    setPendingAttachment(null);
  };

  const handleFileSelected = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    setToastError(null);

    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      setToastError('Unsupported file type. Please use JPG, PNG, WEBP, HEIC images or MP4, WEBM, MOV videos.');
      return;
    }

    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      setToastError(
        isImage
          ? `Image is too large (max ${formatBytes(MAX_IMAGE_BYTES)}).`
          : `Video is too large (max ${formatBytes(MAX_VIDEO_BYTES)}). Try a shorter clip.`
      );
      return;
    }

    setAttachmentLoading(true);
    try {
      const base64Data = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      createdBlobUrls.current.push(previewUrl);
      clearPendingAttachment();
      setPendingAttachment({
        type: isImage ? 'image' : 'video',
        mimeType: file.type,
        fileName: file.name,
        data: base64Data,
        previewUrl,
        sizeBytes: file.size,
      });
    } catch {
      setToastError('Failed to read file. Please try again.');
    } finally {
      setAttachmentLoading(false);
    }
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelected(file);
    e.target.value = ''; 
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelected(file);
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    const attachment = pendingAttachment;

    if (!text && !attachment) return;
    if (sending) return;

    setInput('');
    clearPendingAttachment();
    setToastError(null);
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setSending(true);

    const controller = new AbortController();
    setAbortController(controller);

    let targetChat = activeChat;

    if (!targetChat) {
      try {
        const createRes = await apiFetch('/api/bot/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text || (attachment?.type === 'image' ? 'Image analysis' : 'Video analysis') })
        });
        if (!createRes.ok) throw new Error('Failed to create chat');
        targetChat = await createRes.json();
        setChats(prev => [targetChat!, ...prev]);
      } catch (e: any) {
        setToastError(e.message || 'Failed to create chat');
        setSending(false);
        setAbortController(null);
        return;
      }
    }

    const tempUserMsg: BotMessage = {
      _id: 'temp-user-' + Date.now(),
      role: 'user',
      text: text || (attachment?.type === 'image' ? '📷 Sent an image' : '🎥 Sent a video'),
      attachments: attachment ? [{
        type: attachment.type,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        thumbnailB64: attachment.previewUrl,
      }] : undefined,
      createdAt: new Date().toISOString(),
    };
    const tempBotMsg: BotMessage = {
      _id: 'temp-bot-' + Date.now(),
      role: 'model',
      text: '',
      createdAt: new Date().toISOString(),
    };

    setActiveChat(prev => {
      if (prev) return { ...prev, messages: [...prev.messages, tempUserMsg] };
      return { ...targetChat!, messages: [tempUserMsg] };
    });

    try {
      const res = await apiFetch(`/api/bot/chats/${targetChat!._id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          text,
          attachments: attachment ? [{
            mimeType: attachment.mimeType,
            data: attachment.data,
            fileName: attachment.fileName,
          }] : undefined,
        }),
        signal: controller.signal
      });

      if (!res.ok) {
         const errData = await res.json();
         throw new Error(errData.error || 'Failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let currentBotText = '';
      let botMsgAdded = false;
      let buffer = '';

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            
            if (chunk.startsWith('data: ')) {
              const dataStr = chunk.slice(6);
              if (dataStr.trim()) {
                try {
                  const data = JSON.parse(dataStr);
                  
                  if (data.type === 'chunk' && data.text) {
                    currentBotText += data.text;
                    if (!botMsgAdded) {
                      botMsgAdded = true;
                      setActiveChat(prev => {
                        if (!prev || prev._id !== targetChat!._id) return prev;
                        return { ...prev, messages: [...prev.messages, { ...tempBotMsg, text: currentBotText }] };
                      });
                    } else {
                      setActiveChat(prev => {
                        if (!prev || prev._id !== targetChat!._id) return prev;
                        const newMsgs = [...prev.messages];
                        const lastIndex = newMsgs.length - 1;
                        if (lastIndex >= 0 && newMsgs[lastIndex].role === 'model') {
                           newMsgs[lastIndex] = { ...newMsgs[lastIndex], text: currentBotText };
                        }
                        return { ...prev, messages: newMsgs };
                      });
                    }
                  } else if (data.type === 'init') {
                    if (data.modelName) setModelName(data.modelName);
                    setActiveChat(prev => {
                      if (!prev || prev._id !== targetChat!._id) return prev;
                      const newMsgs = [...prev.messages];
                      const idx = newMsgs.findIndex(m => m._id === tempUserMsg._id);
                      if (idx !== -1 && data.userMessage) {
                        const serverMsg = data.userMessage;
                        const serverHasThumb = !!serverMsg.attachments?.[0]?.thumbnailB64;
                        const localThumb = newMsgs[idx].attachments?.[0]?.thumbnailB64;
                        if (!serverHasThumb && localThumb) {
                          serverMsg.attachments = newMsgs[idx].attachments;
                        }
                        newMsgs[idx] = serverMsg;
                      }
                      return { ...prev, messages: newMsgs };
                    });
                  } else if (data.type === 'done') {
                    if (!botMsgAdded) {
                      botMsgAdded = true;
                      setActiveChat(prev => (prev && prev._id === targetChat!._id) ? { ...prev, messages: [...prev.messages, data.botMessage] } : prev);
                    } else {
                      setActiveChat(prev => {
                        if (!prev || prev._id !== targetChat!._id) return prev;
                        const newMsgs = [...prev.messages];
                        const lastIndex = newMsgs.length - 1;
                        if (lastIndex >= 0 && newMsgs[lastIndex].role === 'model' && data.botMessage) {
                           newMsgs[lastIndex] = data.botMessage;
                        }
                        return { ...prev, title: data.chatTitle || prev.title, messages: newMsgs };
                      });
                    }
                    if (data.chatTitle) {
                      setChats(prev => prev.map(c => c._id === targetChat!._id ? { ...c, title: data.chatTitle } : c));
                    }
                  }
                } catch (e) {
                  // Wait for completion chunk
                }
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
      } else {
        setActiveChat(prev => {
          if (!prev || prev._id !== targetChat!._id) return prev;
          const newMsgs = [...prev.messages];
          const errorText = '\n\n**⚠️ Error:** ' + (err.message || 'Connection lost.');
          const lastIndex = newMsgs.length - 1;
          
          if (lastIndex >= 0 && newMsgs[lastIndex].role === 'model' && newMsgs[lastIndex]._id === tempBotMsg._id) {
            newMsgs[lastIndex] = { ...newMsgs[lastIndex], text: newMsgs[lastIndex].text + errorText };
          } else {
            newMsgs.push({ ...tempBotMsg, text: errorText });
          }
          return { ...prev, messages: newMsgs };
        });
      }
    } finally {
      setSending(false);
      setAbortController(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const greeting = currentUser?.name || currentUser?.username || 'there';

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <div className="ambient-glow"><div className="ambient-glow-inner" /></div>

      <div className="relative z-[101]">
        <SideBar currentUser={currentUser || undefined} isMobileDrawerOpen={false} onCloseMobileDrawer={() => {}} />
      </div>

      {/* Mobile overlay for chat sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[102] bg-black/60 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat History Sidebar */}
      <aside className={`absolute md:relative z-[103] md:z-auto h-full flex flex-col w-72 shrink-0 bg-chat-glass backdrop-blur-xl border-r border-chat-border transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-[280px]' : '-translate-x-full md:translate-x-0'}`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-chat-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-chat-text-primary text-sm">AI Assistant</h2>
                <p className="text-chat-text-tertiary text-[11px]">{modelName}</p>
              </div>
            </div>
            <button onClick={createChat} className="p-2 rounded-xl bg-chat-accent/10 hover:bg-chat-accent/20 text-chat-accent transition-all hover:scale-105" title="New chat">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-chat-text-tertiary" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-chat-bg-secondary border border-chat-border rounded-xl pl-9 pr-8 py-2 text-xs text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent/50 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-chat-text-tertiary hover:text-chat-text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat list grouped by date */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {loadingChats ? (
            <div className="space-y-3 p-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-4 h-4 rounded bg-chat-hover shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-chat-hover rounded w-3/4" />
                    <div className="h-2 bg-chat-hover/50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center pt-10 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-chat-bg-secondary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-chat-text-tertiary" />
              </div>
              <p className="text-chat-text-secondary text-sm font-medium">
                {searchQuery ? 'No matching chats' : 'No conversations yet'}
              </p>
              <p className="text-chat-text-tertiary text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Start a new chat below'}
              </p>
            </div>
          ) : (
            groupedChats.map(group => (
              <div key={group.label} className="mb-2">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-chat-text-tertiary">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.chats.map(chat => (
                    <motion.div
                      key={chat._id}
                      onClick={() => openChat(chat._id)}
                      whileHover={{ x: 2 }}
                      className={`w-full cursor-pointer text-left px-3 py-2.5 rounded-xl transition-all group flex items-center gap-2.5 ${
                        activeChat?._id === chat._id 
                          ? 'bg-chat-accent text-white shadow-md shadow-chat-accent/20' 
                          : 'hover:bg-chat-hover text-chat-text-secondary hover:text-chat-text-primary'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <span className="flex-1 truncate text-[13px] font-medium">{chat.title}</span>
                      <button
                        onClick={(e) => deleteChat(chat._id, e)}
                        className={`shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                          activeChat?._id === chat._id ? 'hover:bg-white/20' : 'hover:bg-red-500/10 text-red-400'
                        }`}
                      >
                        {deletingId === chat._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main
        className="flex-1 flex flex-col min-w-0 relative z-10"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-and-drop overlay */}
        <AnimatePresence>
          {isDraggingFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-chat-accent/10 backdrop-blur-sm border-4 border-dashed border-chat-accent rounded-2xl m-3 flex items-center justify-center pointer-events-none"
            >
              <div className="flex flex-col items-center gap-3 text-chat-accent">
                <div className="w-16 h-16 rounded-2xl bg-chat-accent/20 flex items-center justify-center">
                  <Paperclip className="w-8 h-8" />
                </div>
                <p className="font-bold text-lg">Drop image or video to analyze</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="shrink-0 h-14 border-b border-chat-border flex items-center px-4 md:px-6 gap-3 bg-chat-glass backdrop-blur-xl">
          <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-2 rounded-xl text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-hover transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>

          {activeChat ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-chat-text-primary truncate text-sm">{activeChat.title}</p>
                <p className="text-[11px] text-chat-text-tertiary">
                  {activeChat.messages.length} message{activeChat.messages.length !== 1 ? 's' : ''} · {modelName}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-chat-text-primary text-sm">New conversation</span>
                <p className="text-[11px] text-chat-text-tertiary">{modelName}</p>
              </div>
            </div>
          )}
        </header>

        {/* Toast Error */}
        <AnimatePresence>
          {toastError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-5 py-2.5 rounded-2xl text-sm font-medium shadow-lg flex items-center gap-2 backdrop-blur-sm max-w-[90%]"
            >
              <FileWarning className="w-4 h-4 shrink-0" />
              <span>{toastError}</span>
              <button onClick={() => setToastError(null)} className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors shrink-0">
                <X className="w-3.5 h-3.5"/>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scrollbar-thin relative">
          {!activeChat || activeChat.messages.length === 0 ? (
            /* ==================== WELCOME SCREEN ==================== */
            <div className="flex flex-col items-center justify-center h-full px-4 py-8">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-col items-center gap-2 mb-10"
              >
                {/* Animated AI Logo */}
                <div className="relative mb-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-3 rounded-full border border-dashed border-chat-accent/20"
                  />
                  <motion.div
                    animate={{ rotate: [360, 0] }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-6 rounded-full border border-dashed border-purple-500/10"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-chat-accent via-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-chat-accent/30 relative">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-chat-text-primary tracking-tight text-center">
                  Hi {greeting} 
                </h2>
                <p className="text-chat-text-secondary text-sm md:text-base text-center max-w-lg">
                  I&apos;m your VokiToki AI assistant. Ask me anything, or upload a photo or video and I&apos;ll analyze it for you.
                </p>
              </motion.div>

              {/* Suggestion Chips Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-2"
              >
                {SUGGESTIONS.map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(s.text)}
                      className={`text-left p-4 rounded-2xl bg-gradient-to-br ${s.color} border backdrop-blur-sm transition-all group flex items-start gap-3`}
                    >
                      <div className="shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-chat-text-secondary group-hover:text-chat-text-primary transition-colors" />
                      </div>
                      <span className="text-sm text-chat-text-secondary group-hover:text-chat-text-primary transition-colors font-medium leading-snug">
                        {s.text}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>
          ) : loadingMessages ? (
            /* Loading skeleton */
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
                  {i % 2 === 0 && <div className="w-8 h-8 rounded-lg bg-chat-hover shrink-0" />}
                  <div className={`${i % 2 === 0 ? 'max-w-[70%]' : 'max-w-[60%]'}`}>
                    <div className={`p-4 rounded-2xl ${i % 2 === 0 ? 'bg-chat-bg-secondary' : 'bg-chat-accent/20'}`}>
                      <div className="space-y-2">
                        <div className="h-3 bg-chat-hover rounded w-full" />
                        <div className="h-3 bg-chat-hover rounded w-3/4" />
                        {i % 2 === 0 && <div className="h-3 bg-chat-hover rounded w-1/2" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ==================== MESSAGES ==================== */
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-1">
              {activeChat.messages.map((msg, msgIdx) => (
                <motion.div 
                  key={msg._id} 
                  initial={{ opacity: 0, y: 8 }} 
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`group/msg py-3 ${msg.role === 'user' ? '' : ''}`}
                >
                  {msg.role === 'model' ? (
                    /* ---- Bot Message Row ---- */
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-sm mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-chat-text-primary">VokiToki AI</span>
                          <span className="text-[10px] text-chat-text-tertiary opacity-0 group-hover/msg:opacity-100 transition-opacity">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div className="text-sm leading-relaxed text-chat-text-primary">
                          {msg.text === '' ? (
                            <div className="flex gap-1.5 items-center py-2">
                              {[0, 1, 2].map(i => (
                                <motion.span
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-chat-accent"
                                  animate={{ y: [0, -6, 0] }}
                                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-3 [&>ol]:mb-3 [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mb-1.5 [&>pre]:rounded-xl [&>pre]:border [&>pre]:border-chat-border [&>pre]:bg-[#0d1117] [&>pre]:my-3 [&>pre]:overflow-x-auto [&>blockquote]:border-l-2 [&>blockquote]:border-chat-accent/50 [&>blockquote]:pl-4 [&>blockquote]:text-chat-text-secondary [&>blockquote]:italic [&_code:not(pre_code)]:bg-white/10 [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:text-purple-300 [&_code:not(pre_code)]:text-[13px] [&_a]:text-chat-accent [&_a]:underline [&_a]:underline-offset-2 [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_th]:border-b [&_th]:border-chat-border [&_td]:p-2 [&_td]:border-b [&_td]:border-chat-border/50 [&_hr]:border-chat-border/50 [&_hr]:my-4">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
                                    const isInline = !className;
                                    if (isInline) {
                                      return <code className={className} {...props}>{children}</code>;
                                    }
                                    return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
                                  },
                                }}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ---- User Message Row ---- */
                    <div className="flex gap-3 justify-end">
                      <div className="max-w-[80%] md:max-w-[70%] flex flex-col items-end gap-1">
                        {/* Attachment preview, if any */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mb-1">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className="rounded-2xl overflow-hidden border border-chat-border max-w-[260px]">
                                {att.thumbnailB64 ? (
                                  <div className="relative">
                                    {att.thumbnailB64 && att.thumbnailB64.startsWith('blob:') && att.type === 'video' ? (
                                      <video
                                        src={att.thumbnailB64}
                                        controls
                                        className="w-full h-auto max-h-64 object-cover"
                                      />
                                    ) : (
                                      <div 
                                        className="cursor-pointer relative"
                                        onClick={() => {
                                          setPreviewImage(att.thumbnailB64 || null);
                                          setPreviewMediaType(att.thumbnailB64 && att.thumbnailB64.startsWith('blob:') && att.type === 'video' ? 'video' : 'image');
                                        }}
                                      >
                                        <img
                                          src={att.thumbnailB64}
                                          alt={att.fileName || (att.type === 'video' ? 'Uploaded video' : 'Uploaded image')}
                                          className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity"
                                        />
                                        {att.type === 'video' && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                              <Video className="w-4.5 h-4.5 text-white" />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-2.5 bg-chat-bg-secondary">
                                    {att.type === 'video' ? (
                                      <Video className="w-4 h-4 text-chat-text-secondary shrink-0" />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 text-chat-text-secondary shrink-0" />
                                    )}
                                    <span className="text-xs text-chat-text-secondary truncate">
                                      {att.fileName || (att.type === 'video' ? 'Video' : 'Image')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.text && (
                          <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-chat-accent text-white text-sm leading-relaxed shadow-md shadow-chat-accent/15">
                            <span className="whitespace-pre-wrap">{msg.text}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-chat-text-tertiary px-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-chat-bg-secondary border border-chat-border flex items-center justify-center mt-0.5">
                        {currentUser?.avatar ? (
                          <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        ) : (
                          <User2 className="w-3.5 h-3.5 text-chat-text-secondary" />
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator while streaming & no bot msg yet */}
              {sending && activeChat && activeChat.messages.length > 0 && activeChat.messages[activeChat.messages.length - 1]?.role === 'user' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-sm mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-chat-text-primary">VokiToki AI</span>
                      </div>
                      <div className="flex items-center gap-1.5 py-1">
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 rounded-full bg-chat-accent"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                        <span className="text-xs text-chat-text-tertiary ml-2">
                          {activeChat.messages[activeChat.messages.length - 1]?.attachments?.length ? 'Analyzing...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {showScrollDown && activeChat && activeChat.messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 p-2.5 rounded-full bg-chat-bg-secondary border border-chat-border shadow-lg hover:bg-chat-hover transition-all"
                title="Scroll to bottom"
              >
                <ChevronDown className="w-4 h-4 text-chat-text-secondary" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ==================== INPUT AREA ==================== */}
        <div className="shrink-0 border-t border-chat-border bg-chat-glass backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">

            {/* Pending attachment preview (staged before send) */}
            <AnimatePresence>
              {(pendingAttachment || attachmentLoading) && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 10 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="inline-flex items-center gap-2.5 bg-chat-bg-secondary border border-chat-border rounded-xl p-2 pr-3 max-w-full">
                    {attachmentLoading ? (
                      <div className="w-12 h-12 rounded-lg bg-chat-hover flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 animate-spin text-chat-text-tertiary" />
                      </div>
                    ) : pendingAttachment?.type === 'image' ? (
                      <img src={pendingAttachment.previewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <video src={pendingAttachment?.previewUrl} className="w-12 h-12 rounded-lg object-cover shrink-0" muted playsInline />
                    )}
                    {pendingAttachment && (
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-chat-text-primary truncate max-w-[180px]">{pendingAttachment.fileName}</p>
                        <p className="text-[10px] text-chat-text-tertiary">{formatBytes(pendingAttachment.sizeBytes)} · ready to send</p>
                      </div>
                    )}
                    {pendingAttachment && !attachmentLoading && (
                      <button
                        onClick={clearPendingAttachment}
                        className="ml-1 p-1 rounded-lg hover:bg-red-500/10 text-chat-text-tertiary hover:text-red-400 transition-colors shrink-0"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                onChange={onFileInputChange}
                className="hidden"
              />
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || attachmentLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Attach an image or video"
                className="shrink-0 w-[48px] h-[48px] rounded-2xl bg-chat-bg-secondary border border-chat-border flex items-center justify-center text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Paperclip className="w-4 h-4" />
              </motion.button>

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingAttachment ? "Ask something about this file (optional)..." : "Message VokiToki AI..."}
                  rows={1}
                  disabled={sending}
                  className="w-full resize-none bg-chat-bg-secondary border border-chat-border rounded-2xl px-4 py-3 pr-12 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent/50 focus:ring-1 focus:ring-chat-accent/20 transition-all overflow-y-auto"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px'; 
                  }}
                />
                {/* Character count */}
                {input.length > 100 && (
                  <span className={`absolute bottom-2 right-14 text-[10px] font-medium ${input.length > 7500 ? 'text-red-400' : 'text-chat-text-tertiary'}`}>
                    {input.length.toLocaleString()}
                  </span>
                )}
              </div>
              
              {sending ? (
                <motion.button
                  onClick={stopGeneration}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Stop generation"
                  className="shrink-0 w-[48px] h-[48px] rounded-2xl bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 transition-all"
                >
                  <Square className="w-4 h-4 fill-current" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() && !pendingAttachment}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Send message"
                  className="shrink-0 w-[48px] h-[48px] rounded-2xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center text-white shadow-lg shadow-chat-accent/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              )}
            </div>
            <p className="text-center text-chat-text-tertiary text-[11px] mt-2.5 font-medium">
              VokiToki AI · Powered by {modelName} · Responses may be inaccurate
            </p>
          </div>
        </div>
      </main>

      <ImagePreviewModal
        imageUrl={previewImage}
        mediaType={previewMediaType}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}