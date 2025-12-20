import { auth } from "@/lib/auth";
import { FloatingStats } from "@/components/ui/floating-stats";
import { prisma } from "@/lib/prisma";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
import { ProfileSwitcher } from "@/components/profile/profile-switcher";
import { ProfileThemeAdapter } from "@/components/profile/profile-theme-adapter";
import { signOut } from "@/lib/auth";
import { Montserrat } from "next/font/google";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700", "900"] });

async function SignOutButton() {
    'use server';
    await signOut();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { profiles: true }
    });

    const activeProfileId = user?.activeProfileId || user?.profiles[0]?.id || null;
    const profiles = user?.profiles || [];

    // Mobile-optimized Header with Space Theme
    const Header = () => (
        <header className={`sticky top-0 z-30 flex h-16 md:h-20 items-center justify-between border-b border-white/10 bg-black px-4 md:px-8 overflow-hidden ${montserrat.className}`}>

            {/* Space Background Layer (Masked to Header) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
                {/* Stars - White */}
                <div className="absolute inset-0 animate-[fly_20s_linear_infinite]"
                    style={{
                        backgroundImage: 'radial-gradient(1px 1px at 5px 5px, white 100%, transparent 100%), radial-gradient(1px 1px at 50px 50px, rgba(255,255,255,0.5) 100%, transparent 100%)',
                        backgroundSize: '150px 150px' // Smaller pattern for header
                    }}
                />
                {/* Stars - Yellow Twinkling */}
                <div className="absolute inset-0 animate-[fly_30s_linear_infinite]"
                    style={{
                        backgroundImage: 'radial-gradient(1.5px 1.5px at 25px 25px, #FFD700 100%, transparent 100%)',
                        backgroundSize: '200px 200px',
                        opacity: 0.8
                    }}
                />
                {/* Floating Stats Layer */}
                <FloatingStats />

                {/* Shooting Stars (Depth Effect) - Smaller & Spaced */}
                <div className="absolute top-0 right-[-10%] w-[100px] h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[comet-depth_10s_linear_infinite]" />
                <div className="absolute top-[-20%] right-[20%] w-[80px] h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-[comet-depth_15s_linear_infinite] delay-[5000ms]" />
                <div className="absolute top-[10%] left-[30%] w-[60px] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent animate-[comet-depth_12s_linear_infinite] delay-[2500ms]" />
            </div>

            <Link href="/dashboard" className="relative z-10 flex items-center space-x-3 md:space-x-4 group">
                {/* Mini Rocket */}
                <div className="relative w-8 h-8 md:w-10 md:h-10 animate-[rocket-hover_3s_ease-in-out_infinite] group-hover:scale-110 transition-transform duration-300">
                    <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" className="drop-shadow-lg">
                        <path d="M100 160 Q110 180 100 200 Q90 180 100 160" fill="#FFD700" className="animate-[exhaust-flame_0.1s_infinite] group-hover:animate-[exhaust-flame_0.04s_infinite]" />
                        <path d="M100 160 Q105 175 100 190 Q95 175 100 160" fill="#FFA500" className="animate-[exhaust-flame_0.1s_infinite] delay-75 group-hover:animate-[exhaust-flame_0.04s_infinite]" />
                        <path d="M70 140 L60 160 L90 150 Z" fill="#D32F2F" stroke="#222" strokeWidth="6" strokeLinejoin="round" />
                        <path d="M130 140 L140 160 L110 150 Z" fill="#D32F2F" stroke="#222" strokeWidth="6" strokeLinejoin="round" />
                        <ellipse cx="100" cy="100" rx="35" ry="60" fill="white" stroke="#222" strokeWidth="6" />
                        <path d="M72 70 Q100 10 128 70" fill="#F44336" stroke="#222" strokeWidth="6" />
                        <path d="M72 70 Q100 80 128 70" fill="#F44336" />
                        <circle cx="100" cy="100" r="16" fill="#2196F3" stroke="#222" strokeWidth="6" />
                        <circle cx="100" cy="100" r="10" fill="#64B5F6" />
                        <circle cx="104" cy="96" r="3" fill="white" opacity="0.8" />
                        <path d="M85 145 Q100 155 115 145 L115 150 Q100 160 85 150 Z" fill="#2196F3" stroke="#222" strokeWidth="4" />
                    </svg>
                </div>

                {/* Glitch Logo */}
                <div className="relative">
                    <span className="block text-2xl md:text-3xl font-black tracking-tighter text-white leading-none select-none relative z-10 mix-blend-screen">Organik</span>
                    <span className="absolute top-0 left-0 text-2xl md:text-3xl font-black tracking-tighter text-[#25F4EE] leading-none select-none -translate-x-[1px] -translate-y-[1px] z-0 opacity-80 animate-glitch-cyan">Organik</span>
                    <span className="absolute top-0 left-0 text-2xl md:text-3xl font-black tracking-tighter text-[#FE2C55] leading-none select-none translate-x-[1px] translate-y-[1px] z-0 opacity-80 animate-glitch-red">Organik</span>
                </div>
            </Link>

            {/* Icons moved to DashboardTabs in page.tsx */}
        </header>
    );

    if (profiles.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                    {children}
                </main>
                <OnboardingModal />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
            {/* Background Ambience - Clean White/Black with Red accents */}
            <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply z-0" />

            <div className="relative z-10 w-full flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 overflow-hidden flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    );
}
