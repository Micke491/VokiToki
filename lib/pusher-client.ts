import Pusher from "pusher-js";

const PusherClass = (Pusher as any).default || Pusher;

export const pusherClient =
  typeof window !== "undefined"
    ? new PusherClass(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      })
    : null;
