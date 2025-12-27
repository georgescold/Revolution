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
import { ForceSignOut } from "@/components/auth/force-signout";
import { RocketIcon } from '@/components/ui/rocket-icon';

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

    if (!user) {
        return <ForceSignOut />;
    }

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
                {/* Mini Rocket - Now using the unified animated icon */}
                {/* "Violent" Fire (isLaunching=true) but NO Smoke (showSmoke=false) as requested */}
                <RocketIcon
                    isLaunching={true}
                    showSmoke={false}
                    className="w-16 h-16 md:w-20 md:h-20 mt-4 group-hover:scale-105 transition-transform duration-300"
                />

                {/* Glitch Logo */}
                <div className="relative">
                    <span className="block text-2xl md:text-3xl font-black tracking-tighter text-white leading-none select-none relative z-10 mix-blend-screen">Organik</span>
                    <span className="absolute top-0 left-0 text-2xl md:text-3xl font-black tracking-tighter text-[#25F4EE] leading-none select-none -translate-x-[1px] -translate-y-[1px] z-0 opacity-80 animate-glitch-cyan">Organik</span>
                    <span className="absolute top-0 left-0 text-2xl md:text-3xl font-black tracking-tighter text-[#FE2C55] leading-none select-none translate-x-[1px] translate-y-[1px] z-0 opacity-80 animate-glitch-red">Organik</span>
                </div>
            </Link>

            {/* Icons moved to DashboardTabs in page.tsx */}
        </header >
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
