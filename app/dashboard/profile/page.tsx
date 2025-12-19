import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id }
    });

    if (!profile) redirect("/dashboard");

    return (
        <div className="container max-w-4xl mx-auto py-12 px-4">
            <div className="flex flex-col items-center mb-12 space-y-2">
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter hover:scale-105 transition-transform cursor-default select-none relative group">
                    <span className="relative z-10">Mon Profil</span>
                    <span className="absolute left-[2px] top-[2px] -z-10 text-secondary opacity-0 group-hover:opacity-100 transition-opacity">Mon Profil</span>
                    <span className="absolute -left-[2px] -top-[2px] -z-10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">Mon Profil</span>
                </h1>
                <p className="text-muted-foreground font-medium text-lg">Gère ton identité et tes objectifs</p>
            </div>

            <div className="bg-card border-2 border-border p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow duration-300">
                <ProfileForm
                    initialData={{
                        tiktokName: profile.tiktokName || "",
                        tiktokBio: profile.bio || "",
                        persona: profile.persona || "",
                        contentGoal: profile.contentGoal || "",
                    }}
                />
            </div>
        </div>
    );
}
