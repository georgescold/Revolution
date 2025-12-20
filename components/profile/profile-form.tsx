'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateProfile, deleteProfile } from '@/server/actions/profile-actions';
import { Loader2, AtSign, Sparkles, User, Target, Trash } from 'lucide-react';

interface ProfileFormProps {
    initialData: {
        tiktokName: string;
        tiktokBio: string;
        persona: string;
        contentGoal: string;
        avatarUrl?: string;
        followersCount?: number;
    }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [formData, setFormData] = useState({
        ...initialData,
        followersCount: initialData.followersCount || 0
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData.avatarUrl || null);
    const [isPending, startTransition] = useTransition();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const formDataToSend = new FormData();
            formDataToSend.append('tiktokName', formData.tiktokName);
            formDataToSend.append('tiktokBio', formData.tiktokBio);
            formDataToSend.append('persona', formData.persona);
            formDataToSend.append('contentGoal', formData.contentGoal);
            formDataToSend.append('followersCount', formData.followersCount.toString());
            if (avatarFile) {
                formDataToSend.append('avatar', avatarFile);
            }

            const result = await updateProfile(formDataToSend);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Profil mis à jour avec succès ! 🚀");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar Section */}
                <div className="space-y-4 flex-shrink-0 mx-auto md:mx-0">
                    <Label className="text-base font-bold flex items-center gap-2 justify-center md:justify-start">
                        <User className="w-4 h-4 text-primary" /> Avatar
                    </Label>
                    <div className="relative group w-32 h-32 mx-auto">
                        <div className={`w-32 h-32 rounded-full border-4 border-border overflow-hidden bg-muted flex items-center justify-center group-hover:border-primary transition-colors ${!previewUrl ? 'animate-pulse' : ''}`}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-muted-foreground" />
                            )}
                        </div>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-xs font-bold uppercase">Modifier</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="tiktokName" className="text-base font-bold flex items-center gap-2">
                                <AtSign className="w-4 h-4 text-primary" /> Nom TikTok
                            </Label>
                            <Input
                                id="tiktokName"
                                value={formData.tiktokName}
                                onChange={(e) => setFormData({ ...formData, tiktokName: e.target.value })}
                                className="border-2 border-border focus-visible:border-primary h-12"
                                placeholder="@tonpseudo"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="followersCount" className="text-base font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" /> Abonnés
                            </Label>
                            <Input
                                id="followersCount"
                                type="number"
                                value={formData.followersCount}
                                onChange={(e) => setFormData({ ...formData, followersCount: parseInt(e.target.value) || 0 })}
                                className="border-2 border-border focus-visible:border-primary h-12"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="persona" className="text-base font-bold flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" /> Persona
                        </Label>
                        <Textarea
                            id="persona"
                            value={formData.persona}
                            onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                            className="min-h-[100px] border-2 border-border focus-visible:border-primary resize-none"
                            placeholder="Qui incarnes-tu ?"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="tiktokBio" className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Bio
                </Label>
                <Textarea
                    id="tiktokBio"
                    value={formData.tiktokBio}
                    onChange={(e) => setFormData({ ...formData, tiktokBio: e.target.value })}
                    className="min-h-[80px] border-2 border-border focus-visible:border-primary resize-none"
                    placeholder="Ta bio qui déchire..."
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="contentGoal" className="text-base font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Objectif de contenu
                </Label>
                <Textarea
                    id="contentGoal"
                    value={formData.contentGoal}
                    onChange={(e) => setFormData({ ...formData, contentGoal: e.target.value })}
                    className="min-h-[80px] border-2 border-border focus-visible:border-primary resize-none"
                    placeholder="Ton objectif principal..."
                />
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-border mt-8">
                <Button
                    type="button"
                    onClick={async () => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.')) {
                            const result = await deleteProfile();
                            if (result.error) {
                                toast.error(result.error);
                            } else {
                                toast.success('Profil supprimé');
                                window.location.href = '/dashboard'; // Force refresh/redirect
                            }
                        }
                    }}
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash className="mr-2 h-4 w-4" />
                    Supprimer ce profil
                </Button>

                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-primary hover:bg-primary text-white font-black text-lg px-8 py-6 rounded-none glitch-hover uppercase tracking-wider"
                >
                    {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Sauvegarder
                </Button>
            </div>
        </form>
    );
}
