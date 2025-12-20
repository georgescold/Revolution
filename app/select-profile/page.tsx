import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileSelector } from "@/components/profile/profile-selector";

export default async function SelectProfilePage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { profiles: true }
    });

    const profiles = user?.profiles || [];

    // Case 0: No profile -> Go to dashboard for onboarding
    if (profiles.length === 0) {
        redirect('/dashboard');
    }

    // Case 1: One profile -> Auto-select and go
    // Note: We might want to still show it briefly or just auto-redirect.
    // User requested "If I have MULTIPLE profiles...". So 1 profile = auto.
    if (profiles.length === 1) {
        // We should ensure it's set as active though.
        if (user?.activeProfileId !== profiles[0].id) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { activeProfileId: profiles[0].id }
            });
        }
        redirect('/dashboard');
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                        Qui es-tu aujourd'hui ?
                    </h1>
                    <p className="text-muted-foreground text-xl">Choisis le profil avec lequel tu veux interagir.</p>
                </div>

                <ProfileSelector profiles={profiles} />
            </div>

            {/* Background Ambience */}
            <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply z-0" />
        </div>
    );
}
