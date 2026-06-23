'use client';

import React, { useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { wsClient } from '@/lib/ws-client';
import toast from 'react-hot-toast';

interface UseVoiceRecorderProps {
  chatId: string;
  currentUserId: string;
  replyingToId: string | undefined;
  setReplyingTo: (msg: any) => void;
  scrollToBottom: (force: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useVoiceRecorder({
  chatId,
  currentUserId,
  replyingToId,
  setReplyingTo,
  scrollToBottom,
  inputRef,
}: UseVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone.");
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!navigator.onLine) {
      toast.error("Offline: Cannot upload voice recordings without an internet connection.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "voice_message.webm");

    try {
      const response = await apiFetch("/api/chat/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      if (wsClient) {
        await apiFetch("/api/chat/message", {
          method: "POST",
          body: JSON.stringify({
            chatId,
            senderId: currentUserId,
            mediaUrl: data.url,
            mediaType: "audio",
            mediaPublicId: data.publicId,
            replyTo: replyingToId,
          }),
        });
        setReplyingTo(null);
        scrollToBottom(true);
      }
    } catch (error) {
      console.error("Audio upload error:", error);
      toast.error("Failed to send voice message.");
    } finally {
      setUploading(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await sendAudioMessage(audioBlob);
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    isRecording,
    recordingDuration,
    uploading,
    startRecording,
    stopRecording,
    cancelRecording,
    formatRecordingTime,
  };
}

