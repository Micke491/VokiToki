"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOff,
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
  MonitorUp,
  MonitorOff,
  ChevronDown,
} from "lucide-react";
import { useWebRTC, CallParticipant } from "../hooks/useWebRTC";

interface CallModalProps {
  onLeave: () => void;
  callId: string;
  callType: "voice" | "video";
  currentUser: {
    _id: string;
    username: string;
    avatar?: string;
  };
  remoteUser: {
    username: string;
    avatar?: string;
    id?: string;
  };
}

function VideoSurface({
  stream,
  mirror,
  className,
}: {
  stream: MediaStream | null;
  mirror?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={className}
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}

function AudioSink({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);

  return <audio ref={ref} autoPlay />;
}

export default function CallModal({
  onLeave,
  callId,
  callType,
  remoteUser,
  currentUser,
}: CallModalProps) {
  const rUser = {
    username: remoteUser?.username || "Remote User",
    avatar: remoteUser?.avatar,
    id: remoteUser?.id,
  };

  const cUser = {
    _id: currentUser?._id,
    username: currentUser?.username || "You",
    avatar: currentUser?.avatar,
  };

  const rtc = useWebRTC({
    callId,
    currentUser: cUser,
    withVideo: callType === "video",
  });

  const renderConnectingLayout = () => (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-neutral-950 to-black text-white p-6 justify-between select-none">
      <div className="flex items-center justify-between">
        <span className="text-xs bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800/80 flex items-center gap-2 text-zinc-300 backdrop-blur-md">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          Connecting session...
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto my-auto items-center">
        {/* Local Participant Box */}
        <div className="aspect-video w-full rounded-3xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          <div className="relative w-24 h-24 mb-4">
            {cUser.avatar ? (
              <img src={cUser.avatar} alt={cUser.username} className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700/50" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-850 flex items-center justify-center text-3xl font-bold uppercase border-2 border-zinc-700/50">
                {cUser.username.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-lg font-semibold text-zinc-200">{cUser.username} (You)</span>
          <span className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            Initializing devices...
          </span>
        </div>

        {/* Remote Participant Box (Vibrating / Ringing) */}
        <motion.div
          animate={{
            y: [0, -4, 4, -4, 4, -2, 2, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
          className="aspect-video w-full rounded-3xl bg-zinc-950/30 backdrop-blur-sm border border-rose-500/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl ring-1 ring-rose-500/5"
        >
          <div className="relative w-24 h-24 mb-4">
            <motion.div
              animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-rose-500/20"
            />
            <motion.div
              animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 rounded-full bg-rose-500/10"
            />
            {rUser.avatar ? (
              <img src={rUser.avatar} alt={rUser.username} className="w-24 h-24 rounded-full object-cover relative z-10 border-2 border-rose-500/20" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold uppercase relative z-10 border-2 border-rose-500/20">
                {rUser.username.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-lg font-semibold text-zinc-200">{rUser.username}</span>
          <span className="text-sm text-rose-400 font-medium animate-pulse mt-1">Ringing...</span>
        </motion.div>
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={onLeave}
          className="w-16 h-16 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.3)] transition-all"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-black">
      {!rtc.ready ? (
        renderConnectingLayout()
      ) : (
        <CallActive rtc={rtc} remoteUser={rUser} currentUser={cUser} onLeave={onLeave} />
      )}
      {/* Remote audio playback */}
      {rtc.participants.map(
        (p) => p.stream && <AudioSink key={p.sid} stream={p.stream} />
      )}
    </div>
  );
}

interface CallActiveProps {
  rtc: ReturnType<typeof useWebRTC>;
  currentUser: {
    username: string;
    avatar?: string;
  };
  remoteUser: {
    username: string;
    avatar?: string;
    id?: string;
  };
  onLeave: () => void;
}

function CallActive({ rtc, remoteUser, currentUser, onLeave }: CallActiveProps) {
  const {
    participants,
    localStream,
    localScreenStream,
    micEnabled,
    camEnabled,
    screenSharing,
    localSpeaking,
    mediaError,
    micDevices,
    camDevices,
    activeMicId,
    activeCamId,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    switchMic,
    switchCam,
  } = rtc;

  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showCamMenu, setShowCamMenu] = useState(false);

  const micDropdownRef = useRef<HTMLDivElement>(null);
  const camDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (micDropdownRef.current && !micDropdownRef.current.contains(e.target as Node)) {
        setShowMicMenu(false);
      }
      if (camDropdownRef.current && !camDropdownRef.current.contains(e.target as Node)) {
        setShowCamMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const isRemoteConnected = participants.length > 0;
  const totalParticipants = participants.length + 1;

  const [hasRemoteConnected, setHasRemoteConnected] = useState(false);

  useEffect(() => {
    if (isRemoteConnected) {
      setHasRemoteConnected(true);
    }
  }, [isRemoteConnected]);

  useEffect(() => {
    if (hasRemoteConnected && !isRemoteConnected) {
      onLeave();
    }
  }, [isRemoteConnected, hasRemoteConnected, onLeave]);

  useEffect(() => {
    if (isRemoteConnected || hasRemoteConnected) return;

    const timer = setTimeout(() => {
      onLeave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [isRemoteConnected, hasRemoteConnected, onLeave]);

  const getParticipantDetails = (p: CallParticipant) => {
    let username = p.username;
    let avatar = p.avatar;
    if ((!username || username === "User") && remoteUser.id && p.userId === remoteUser.id) {
      username = remoteUser.username;
      avatar = avatar || remoteUser.avatar;
    }
    return { username: username || "Remote User", avatar };
  };

  const screenShares: { label: string; stream: MediaStream }[] = [];
  if (screenSharing && localScreenStream) {
    screenShares.push({ label: "Your Screen Share", stream: localScreenStream });
  }
  participants.forEach((p) => {
    if (p.screenStream) {
      screenShares.push({
        label: `${getParticipantDetails(p).username}'s Screen`,
        stream: p.screenStream,
      });
    }
  });
  const hasScreenShare = screenShares.length > 0;

  const localHasVideo = camEnabled && localStream && localStream.getVideoTracks().length > 0;

  return (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-neutral-950 to-black text-white p-6 justify-between select-none">
      {/* Top Details bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-850 text-zinc-300 backdrop-blur-md shadow-md">
          {hasScreenShare ? "Screen Presentation" : camEnabled ? "Video Meeting" : "Voice Call"} • {totalParticipants} Active
        </span>
        {mediaError && (
          <span className="text-xs bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 text-red-400 backdrop-blur-md">
            {mediaError}
          </span>
        )}
      </div>

      {/* Grid container with balanced animations */}
      <AnimatePresence mode="wait">
        {hasScreenShare ? (
          /* Split Screen Share Layout */
          <motion.div
            key="screenshare-layout"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 min-h-0 relative my-6 items-stretch"
          >
            {/* Main Shared Screen Presentation */}
            <div className="flex-[3] rounded-3xl bg-zinc-950/60 border border-indigo-500/20 overflow-hidden relative shadow-2xl flex flex-col justify-between group min-h-[320px]">
              <VideoSurface
                stream={screenShares[0].stream}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-black/60 backdrop-blur-xl text-xs font-semibold px-4 py-2 rounded-xl border border-white/10 text-indigo-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  {screenShares[0].label}
                </span>
              </div>
            </div>

            {/* Sidebar for Small Participant Windows */}
            <div className="flex-1 lg:max-w-[280px] flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden p-1 shrink-0 scrollbar-none justify-center lg:justify-start">

              {/* Local Video Thumbnail */}
              <div className="relative aspect-video w-44 lg:w-full rounded-2xl bg-zinc-900/90 border border-zinc-800 overflow-hidden shrink-0 shadow-lg flex items-center justify-center">
                {localHasVideo ? (
                  <VideoSurface
                    stream={localStream}
                    mirror
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="You" className="w-14 h-14 rounded-full object-cover border border-zinc-800" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold uppercase border border-zinc-800">
                        {currentUser.username.charAt(0)}
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] flex items-center gap-1.5 border border-zinc-800/80">
                  <span className="font-medium text-zinc-300">You</span>
                  {!micEnabled && <MicOff className="w-3 h-3 text-red-500" />}
                </div>
              </div>

              {/* Remote Participant Thumbnails */}
              {participants.map((p) => {
                const isCameraActive = p.camEnabled && p.stream;
                const { username: pName, avatar: pAvatar } = getParticipantDetails(p);

                return (
                  <div
                    key={p.sid}
                    className="relative aspect-video w-44 lg:w-full rounded-2xl bg-zinc-900/90 border border-zinc-800 overflow-hidden shrink-0 shadow-lg flex items-center justify-center"
                  >
                    {isCameraActive ? (
                      <VideoSurface
                        stream={p.stream}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-14 h-14 flex items-center justify-center">
                        {p.isSpeaking && (
                          <>
                            <motion.div
                              className="absolute inset-0 rounded-full bg-emerald-500/20"
                              animate={{ scale: [1, 1.4, 1.6], opacity: [0.8, 0.4, 0] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                            />
                            <motion.div
                              className="absolute inset-0 rounded-full bg-emerald-500/10"
                              animate={{ scale: [1, 1.2, 1.3], opacity: [0.6, 0.2, 0] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.4 }}
                            />
                          </>
                        )}
                        {pAvatar ? (
                          <img
                            src={pAvatar}
                            alt={pName}
                            className={`w-14 h-14 rounded-full object-cover border-2 relative z-10 ${
                              p.isSpeaking ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-zinc-800"
                            }`}
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold uppercase border-2 relative z-10 ${
                            p.isSpeaking ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-zinc-800"
                          }`}>
                            {pName.charAt(0)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] flex items-center gap-1.5 border border-zinc-800/80">
                      <span className="font-medium text-zinc-300">{pName}</span>
                      {!p.micEnabled && <MicOff className="w-3 h-3 text-red-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Responsive Balanced Grid Layout */
          <motion.div
            key="grid-layout"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`grid gap-6 w-full max-w-6xl mx-auto my-auto items-center justify-center ${
              totalParticipants <= 2
                ? "grid-cols-1 md:grid-cols-2"
                : totalParticipants <= 4
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {/* Local Participant Block */}
            <div className="aspect-video w-full rounded-3xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-all duration-300 hover:border-zinc-700/60">
              {localHasVideo ? (
                <>
                  <VideoSurface
                    stream={localStream}
                    mirror
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-sm flex items-center gap-2 border border-zinc-800/80">
                    <span className="font-medium text-zinc-200">{currentUser.username} (You)</span>
                    {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 mb-4">
                    {micEnabled && localSpeaking && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-full bg-emerald-500/20"
                          animate={{ scale: [1, 1.4, 1.6], opacity: [0.8, 0.4, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full bg-emerald-500/10"
                          animate={{ scale: [1, 1.2, 1.3], opacity: [0.6, 0.2, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.4 }}
                        />
                      </>
                    )}
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.username}
                        className={`w-24 h-24 rounded-full object-cover border-2 relative z-10 transition-all duration-300 ${
                          localSpeaking ? "border-emerald-500 ring-4 ring-emerald-500/30" : "border-zinc-700/50"
                        }`}
                      />
                    ) : (
                      <div className={`w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold uppercase border-2 relative z-10 transition-all duration-300 ${
                        localSpeaking ? "border-emerald-500 ring-4 ring-emerald-500/30" : "border-zinc-700/50"
                      }`}>
                        {currentUser.username.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-zinc-200">{currentUser.username} (You)</span>
                  {!micEnabled && (
                    <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <MicOff className="w-3.5 h-3.5" /> Muted
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Remote Participant Block */}
            {isRemoteConnected ? (
              participants.map((p) => {
                const isCameraActive = p.camEnabled && p.stream;
                const { username: pName, avatar: pAvatar } = getParticipantDetails(p);

                return (
                  <div
                    key={p.sid}
                    className="aspect-video w-full rounded-3xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-all duration-300 hover:border-zinc-700/60"
                  >
                    {isCameraActive ? (
                      <>
                        <VideoSurface
                          stream={p.stream}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-sm flex items-center gap-2 border border-zinc-800/80">
                          <span className="font-medium text-zinc-200">{pName}</span>
                          {!p.micEnabled && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative w-24 h-24 mb-4">
                          {p.isSpeaking && (
                            <>
                              <motion.div
                                className="absolute inset-0 rounded-full bg-emerald-500/20"
                                animate={{ scale: [1, 1.4, 1.6], opacity: [0.8, 0.4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                              />
                              <motion.div
                                className="absolute inset-0 rounded-full bg-emerald-500/10"
                                animate={{ scale: [1, 1.2, 1.3], opacity: [0.6, 0.2, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.4 }}
                              />
                            </>
                          )}
                          {pAvatar ? (
                            <img
                              src={pAvatar}
                              alt={pName}
                              className={`w-24 h-24 rounded-full object-cover border-2 relative z-10 transition-all duration-300 ${
                                p.isSpeaking ? "border-emerald-500 ring-4 ring-emerald-500/30" : "border-zinc-700/50"
                              }`}
                            />
                          ) : (
                            <div className={`w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold uppercase border-2 relative z-10 transition-all duration-300 ${
                              p.isSpeaking ? "border-emerald-500 ring-4 ring-emerald-500/30" : "border-zinc-700/50"
                            }`}>
                              {pName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-lg font-semibold text-zinc-200">{pName}</span>
                        {!p.micEnabled && (
                          <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <MicOff className="w-3.5 h-3.5" /> Muted
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* High-fidelity Vibrating Ringing Placeholder */
              <motion.div
                animate={{
                  y: [0, -4, 4, -4, 4, -2, 2, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                }}
                className="aspect-video w-full rounded-3xl bg-zinc-950/30 backdrop-blur-sm border border-emerald-500/15 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl ring-1 ring-emerald-500/5"
              >
                <div className="relative w-24 h-24 mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-emerald-500/25"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                    className="absolute inset-0 rounded-full bg-emerald-500/15"
                  />
                  {remoteUser.avatar ? (
                    <img src={remoteUser.avatar} alt={remoteUser.username} className="w-24 h-24 rounded-full object-cover relative z-10 border-2 border-emerald-500/20" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold uppercase relative z-10 border-2 border-emerald-500/20">
                      {remoteUser.username.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-lg font-semibold text-zinc-200">{remoteUser.username}</span>
                <span className="text-sm text-emerald-400 font-medium animate-pulse mt-1">Ringing...</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Glassmorphic Call Action Bar */}
      <div className="flex justify-center items-center gap-4 md:gap-6 mb-6">

        {/* Toggle Audio Button + Dropdown */}
        <div ref={micDropdownRef} className="relative flex items-center bg-zinc-900 border border-zinc-850 rounded-full shadow-lg hover:border-zinc-800 transition-all">
          <button
            onClick={toggleMic}
            className={`w-14 h-14 rounded-l-full flex items-center justify-center transition-all active:scale-95 ${
              micEnabled
                ? "text-white hover:bg-zinc-850"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
            }`}
          >
            {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <div className="w-[1px] h-6 bg-zinc-800" />

          <button
            onClick={() => {
              setShowMicMenu(!showMicMenu);
              setShowCamMenu(false);
            }}
            className="px-2.5 h-14 rounded-r-full flex items-center justify-center hover:bg-zinc-850 transition-all text-zinc-400 hover:text-zinc-200 active:scale-95"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showMicMenu ? "rotate-180" : ""}`} />
          </button>

          {/* Mic Menu Dropdown */}
          <AnimatePresence>
            {showMicMenu && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-16 left-0 min-w-[220px] bg-zinc-950/95 border border-zinc-800/80 backdrop-blur-xl rounded-2xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1001] flex flex-col gap-1 max-h-60 overflow-y-auto"
              >
                <div className="text-zinc-400 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1.5 border-b border-zinc-900/80 mb-1 flex items-center justify-between">
                  <span>Microphones</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                {micDevices.length === 0 ? (
                  <div className="text-zinc-500 text-xs px-2.5 py-2 italic text-center">
                    No microphones found
                  </div>
                ) : (
                  micDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={async () => {
                        await switchMic(device.deviceId);
                        setShowMicMenu(false);
                      }}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                        device.deviceId === activeMicId
                          ? "bg-indigo-600/90 text-white font-medium shadow-md"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
                      }`}
                    >
                      <span className="truncate pr-2 text-left">
                        {device.label || `Microphone ${device.deviceId.substring(0, 5)}`}
                      </span>
                      {device.deviceId === activeMicId && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle Camera Button + Dropdown */}
        <div ref={camDropdownRef} className="relative flex items-center bg-zinc-900 border border-zinc-850 rounded-full shadow-lg hover:border-zinc-800 transition-all">
          <button
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-l-full flex items-center justify-center transition-all active:scale-95 ${
              camEnabled
                ? "text-white hover:bg-zinc-850"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
            }`}
          >
            {camEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <div className="w-[1px] h-6 bg-zinc-800" />

          <button
            onClick={() => {
              setShowCamMenu(!showCamMenu);
              setShowMicMenu(false);
            }}
            className="px-2.5 h-14 rounded-r-full flex items-center justify-center hover:bg-zinc-850 transition-all text-zinc-400 hover:text-zinc-200 active:scale-95"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showCamMenu ? "rotate-180" : ""}`} />
          </button>

          {/* Camera Menu Dropdown */}
          <AnimatePresence>
            {showCamMenu && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-16 left-0 min-w-[220px] bg-zinc-950/95 border border-zinc-800/80 backdrop-blur-xl rounded-2xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1001] flex flex-col gap-1 max-h-60 overflow-y-auto"
              >
                <div className="text-zinc-400 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1.5 border-b border-zinc-900/80 mb-1 flex items-center justify-between">
                  <span>Cameras</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </div>
                {camDevices.length === 0 ? (
                  <div className="text-zinc-500 text-xs px-2.5 py-2 italic text-center">
                    No cameras found
                  </div>
                ) : (
                  camDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={async () => {
                        await switchCam(device.deviceId);
                        setShowCamMenu(false);
                      }}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                        device.deviceId === activeCamId
                          ? "bg-indigo-600/90 text-white font-medium shadow-md"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
                      }`}
                    >
                      <span className="truncate pr-2 text-left">
                        {device.label || `Camera ${device.deviceId.substring(0, 5)}`}
                      </span>
                      {device.deviceId === activeCamId && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle Screen Share Button */}
        <button
          onClick={toggleScreenShare}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 border ${
            screenSharing
              ? "bg-indigo-650 text-white border-indigo-550 hover:bg-indigo-600"
              : "bg-zinc-900 border-zinc-800 hover:bg-zinc-850 text-zinc-300"
          }`}
        >
          {screenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
        </button>

        {/* Hang Up Button */}
        <button
          onClick={onLeave}
          className="w-16 h-16 bg-rose-600 hover:bg-rose-700 active:scale-90 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
