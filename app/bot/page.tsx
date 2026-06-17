'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import SideBar from '@/features/sidebar/components/Sidebar';
import {
  Bot, Plus, Trash2, Send, Loader2,
  MessageSquare, MoreVertical, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  botPersona?: string;
}

interface BotMessage {
  _id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

interface BotChat {
  _id: string;
  title: string;
  messages: BotMessage[];
  updatedAt: string;
}

export default function BotPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const openChat = async (chatId: string) => {
    setLoadingMessages(true);
    setMobileSidebarOpen(false);
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

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    
    // Reset textarea height back to single line after sending
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
          body: JSON.stringify({ title: text })
        });
        if (!createRes.ok) throw new Error('Failed to create chat');
        targetChat = await createRes.json();
        setChats(prev => [targetChat!, ...prev]);
      } catch (e: any) {
        alert(e.message || 'Failed to create chat');
        setSending(false);
        setAbortController(null);
        return;
      }
    }

    const tempUserMsg: BotMessage = {
      _id: 'temp-user-' + Date.now(),
      role: 'user',
      text,
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
        body: JSON.stringify({ text }),
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
                        if (!prev) return prev;
                        return { ...prev, messages: [...prev.messages, { ...tempBotMsg, text: currentBotText }] };
                      });
                    } else {
                      setActiveChat(prev => {
                        if (!prev) return prev;
                        const newMsgs = [...prev.messages];
                        const lastIndex = newMsgs.length - 1;
                        
                        if (lastIndex >= 0 && newMsgs[lastIndex].role === 'model') {
                           newMsgs[lastIndex] = { ...newMsgs[lastIndex], text: currentBotText };
                        }
                        return { ...prev, messages: newMsgs };
                      });
                    }
                  } else if (data.type === 'init') {
                    setActiveChat(prev => {
                      if (!prev) return prev;
                      const newMsgs = [...prev.messages];
                      const idx = newMsgs.findIndex(m => m._id === tempUserMsg._id);
                      if (idx !== -1 && data.userMessage) newMsgs[idx] = data.userMessage;
                      return { ...prev, messages: newMsgs };
                    });
                  } else if (data.type === 'done') {
                    if (!botMsgAdded) {
                      botMsgAdded = true;
                      setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, data.botMessage] } : prev);
                    } else {
                      setActiveChat(prev => {
                        if (!prev) return prev;
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
                  // Wait for completion chunk formatting errors
                }
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Expected when user hits 'Stop Generation' button. Do nothing.
      } else {
        setActiveChat(prev => {
          if (!prev) return prev;
          const newMsgs = [...prev.messages];
          const errorText = '⚠️ Error: ' + (err.message || 'Failed to connect to AI provider.');
          const lastIndex = newMsgs.length - 1;
          
          if (lastIndex >= 0 && newMsgs[lastIndex].role === 'model' && newMsgs[lastIndex]._id === tempBotMsg._id) {
            newMsgs[lastIndex] = { ...newMsgs[lastIndex], text: errorText };
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

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <div className="ambient-glow"><div className="ambient-glow-inner" /></div>

      {/* Main Sidebar */}
      <div className="relative z-[101]">
        <SideBar currentUser={currentUser || undefined} isMobileDrawerOpen={false} onCloseMobileDrawer={() => {}} />
      </div>

      {/* Bot Chat Sidebar */}
      <>
        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[102] bg-black/60 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside className={`
          absolute md:relative z-[103] md:z-auto h-full
          flex flex-col w-72 shrink-0
          bg-chat-glass backdrop-blur-xl border-r border-chat-border
          transition-transform duration-300
          ${mobileSidebarOpen ? 'translate-x-[280px]' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Sidebar header */}
          <div className="p-5 border-b border-chat-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-chat-text-primary text-sm">AI Assistant</h2>
                <p className="text-chat-text-secondary text-xs">Gemini 3.5 Flash</p>
              </div>
            </div>
            <button
              onClick={createChat}
              className="p-2 rounded-xl bg-chat-accent/10 hover:bg-chat-accent/20 text-chat-accent transition-all"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {loadingChats ? (
              <div className="flex justify-center pt-8">
                <Loader2 className="w-5 h-5 text-chat-accent animate-spin" />
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center pt-10 px-4">
                <MessageSquare className="w-8 h-8 text-chat-text-tertiary mx-auto mb-3" />
                <p className="text-chat-text-secondary text-sm">No chats yet.</p>
              </div>
            ) : (
              chats.map(chat => (
                <motion.div
                  key={chat._id}
                  onClick={() => openChat(chat._id)}
                  whileHover={{ x: 3 }}
                  className={`w-full cursor-pointer text-left px-4 py-3 rounded-2xl transition-all group flex items-center gap-3 ${
                    activeChat?._id === chat._id
                      ? 'bg-chat-accent text-white shadow-md shadow-chat-accent/30'
                      : 'hover:bg-chat-hover text-chat-text-secondary hover:text-chat-text-primary'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="flex-1 truncate text-sm font-medium">{chat.title}</span>
                  <button
                    onClick={(e) => deleteChat(chat._id, e)}
                    className={`shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                      activeChat?._id === chat._id ? 'hover:bg-white/20' : 'hover:bg-red-500/10 text-red-400'
                    }`}
                  >
                    {deletingId === chat._id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </aside>
      </>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Top bar */}
        <header className="shrink-0 h-16 border-b border-chat-border flex items-center px-5 gap-4 bg-chat-glass backdrop-blur-xl">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl text-chat-text-secondary hover:text-chat-text-primary hover:bg-chat-hover"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {activeChat ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-chat-text-primary truncate">{activeChat.title}</p>
                <p className="text-xs text-chat-text-secondary">
                  {activeChat.messages.length} message{activeChat.messages.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-chat-accent" />
              <span className="font-bold text-chat-text-primary">AI Assistant</span>
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 scrollbar-thin">
          {!activeChat || activeChat.messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-2xl shadow-chat-accent/30"
              >
                <Bot className="w-12 h-12 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-chat-text-primary">Your AI Assistant</h2>
                <p className="text-chat-text-secondary mt-2 max-w-md">
                  I can help with coding, writing, brainstorming, and more. 
                </p>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="flex justify-center pt-20">
              <Loader2 className="w-7 h-7 text-chat-accent animate-spin" />
            </div>
          ) : (
            activeChat.messages.map((msg) => (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-md mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-chat-accent text-white rounded-tr-sm shadow-md shadow-chat-accent/20'
                      : 'bg-chat-bg-secondary border border-chat-border text-chat-text-primary rounded-tl-sm'
                  }`}>
                    {msg.role === 'model' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>pre]:overflow-x-auto [&>pre]:rounded-xl [&>pre]:p-4 [&>code]:text-purple-300">
                        {msg.text === '' ? (
                           <div className="flex gap-1 items-center px-1">
                             <motion.span className="w-1.5 h-1.5 rounded-full bg-white/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                             <motion.span className="w-1.5 h-1.5 rounded-full bg-white/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                             <motion.span className="w-1.5 h-1.5 rounded-full bg-white/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
                           </div>
                        ) : (
                           <ReactMarkdown>{msg.text}</ReactMarkdown>
                        )}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    )}
                  </div>
                  <span className="text-xs text-chat-text-tertiary px-1">{formatTime(msg.createdAt)}</span>
                </div>
                {msg.role === 'user' && currentUser?.avatar && (
                  <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden mt-1">
                    <img src={currentUser.avatar} alt="You" className="w-full h-full object-cover" />
                  </div>
                )}
              </motion.div>
            ))
          )}

          {/* Typing indicator */}
          {sending && activeChat && activeChat.messages.length > 0 && activeChat.messages[activeChat.messages.length - 1]?.role === 'user' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center shadow-md mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-chat-bg-secondary border border-chat-border flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full bg-chat-accent"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 p-4 md:p-6 border-t border-chat-border bg-chat-glass backdrop-blur-xl">
          {/* Changed "items-end" to "items-center" to align the button perfectly in the middle */}
          <div className="max-w-3xl mx-auto flex gap-3 items-center">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me something"
                rows={1}
                disabled={sending}
                className="w-full resize-none bg-chat-bg-secondary border border-chat-border rounded-2xl px-5 py-3.5 text-sm text-chat-text-primary placeholder:text-chat-text-tertiary focus:outline-none focus:border-chat-accent transition-colors overflow-y-auto"
                style={{ minHeight: '52px' }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px'; 
                }}
              />
            </div>
            
            {/* Conditional Render: Send or Stop Generate Button */}
            {sending ? (
              <motion.button
                onClick={stopGeneration}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Stop generation"
                className="shrink-0 w-[52px] h-[52px] rounded-2xl bg-red-500/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all"
              >
                <Square className="w-5 h-5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                onClick={sendMessage}
                disabled={!input.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Send message"
                className="shrink-0 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-chat-accent to-purple-600 flex items-center justify-center text-white shadow-lg shadow-chat-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            )}

          </div>
          <p className="text-center text-chat-text-tertiary text-xs mt-3">
            Powered by Gemini 3.5 Flash · Responses may be inaccurate
          </p>
        </div>
      </main>
    </div>
  );
}