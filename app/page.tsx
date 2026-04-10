import Link from 'next/link';

export default function LandingPage() {
  return (
    // Deep dark background with a subtle ambient top glow
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col selection:bg-blue-500/30">
      
      {/* Background Ambient Gradient */}
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[40rem] w-[100%] max-w-[60rem] bg-blue-500/10 blur-[120px] rounded-full translate-y-[-20%]"></div>
      </div>

      {/* Navigation Layer - Glassmorphism effect */}
      <nav className="w-full bg-[#09090b]/80 backdrop-blur-lg flex items-center justify-between px-6 py-5 fixed top-0 left-0 right-0 z-50 transition-all">
        <div className="text-xl font-bold tracking-tighter text-zinc-100 flex items-center gap-2">
          {/* Subtle accent dot next to logo */}
          <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          ChatApp
        </div>
        <div className="flex items-center gap-8">
          <Link 
            href="/auth-pages/login" 
            className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-300"
          >
            Login
          </Link>
          <Link 
            href="/auth-pages/register" 
            className="text-sm font-medium bg-zinc-100 text-[#09090b] px-5 py-2.5 rounded-full hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-32 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 leading-[1.1] text-balance">
            Connect in real-time <br />
            <span className="text-blue-500 bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Simple and secure</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed text-balance font-light">
            Chat with friends, share media, and stay connected without any distractions. A clean interface built entirely for communication
          </p>
          
          <div className="flex justify-center pt-8">
            <Link 
              href="/auth-pages/register" 
              className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-blue-600 rounded-full overflow-hidden transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)]"
            >
              Start Chatting Now
            </Link>
          </div>
        </section>

        {/* Features Section - No containers, pure typography */}
        <section className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 py-12">
          
          {/* Feature 1 */}
          <div className="flex flex-col text-left group cursor-default">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 tracking-tight group-hover:text-blue-400 transition-colors duration-300">
              Instant Messaging
            </h3>
            <p className="text-zinc-400 leading-relaxed font-light text-base md:text-lg">
              Fast and reliable messaging. Get your words across instantly without delays, optimizing your daily communication flow
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="flex flex-col text-left group cursor-default">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 tracking-tight group-hover:text-blue-400 transition-colors duration-300">
              Media Sharing
            </h3>
            <p className="text-zinc-400 leading-relaxed font-light text-base md:text-lg">
              Share high-resolution photos, audio, and video effortlessly to make your private conversations significantly more engaging
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col text-left group cursor-default">
            <h3 className="text-xl font-semibold text-zinc-100 mb-4 tracking-tight group-hover:text-blue-400 transition-colors duration-300">
              Secure by Default
            </h3>
            <p className="text-zinc-400 leading-relaxed font-light text-base md:text-lg">
              Your conversations are kept strictly private with our sturdy, built-in, end-to-end encryption and security features
            </p>
          </div>

        </section>
      </main>
    </div>
  );
}