import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  Download,
  Smartphone,
  ShieldCheck,
  MessageSquare,
  Video,
  ArrowLeft,
} from "lucide-react";

const APK_URL =
  "https://github.com/Micke491/voki-toki-mobile/releases/latest/download/vokitoki.apk";

export const metadata = {
  title: "Download VokiToki for Android",
  description:
    "Install the VokiToki Android app directly — real-time chat, voice and video calls, and stories on your phone.",
};

const steps = [
  {
    title: "Download the APK",
    body: "Tap the button above on your Android phone to download vokitoki.apk.",
  },
  {
    title: "Allow the install",
    body: 'Open the downloaded file. If Android asks, allow installs from this source ("Install unknown apps") for your browser or Files app.',
  },
  {
    title: "Install & open",
    body: "Tap Install, then Open. Sign in with your VokiToki account and you're ready to go.",
  },
];

const highlights = [
  { icon: MessageSquare, label: "Real-time chat" },
  { icon: Video, label: "Voice & video calls" },
  { icon: ShieldCheck, label: "Same account as web" },
];

export default function DownloadPage() {
  return (
    <main className="relative min-h-screen bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Back to VokiToki home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <ArrowLeft size={16} /> Home
          </Link>
        </div>

        {/* Hero */}
        <div className="flex flex-1 flex-col justify-center py-14">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-300">
            <Smartphone size={14} /> Android app
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            Get VokiToki
            <br />
            on your phone
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-zinc-400">
            Chat, call and share on the go. Download the app directly — no app
            store required. It connects to the same VokiToki account you use on
            the web.
          </p>

          {/* Download button */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={APK_URL}
              download
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-bold text-white shadow-[0_0_40px_-10px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-0.5 hover:bg-blue-500"
            >
              <Download size={20} /> Download for Android
            </a>
            <span className="text-sm text-zinc-500">
              .apk &middot; Android only
            </span>
          </div>

          {/* Highlights */}
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
            {highlights.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 text-sm text-zinc-400"
              >
                <Icon size={16} className="text-blue-400" /> {label}
              </span>
            ))}
          </div>
        </div>

        {/* Install steps */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
          <h2 className="mb-5 text-lg font-bold tracking-tight text-white">
            How to install
          </h2>
          <ol className="space-y-5">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600/15 text-sm font-bold text-blue-300">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-zinc-100">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-zinc-500">
            Your phone may warn that the app is from an unknown source because
            it&apos;s installed outside the Play Store. That&apos;s expected for
            a direct download. iPhone is not supported for direct install.
          </p>
        </div>

        <p className="pt-8 text-center text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} VokiToki
        </p>
      </div>
    </main>
  );
}
