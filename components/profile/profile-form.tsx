'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateProfile } from '@/server/actions/profile-actions';
import { Loader2, AtSign, Sparkles, User, Target } from 'lucide-react';

interface ProfileFormProps {
    initialData: {
        tiktokName: string;
        tiktokBio: string;
        persona: string;
        contentGoal: string;
    }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [formData, setFormData] = useState(initialData);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const result = await updateProfile(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Profil mis à jour avec succès ! 🚀");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="tiktokName" className="text-base font-bold flex items-center gap-2">
                        <AtSign className="w-4 h-4 text-primary" /> Nom TikTok
                    </Label>
                    <div className="relative group">
                        <Input
                            id="tiktokName"
                            value={formData.tiktokName}
                            onChange={(e) => setFormData({ ...formData, tiktokName: e.target.value })}
                            className="pl-10 border-2 border-border focus-visible:border-primary focus-visible:ring-0 transition-all duration-300 font-medium h-12"
                            placeholder="@tonpseudo"
                        />
                        <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="persona" className="text-base font-bold flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> Persona
                    </Label>
                    <div className="relative group">
                        <Textarea
                            id="persona"
                            value={formData.persona}
                            onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                            className="min-h-[120px] border-2 border-border focus-visible:border-primary focus-visible:ring-0 transition-all duration-300 resize-none pl-4 pt-3 font-medium"
                            placeholder="Qui incarnes-tu ?"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="tiktokBio" className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Bio
                </Label>
                <div className="relative group">
                    <Textarea
                        id="tiktokBio"
                        value={formData.tiktokBio}
                        onChange={(e) => setFormData({ ...formData, tiktokBio: e.target.value })}
                        className="min-h-[100px] border-2 border-border focus-visible:border-primary focus-visible:ring-0 transition-all duration-300 resize-none pl-4 pt-3 font-medium"
                        placeholder="Ta bio qui déchire..."
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="contentGoal" className="text-base font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Objectif de contenu
                </Label>
                <div className="relative group">
                    <Textarea
                        id="contentGoal"
                        value={formData.contentGoal}
                        onChange={(e) => setFormData({ ...formData, contentGoal: e.target.value })}
                        className="min-h-[100px] border-2 border-border focus-visible:border-primary focus-visible:ring-0 transition-all duration-300 resize-none pl-4 pt-3 font-medium"
                        placeholder="Ton objectif principal..."
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
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
