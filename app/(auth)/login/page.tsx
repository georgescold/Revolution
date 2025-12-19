'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react'; // Client side sign in

export default function LoginPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(formData: FormData) {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        startTransition(async () => {
            try {
                const result = await signIn('credentials', {
                    email,
                    password,
                    redirect: false
                });

                if (result?.error) {
                    toast.error('Identifiants invalides');
                } else {
                    toast.success('Connexion réussie');
                    router.push('/dashboard');
                    router.refresh();
                }
            } catch (e) {
                toast.error('Erreur de connexion');
            }
        });
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md bg-card border-2 border-primary shadow-[4px_4px_0px_0px_var(--color-secondary)] transition-all">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-black tracking-tighter uppercase relative inline-block">
                        <span className="relative z-10">Organik</span>
                        <span className="absolute left-[2px] top-[2px] -z-10 text-secondary opacity-50 mix-blend-multiply">Organik</span>
                        <span className="absolute -left-[2px] -top-[2px] -z-10 text-primary opacity-50 mix-blend-multiply">Organik</span>
                    </CardTitle>
                    <CardDescription className="font-medium text-muted-foreground/80">
                        Connecte-toi pour exploser tes vues.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-background/50 border-input/50 focus-visible:ring-primary" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input id="password" name="password" type="password" required className="bg-background/50 border-input/50 focus-visible:ring-primary" />
                        </div>
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-[0_0_15px_rgba(19,185,198,0.3)] duration-300" disabled={isPending}>
                            {isPending ? 'Connexion...' : 'Se connecter'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-xs text-muted-foreground">
                        Pas encore de compte ? <Link href="/register" className="text-primary hover:underline">Créer un profil</Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
