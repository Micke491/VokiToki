export interface IncomingCallData {
  callType: "voice" | "video";
  callerName: string;
  callerAvatar?: string;
  callerId: string;
}
