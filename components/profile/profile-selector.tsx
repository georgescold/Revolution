'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { switchProfile } from '@/server/actions/profile-actions';
import { User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Profile {
    id: string;
    tiktokName: string | null;
    avatarUrl: string | null;
}

export function ProfileSelector({ profiles }: { profiles: Profile[] }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleSelect = async (profileId: string) => {
        setIsLoading(profileId);
        try {
            const result = await switchProfile(profileId);
            if (result.success) {
                router.push('/dashboard');
                router.refresh();
            } else {
                toast.error("Impossible de sélectionner ce profil");
                setIsLoading(null);
            }
        } catch (e) {
            toast.error("Erreur de connexion");
            setIsLoading(null);
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-3xl">
            {profiles.map((profile, index) => (
                <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <button
                        onClick={() => handleSelect(profile.id)}
                        disabled={!!isLoading}
                        className="group relative w-full aspect-square flex flex-col items-center justify-center p-4 rounded-xl border-2 border-border bg-card hover:border-primary transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-muted group-hover:border-primary transition-colors mb-4">
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile.tiktokName || 'Avatar'} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <User className="w-10 h-10 text-muted-foreground" />
                                </div>
                            )}
                            {isLoading === profile.id && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="text-center w-full">
                            <h3 className="font-bold text-lg truncate w-full px-2">
                                {profile.tiktokName || 'Profil Sans Nom'}
                            </h3>
                            <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1">
                                {isLoading === profile.id ? 'Chargement...' : 'Sélectionner'}
                            </p>
                        </div>
                    </button>
                </motion.div>
            ))}
        </div>
    );
}
