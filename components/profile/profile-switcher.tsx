'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Check, Loader2, User } from 'lucide-react';
import { createProfile, switchProfile } from '@/server/actions/profile-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
    id: string;
    tiktokName: string | null;
    avatarUrl: string | null;
}

interface ProfileSwitcherProps {
    profiles: Profile[];
    activeProfileId: string | null;
}

export function ProfileSwitcher({ profiles, activeProfileId }: ProfileSwitcherProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    const handleSwitch = async (profileId: string) => {
        if (profileId === activeProfileId) return;
        setIsSwitching(true);
        const result = await switchProfile(profileId);
        setIsSwitching(false);

        if (result.success) {
            toast.success('Profil changé');
            router.refresh();
        } else {
            toast.error('Erreur lors du changement de profil');
        }
    };

    const handleCreate = async () => {
        if (!newProfileName.trim()) return;
        setIsCreating(true);

        try {
            const result = await createProfile({ tiktokName: newProfileName });
            if (result.success) {
                toast.success('Nouveau profil créé');
                setOpen(false);
                setNewProfileName('');
                router.refresh();
            } else {
                toast.error('Erreur lors de la création');
            }
        } catch (e) {
            toast.error('Erreur inattendue');
        } finally {
            setIsCreating(false);
        }
    };

    const activeProfile = profiles.find(p => p.id === activeProfileId);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-10 w-10 min-w-[2.5rem] rounded-full border border-border overflow-hidden p-0">
                        {activeProfile?.avatarUrl ? (
                            <img
                                src={activeProfile.avatarUrl}
                                alt={activeProfile.tiktokName || 'Avatar'}
                                className="h-full w-full object-cover aspect-square"
                            />
                        ) : (
                            <div className="h-full w-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5 md:h-5 md:w-5 text-muted-foreground" />
                            </div>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{activeProfile?.tiktokName || 'Mon Profil'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {profiles.length} profil{profiles.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {profiles.map((profile) => (
                        <DropdownMenuItem
                            key={profile.id}
                            onClick={() => handleSwitch(profile.id)}
                            disabled={isSwitching}
                            className="cursor-pointer flex items-center justify-between"
                        >
                            <span className={cn(profile.id === activeProfileId && "font-bold")}>
                                {profile.tiktokName || 'Sans nom'}
                            </span>
                            {profile.id === activeProfileId && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpen(true)} className="cursor-pointer">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Créer un profil</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer un nouveau profil</DialogTitle>
                        <DialogDescription>
                            Gérez un nouveau compte TikTok séparé.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom du compte TikTok</Label>
                            <Input
                                id="name"
                                placeholder="@moncompte"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreate} disabled={isCreating || !newProfileName.trim()}>
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
