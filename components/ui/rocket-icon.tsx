"use client";

import { cn } from "@/lib/utils";

interface RocketIconProps {
    className?: string;
    isLaunching?: boolean;
    showSmoke?: boolean;
}

export function RocketIcon({ className, isLaunching = false, showSmoke }: RocketIconProps) {
    // Only show smoke if launching AND showSmoke is not explicitly set to false
    const shouldRenderSmoke = isLaunching && (showSmoke ?? true);

    return (
        <div className={cn("relative", className)} style={{ animation: isLaunching ? 'rocket-shake 0.1s infinite' : 'rocket-float 3s ease-in-out infinite' }}>
            <style jsx global>{`
                @keyframes rocket-shake {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(-0.6px, 0.6px); }
                    50% { transform: translate(0.6px, -0.6px); }
                    75% { transform: translate(-0.6px, -0.6px); }
                    100% { transform: translate(0, 0); }
                }
                @keyframes rocket-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes exhaust-force {
                    0% { opacity: 0.8; transform: scaleY(1) translateY(0); }
                    25% { opacity: 1; transform: scaleY(1.6) translateY(5px); }
                    50% { opacity: 0.9; transform: scaleY(1.4) translateY(3px); }
                    75% { opacity: 1; transform: scaleY(2.0) translateY(8px); }
                    100% { opacity: 0.8; transform: scaleY(1) translateY(0); }
                }
                @keyframes exhaust-idle {
                    0% { opacity: 0.6; transform: scaleY(0.4) translateY(-10px); }
                    50% { opacity: 0.8; transform: scaleY(0.5) translateY(-8px); }
                    100% { opacity: 0.6; transform: scaleY(0.4) translateY(-10px); }
                }
                @keyframes smoke-flow {
                    0% { transform: translateY(0) scale(0.6); opacity: 0.8; }
                    100% { transform: translateY(120px) scale(3); opacity: 0; }
                }
                @keyframes exhaust-flicker {
                    0% { transform: scaleY(0.4) translateY(0); opacity: 0.3; }
                    50% { transform: scaleY(0.3) translateY(-2px); opacity: 0.1; }
                    100% { transform: scaleY(0.4) translateY(0); opacity: 0.3; }
                }
            `}</style>
            <svg width="100%" height="100%" viewBox="0 0 200 300" fill="none" className={cn(isLaunching && "drop-shadow-[0_0_25px_rgba(255,100,0,0.6)]")}>

                {/* Smoke Particles - Heavy Trail & Surrounding Flames */}
                {/* Smoke Particles - Strict Conditional Rendering (controlled by props) */}
                {shouldRenderSmoke && (
                    <g className="mix-blend-screen transition-all duration-500 blur-[2px]">
                        {/* Left Stream */}
                        <circle cx="80" cy="160" r="8" fill="#E5E5E5" style={{ animation: 'smoke-flow 0.4s infinite 0s' }} />
                        <circle cx="70" cy="175" r="12" fill="#D4D4D4" style={{ animation: 'smoke-flow 0.5s infinite 0.1s' }} />

                        {/* Right Stream */}
                        <circle cx="120" cy="160" r="8" fill="#E5E5E5" style={{ animation: 'smoke-flow 0.4s infinite 0.05s' }} />
                        <circle cx="130" cy="175" r="12" fill="#D4D4D4" style={{ animation: 'smoke-flow 0.5s infinite 0.15s' }} />

                        {/* Center Thick Trail */}
                        <circle cx="100" cy="180" r="14" fill="#F0F0F0" style={{ animation: 'smoke-flow 0.45s infinite 0.2s' }} />
                        <circle cx="90" cy="195" r="16" fill="#FFFFFF" style={{ animation: 'smoke-flow 0.6s infinite 0.3s' }} />
                        <circle cx="110" cy="195" r="16" fill="#C0C0C0" style={{ animation: 'smoke-flow 0.6s infinite 0.25s' }} />
                    </g>
                )}

                {/* Thrust Blast - ONLY WHEN LAUNCHING (Hidden in Idle to remove "Red Blob") */}
                <circle cx="100" cy="180" r="30" fill="#FF4500" className={cn("blur-lg transition-opacity duration-300", isLaunching ? "opacity-100" : "opacity-0")} style={{ animation: 'exhaust-pulse 0.15s infinite' }} />

                {/* Main Flames - Dynamic State */}
                <g className="transition-all duration-500">
                    {/* LAUNCHING: Big Force Flames */}
                    <path d="M100 160 Q170 250 100 320 Q30 250 100 160" fill="#FF4500" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.1s infinite alternate', transformOrigin: 'top center' }} />
                    <path d="M100 160 Q145 230 100 290 Q55 230 100 160" fill="#FF5722" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.12s infinite alternate-reverse', transformOrigin: 'top center' }} />
                    <path d="M100 160 Q130 210 100 260 Q70 210 100 160" fill="#FFD700" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.08s infinite alternate', transformOrigin: 'top center' }} />
                    <path d="M100 160 Q115 190 100 230 Q85 190 100 160" fill="#FFFF00" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.15s infinite alternate-reverse', transformOrigin: 'top center' }} />
                    <path d="M100 160 Q108 180 100 200 Q92 180 100 160" fill="#FFFFFF" className={cn(isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-force 0.05s infinite', transformOrigin: 'top center' }} />

                    {/* IDLE: Real Small Sharp Flames (No Blur) */}
                    {/* Center Core */}
                    <path d="M96 158 Q100 180 104 158" fill="#FF5722" className={cn(!isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-flicker 0.2s infinite', transformOrigin: 'top center' }} />
                    {/* Inner Core */}
                    <path d="M98 158 Q100 175 102 158" fill="#FFD700" className={cn(!isLaunching ? 'opacity-100' : 'opacity-0')} style={{ animation: 'exhaust-flicker 0.15s infinite reverse', transformOrigin: 'top center' }} />
                </g>

                {/* Rocket Body */}
                <g transform="translate(0, -10)">
                    <path d="M70 140 L60 160 L90 150 Z" fill="#D32F2F" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
                    <path d="M130 140 L140 160 L110 150 Z" fill="#D32F2F" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
                    <ellipse cx="100" cy="100" rx="35" ry="60" fill="white" stroke="#111" strokeWidth="4" />
                    <path d="M72 70 Q100 10 128 70" fill="#F44336" stroke="#111" strokeWidth="4" />
                    <path d="M72 70 Q100 80 128 70" fill="#F44336" />
                    <circle cx="100" cy="100" r="16" fill="#2196F3" stroke="#111" strokeWidth="4" />
                    <circle cx="100" cy="100" r="10" fill="#64B5F6" />
                    <circle cx="104" cy="96" r="3" fill="white" opacity="0.8" />
                    <path d="M85 145 Q100 155 115 145 L115 150 Q100 160 85 150 Z" fill="#2196F3" stroke="#111" strokeWidth="3" />
                </g>
            </svg>
        </div>
    );
}
