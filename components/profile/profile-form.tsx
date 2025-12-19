'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateProfile } from '@/server/actions/profile-actions';
import { Loader2 } from 'lucide-react';

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
                toast.success("Profil mis à jour !");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="tiktokName">Nom TikTok</Label>
                <Input
                    id="tiktokName"
                    value={formData.tiktokName}
                    onChange={(e) => setFormData({ ...formData, tiktokName: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tiktokBio">Bio</Label>
                <Textarea
                    id="tiktokBio"
                    value={formData.tiktokBio}
                    onChange={(e) => setFormData({ ...formData, tiktokBio: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="persona">Persona (Qui incarnes-tu ?)</Label>
                <Input
                    id="persona"
                    value={formData.persona}
                    onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="contentGoal">Objectif de contenu</Label>
                <Input
                    id="contentGoal"
                    value={formData.contentGoal}
                    onChange={(e) => setFormData({ ...formData, contentGoal: e.target.value })}
                />
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                </Button>
            </div>
        </form>
    );
}
