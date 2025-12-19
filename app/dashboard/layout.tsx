import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

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
                <span className="hidden sm:inline-block font-black text-xl md:text-2xl tracking-tighter uppercase relative">
                    <span className="relative z-10">Révolution</span>
                    <span className="absolute left-[1px] top-[1px] -z-10 text-secondary opacity-50 mix-blend-multiply">Révolution</span>
                    <span className="absolute -left-[1px] -top-[1px] -z-10 text-primary opacity-50 mix-blend-multiply">Révolution</span>
                </span>
            </Link>
            <div className="ml-auto flex items-center gap-2 md:gap-4">
                <form action={SignOutButton}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-foreground">
                        <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                        <span className="sr-only">Déconnexion</span>
                    </Button>
                </form>
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
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
