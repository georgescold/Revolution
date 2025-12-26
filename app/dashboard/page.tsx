import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { ProfileSwitcher } from "@/components/profile/profile-switcher";
import { signOut } from "@/lib/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnalyticsView } from '@/components/analytics/analytics-view';
import { CollectionsView } from '@/components/collections/collections-view';
import { CreationView } from '@/components/creation/creation-view';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import { LogoutItem } from '@/components/dashboard/logout-item';
import { ApiKeySettings } from '@/components/dashboard/api-key-settings';

async function SignOutButton() {
    'use server';
    await signOut({ redirectTo: '/login' });
}

// Next.js 15+ Page Props are Promises
interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { profiles: true }
    });

    const activeProfileId = user?.activeProfileId || user?.profiles[0]?.id || null;
    const profiles = user?.profiles || [];

    const UserNav = (
        <>
            <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Paramètres</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile" className="cursor-pointer">
                            <span>Mon Profil</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSeparator />
                    <DropdownMenuSeparator />
                    <LogoutItem logoutAction={SignOutButton} />
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );

    return (
        <DashboardTabs
            analyticsContent={<AnalyticsView />}
            collectionsContent={<CollectionsView />}
            creationContent={<CreationView />}
            apiKeyContent={<ApiKeySettings />}
            userNav={UserNav}
        />
    );
}
