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

    if (!profile) redirect("/dashboard"); // Should trigger onboarding if configured properly in layout

    return (
        <div className="container max-w-2xl py-8">
            <h1 className="text-3xl font-bold mb-8">Mon Profil</h1>
            <div className="bg-card border rounded-lg p-6 shadow-sm">
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
