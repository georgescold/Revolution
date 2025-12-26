"use client";

import { cn } from "@/lib/utils";

export function RocketIcon({ className }: { className?: string }) {
    return (
        <div className={cn("relative", className)} style={{ animation: 'rocket-shake 0.1s infinite' }}>
            <style jsx global>{`
                @keyframes rocket-shake {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(-0.5px, 0.5px); }
                    50% { transform: translate(0.5px, -0.5px); }
                    75% { transform: translate(-0.5px, -0.5px); }
                    100% { transform: translate(0, 0); }
                }
                @keyframes exhaust-force {
                    0% { opacity: 0.7; transform: scaleY(1) translateY(0); }
                    25% { opacity: 1; transform: scaleY(1.4) translateY(5px); }
                    50% { opacity: 0.9; transform: scaleY(1.2) translateY(3px); }
                    75% { opacity: 1; transform: scaleY(1.6) translateY(8px); }
                    100% { opacity: 0.7; transform: scaleY(1) translateY(0); }
                }
                @keyframes smoke-flow {
                    0% { transform: translateY(0) scale(1); opacity: 0.5; }
                    100% { transform: translateY(40px) scale(2.5); opacity: 0; }
                }
                @keyframes exhaust-pulse {
                    0% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 0.4; }
                }
            `}</style>
            <svg width="100%" height="100%" viewBox="0 0 200 300" fill="none" className="drop-shadow-[0_0_25px_rgba(255,100,0,0.6)]">
                {/* Smoke Particles */}
                <g className="mix-blend-screen">
                    <circle cx="80" cy="200" r="10" fill="#888" style={{ animation: 'smoke-flow 0.8s infinite', animationDelay: '0s' }} />
                    <circle cx="120" cy="200" r="12" fill="#999" style={{ animation: 'smoke-flow 0.8s infinite', animationDelay: '0.2s' }} />
                    <circle cx="90" cy="210" r="15" fill="#AAA" style={{ animation: 'smoke-flow 0.9s infinite', animationDelay: '0.4s' }} />
                    <circle cx="110" cy="210" r="14" fill="#BBB" style={{ animation: 'smoke-flow 0.9s infinite', animationDelay: '0.1s' }} />
                    <circle cx="100" cy="220" r="20" fill="#CCC" style={{ animation: 'smoke-flow 1s infinite', animationDelay: '0.3s' }} />
                </g>

                {/* Thrust Blast */}
                <circle cx="100" cy="180" r="30" fill="#FF4500" className="blur-lg" style={{ animation: 'exhaust-pulse 0.15s infinite' }} />

                {/* Main Flames - SUPER CHARGED */}
                <path d="M100 160 Q150 250 100 320 Q50 250 100 160" fill="#FF4500" style={{ animation: 'exhaust-force 0.1s infinite alternate', transformOrigin: 'top center' }} />
                <path d="M100 160 Q135 230 100 290 Q65 230 100 160" fill="#FF5722" style={{ animation: 'exhaust-force 0.12s infinite alternate-reverse', transformOrigin: 'top center' }} />
                <path d="M100 160 Q120 210 100 260 Q80 210 100 160" fill="#FFD700" style={{ animation: 'exhaust-force 0.08s infinite alternate', transformOrigin: 'top center' }} />
                <path d="M100 160 Q110 190 100 230 Q90 190 100 160" fill="#FFFF00" style={{ animation: 'exhaust-force 0.15s infinite alternate-reverse', transformOrigin: 'top center' }} />
                <path d="M100 160 Q105 180 100 200 Q95 180 100 160" fill="#FFFFFF" style={{ animation: 'exhaust-force 0.05s infinite', transformOrigin: 'top center' }} />

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
