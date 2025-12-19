import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center font-sans tracking-tight">
      {/* Background Ambience - Clean White/Black, but subtle neon blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />

      <main className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto space-y-10 animate-in fade-in zoom-in duration-500">

        {/* Brand / Logo Area */}
        <div className="flex flex-col items-center space-y-4 mb-4">
          {/* Glitch Effect on Text */}
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-foreground relative">
            <span className="absolute -left-[2px] -top-[2px] text-primary opacity-70 mix-blend-multiply animate-pulse">Révolution</span>
            <span className="absolute -right-[2px] -bottom-[2px] text-secondary opacity-70 mix-blend-multiply animate-pulse">Révolution</span>
            <span className="relative z-10">Révolution</span>
          </h1>
          <p className="text-xl md:text-3xl text-foreground/80 font-bold tracking-tight max-w-2xl">
            Ne suis pas la tendance. <span className="text-primary">Crée-la.</span>
          </p>
        </div>

        {/* CTA Section */}
        <div className="relative group scale-125">
          {/* Hard Shadow / Glitch Button */}
          <div className="absolute top-1 left-1 w-full h-full bg-secondary rounded-full -z-10 transition-transform group-hover:translate-x-1 group-hover:translate-y-1"></div>
          <div className="absolute -top-1 -left-1 w-full h-full bg-primary rounded-full -z-10 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"></div>

          <Link href="/dashboard">
            <Button
              size="lg"
              className="relative text-xl font-bold px-16 py-8 rounded-full bg-black hover:bg-black/90 text-white shadow-2xl transition-all active:scale-95 border-2 border-transparent"
            >
              Essayer
            </Button>
          </Link>
        </div>

        {/* Floating Icons Decor - Pinned to Corners */}
        <div className="fixed inset-0 w-screen h-screen pointer-events-none overflow-hidden z-0">
          {/* TikTok Icon - Top Left Corner */}
          <div className="absolute top-8 left-8 md:top-16 md:left-16 animate-float-slow opacity-90 rotate-[-12deg]">
            <div className="w-14 h-14 md:w-28 md:h-28 bg-black rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-500">
              <svg className="w-8 h-8 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 7.5C16.5 7.5 15.5 7.5 14.5 8C13.5 8.5 13 9 13 9V15.5C13 17 12 18 10.5 18C9 18 8 17 8 15.5C8 14 9 13 10 13V11C7.5 11 6 13 6 15.5C6 18 8 20 10.5 20C13 20 15 18 15 15.5V11.5C15.5 12 16 12 16.5 12V7.5Z" fill="white" />
                <path d="M16.5 7.5C16.5 7.5 15.5 7.5 14.5 8C13.5 8.5 13 9 13 9V11.5C13.5 11 14 10.5 15 10V7.5H16.5Z" fill="#25F4EE" />
                <path d="M13 11.5V15.5C13 17 12 18 10.5 18C9 18 8 17 8 15.5C8 14 9 13 10 13V11C7.5 11 6 13 6 15.5C6 18 8 20 10.5 20C13 20 15 18 15 15.5V11.5" stroke="#FE2C55" strokeWidth="1" />
              </svg>
            </div>
          </div>

          {/* Instagram Icon - Bottom Right Corner */}
          <div className="absolute bottom-8 right-8 md:bottom-16 md:right-16 animate-float-delayed opacity-90 rotate-[12deg]">
            <div className="w-14 h-14 md:w-28 md:h-28 bg-white border-[3px] md:border-4 border-black rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-500">
              <svg className="w-8 h-8 md:w-16 md:h-16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </div>
          </div>

          {/* Floating Shapes - Pushed further to edges */}
          <div className="absolute top-[25%] right-[5%] w-6 h-6 rounded-full bg-primary animate-pulse-glow opacity-60"></div>
          <div className="absolute bottom-[25%] left-[5%] w-10 h-10 rounded-full bg-secondary animate-pulse-glow delay-1000 opacity-60"></div>
        </div>
      </main>

      <footer className="absolute bottom-6 text-xs md:text-sm font-bold tracking-widest uppercase opacity-40">
        Révolution © 2025
      </footer>
    </div>
  );
}
