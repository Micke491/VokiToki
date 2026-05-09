"use client";

import React, { useEffect } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  LayoutContextProvider,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { RoomEvent } from "livekit-client";

interface CallModalProps {
  onLeave: () => void;
  token: string;
  roomName: string;
  callType: "voice" | "video";
  username?: string;
}

export default function CallModal({
  onLeave,
  token,
  roomName,
  callType,
  username,
}: CallModalProps) {
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl || !token) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center text-white">
        <p>Connecting to call...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black">
      <LiveKitRoom
        video={callType === "video"}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
        onDisconnected={onLeave}
      >
        <RoomConnectionListener onLeave={onLeave} />
        
        <VideoConference />

        <RoomAudioRenderer />
        
      </LiveKitRoom>
      
      <style dangerouslySetInnerHTML={{__html: `
        .lk-chat-toggle,
        .lk-settings-toggle {
          display: none !important;
        }
      `}} />
    </div>
  );
}

function RoomConnectionListener({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  
  useEffect(() => {
    room.on(RoomEvent.Disconnected, onLeave);
    return () => {
      room.off(RoomEvent.Disconnected, onLeave);
    };
  }, [room, onLeave]);

  return null;
}