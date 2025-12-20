"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FloatingStats } from "@/components/ui/floating-stats";
import { Montserrat } from "next/font/google";
import { useRouter } from "next/navigation";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700", "900"] });

export default function LandingPage() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    // Wait for animation (e.g., 1.5s) before navigating
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className={`min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center ${montserrat.className}`}>

      {/* Space Background Layer */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black opacity-90"></div>

        {/* Stars - White */}
        <div className="absolute inset-0 animate-[fly_20s_linear_infinite]"
          style={{
            backgroundImage: 'radial-gradient(1.5px 1.5px at 10px 10px, white 100%, transparent 100%), radial-gradient(1px 1px at 150px 150px, rgba(255,255,255,0.5) 100%, transparent 100%)',
            backgroundSize: '300px 300px'
          }}
        />

        {/* Stars - Yellow Twinkling */}
        <div className="absolute inset-0 animate-[fly_30s_linear_infinite]"
          style={{
            backgroundImage: 'radial-gradient(2px 2px at 50px 50px, #FFD700 100%, transparent 100%), radial-gradient(2px 2px at 250px 250px, #FFFF00 100%, transparent 100%)',
            backgroundSize: '450px 450px',
            opacity: 0.8
          }}
        />
        <div className="absolute top-10 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-pulse blur-[1px]"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse delay-75 blur-[1px]"></div>
        <div className="absolute top-1/2 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse delay-150"></div>


        {/* Comets / Shooting Stars - Improved Visibility & Quantity */}
        <div className="absolute -top-20 right-[10%] w-[2px] h-[100px] bg-gradient-to-b from-transparent via-[#25F4EE] to-transparent animate-[comet_4s_infinite_1s] rotate-[25deg] drop-shadow-[0_0_5px_cyan]"></div>
        <div className="absolute -top-20 left-[20%] w-[3px] h-[120px] bg-gradient-to-b from-transparent via-[#FE2C55] to-transparent animate-[comet_6s_infinite_3s] -rotate-[15deg] drop-shadow-[0_0_5px_red]"></div>
        <div className="absolute -top-[200px] left-[50%] w-[2px] h-[150px] bg-gradient-to-b from-transparent via-white to-transparent animate-[comet_5s_infinite_0.5s] rotate-[5deg]"></div>
        <div className="absolute -top-[200px] right-[30%] w-[2px] h-[80px] bg-gradient-to-b from-transparent via-[#FFD700] to-transparent animate-[comet_8s_infinite_4s] rotate-[10deg]"></div>


        {/* Space Elements (SVG Planets) - Animated Downwards */}
        {/* Saturn */}
        <div className="absolute top-[-100px] left-[10%] opacity-80 animate-[fly-planet_15s_linear_infinite] delay-0">
          <svg width="100" height="100" viewBox="0 0 100 100" className="w-16 h-16 md:w-24 md:h-24 drop-shadow-[0_0_10px_rgba(254,44,85,0.3)]">
            <circle cx="50" cy="50" r="20" fill="#FE2C55" />
            <ellipse cx="50" cy="50" rx="35" ry="10" stroke="#25F4EE" strokeWidth="2" fill="none" transform="rotate(-20 50 50)" />
          </svg>
        </div>

        {/* Ice Planet */}
        <div className="absolute top-[-100px] right-[15%] opacity-80 animate-[fly-planet_20s_linear_infinite] delay-[5s]">
          <svg width="100" height="100" viewBox="0 0 100 100" className="w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_10px_rgba(37,244,238,0.3)]">
            <circle cx="50" cy="50" r="25" fill="#25F4EE" opacity="0.8" />
            <path d="M25 50 Q50 25 75 50" stroke="white" strokeWidth="2" fill="none" opacity="0.5" />
          </svg>
        </div>

        {/* Moon-like */}
        <div className="absolute top-[-100px] left-[30%] opacity-60 animate-[fly-planet_25s_linear_infinite] delay-[10s]">
          <svg width="100" height="100" viewBox="0 0 100 100" className="w-8 h-8 md:w-12 md:h-12">
            <circle cx="50" cy="50" r="30" fill="#333" stroke="#555" strokeWidth="1" />
            <circle cx="40" cy="40" r="5" fill="#222" />
            <circle cx="65" cy="60" r="8" fill="#222" />
          </svg>
        </div>

        {/* Floating Stats Layer */}
        <FloatingStats variant="landing" />

      </div>

      <main className="relative z-10 flex flex-col items-center text-center w-full max-w-5xl mx-auto h-full justify-center py-12 md:py-0">

        {/* Brand Area */}
        <div className={`flex flex-col items-center space-y-2 mb-8 transition-all duration-700 ${isLaunching ? 'scale-90 opacity-0 blur-sm' : ''}`}>
          {/* TikTok Glitch Logo - Layered properly for the effect */}
          <div className="relative">
            <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter text-white leading-none select-none relative z-10 mix-blend-screen">
              Organik
            </h1>
            <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter text-[#25F4EE] leading-none select-none absolute top-0 left-0 -translate-x-[2px] -translate-y-[2px] z-0 opacity-80 animate-glitch-cyan">
              Organik
            </h1>
            <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter text-[#FE2C55] leading-none select-none absolute top-0 left-0 translate-x-[2px] translate-y-[2px] z-0 opacity-80 animate-glitch-red">
              Organik
            </h1>
          </div>

          <p className="text-sm md:text-xl text-gray-400 font-bold tracking-[0.3em] uppercase max-w-xl leading-relaxed mt-4">
            Ne suis pas la tendance. <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Crée-la.</span>
          </p>
        </div>

        {/* CARTOON ROCKET from Image - Interactive with Launch Animation */}
        <div
          className={`relative w-32 h-32 md:w-48 md:h-48 z-20 mb-4 group cursor-pointer transition-all duration-500
                ${isLaunching ? 'animate-[rocket-launch_1s_ease-in_forwards]' : 'animate-[rocket-hover_3s_ease-in-out_infinite]'}`}
        >
          <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
            {/* Flame - Normal speed normally, Super fast on hover/launch */}
            <path d="M100 160 Q110 180 100 200 Q90 180 100 160" fill="#FFD700"
              className={`${isLaunching ? 'animate-[exhaust-flame_0.05s_infinite]' : 'animate-[exhaust-flame_0.1s_infinite] group-hover:animate-[exhaust-flame_0.05s_infinite]'}`}
            />
            <path d="M100 160 Q105 175 100 190 Q95 175 100 160" fill="#FFA500"
              className={`${isLaunching ? 'animate-[exhaust-flame_0.05s_infinite]' : 'animate-[exhaust-flame_0.1s_infinite] group-hover:animate-[exhaust-flame_0.05s_infinite]'} delay-75`}
            />

            {/* Left Fin */}
            <path d="M70 140 L60 160 L90 150 Z" fill="#D32F2F" stroke="#222" strokeWidth="4" strokeLinejoin="round" />
            {/* Right Fin */}
            <path d="M130 140 L140 160 L110 150 Z" fill="#D32F2F" stroke="#222" strokeWidth="4" strokeLinejoin="round" />

            {/* Body Main */}
            <ellipse cx="100" cy="100" rx="35" ry="60" fill="white" stroke="#222" strokeWidth="4" />

            {/* Nose Cone */}
            <path d="M72 70 Q100 10 128 70" fill="#F44336" stroke="#222" strokeWidth="4" />
            <path d="M72 70 Q100 80 128 70" fill="#F44336" /> {/* Curve at bottom of nose */}

            {/* Window */}
            <circle cx="100" cy="100" r="16" fill="#2196F3" stroke="#222" strokeWidth="4" />
            <circle cx="100" cy="100" r="10" fill="#64B5F6" />
            <circle cx="104" cy="96" r="3" fill="white" opacity="0.8" />

            {/* Center Fin/stripe at bottom */}
            <path d="M85 145 Q100 155 115 145 L115 150 Q100 160 85 150 Z" fill="#2196F3" stroke="#222" strokeWidth="3" />
          </svg>
        </div>

        {/* CTA Section - Disappears on launch */}
        <div className={`relative group scale-100 z-30 mt-2 transition-all duration-500 ${isLaunching ? 'opacity-0 scale-50' : ''}`}>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500 animate-tilt"></div>

          <Button
            onClick={handleLaunch}
            disabled={isLaunching}
            size="lg"
            className="relative text-base md:text-lg font-bold px-8 py-6 rounded-full bg-black text-white hover:bg-black border border-white/10 transition-all active:scale-95 uppercase tracking-[0.15em] shadow-xl"
          >
            {isLaunching ? "Décollage..." : "C'est parti !"}
          </Button>

        </div>

      </main>

      <footer className="absolute bottom-4 text-[9px] md:text-[10px] font-bold tracking-[0.5em] text-white/20 uppercase z-10">
        Organik Program © 2025
      </footer>
    </div>
  );
}
