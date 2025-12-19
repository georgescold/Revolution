import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
import { signOut } from "@/lib/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

async function SignOutButton() {
    'use server';
    await signOut();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });

    // Mobile-optimized Header
    const Header = () => (
        <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b border-border/40 bg-background/95 backdrop-blur px-3 md:px-6">
            <Link href="/dashboard" className="flex items-center space-x-2 md:space-x-3">
                <span className="inline-block font-black text-xl md:text-2xl tracking-tighter uppercase relative">
                    <span className="relative z-10">Organik</span>
                    <span className="absolute left-[1px] top-[1px] -z-10 text-secondary opacity-50 mix-blend-multiply">Organik</span>
                    <span className="absolute -left-[1px] -top-[1px] -z-10 text-primary opacity-50 mix-blend-multiply">Organik</span>
                </span>
            </Link>
            <div className="ml-auto flex items-center gap-2 md:gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 rounded-full border border-border">
                            {session.user?.image ? (
                                <img src={session.user.image} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                            ) : (
                                <User className="h-4 w-4 md:h-5 md:w-5" />
                            )}
                            <span className="sr-only">Menu utilisateur</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/profile" className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Mon Profil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <form action={SignOutButton} className="w-full">
                                <button type="submit" className="flex w-full items-center text-red-500 hover:text-red-700">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Déconnexion</span>
                                </button>
                            </form>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );

    if (!profile) {
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
