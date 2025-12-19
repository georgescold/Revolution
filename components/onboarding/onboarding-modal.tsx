'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createProfile } from '@/server/actions/profile-actions';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function OnboardingModal() {
    const [open, setOpen] = useState(false); // Initially false, user clicks button to open
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        tiktokName: '',
        tiktokBio: '',
        persona: '',
        contentGoal: '',
    });
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Prompt says: display overlay with button "Créer ton profil" first.
    // Then modal/stepper.

    // So this component will handle the Overlay + Modal
    const [showOverlay, setShowOverlay] = useState(true);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        startTransition(async () => {
            const result = await createProfile(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Profil créé avec succès !");
                setShowOverlay(false);
                setOpen(false);
                router.refresh(); // This should trigger layout to re-check profile and unmount this component
            }
        });
    };

    if (!showOverlay) return null;

    return (
        <>
            {/* Overlay Background */}
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">

                <motion.button
                    whileHover={{ scale: 1.1, boxShadow: "0 0 25px rgba(19,185,198,0.5)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpen(true)}
                    className="group relative flex h-32 w-32 items-center justify-center rounded-full bg-black border border-primary/30 shadow-[0_0_15px_rgba(19,185,198,0.2)] transition-all duration-500"
                >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-4xl text-primary font-light">°</span>
                </motion.button>
                <p className="mt-8 text-xl font-light text-muted-foreground animate-pulse">
                    Créer ton profil
                </p>

            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px] bg-card border-primary/20">
                    <DialogHeader>
                        <DialogTitle className="text-gradient">Configuration du compte</DialogTitle>
                        <DialogDescription>
                            Dis-nous en plus sur ton compte TikTok pour calibrer l'IA.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nom de ton compte TikTok ?</Label>
                                        <Input
                                            value={formData.tiktokName}
                                            onChange={(e) => setFormData({ ...formData, tiktokName: e.target.value })}
                                            placeholder="@moncompte"
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Biographie actuelle ?</Label>
                                        <Textarea
                                            value={formData.tiktokBio}
                                            onChange={(e) => setFormData({ ...formData, tiktokBio: e.target.value })}
                                            placeholder="Copie ta bio ici..."
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Qui incarnes-tu ? (Persona)</Label>
                                        <Input
                                            value={formData.persona}
                                            onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                                            placeholder="Coach sportif expert, Humouriste cynique..."
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                            {step === 4 && (
                                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Quel est ton objectif ?</Label>
                                        <Input
                                            value={formData.contentGoal}
                                            onChange={(e) => setFormData({ ...formData, contentGoal: e.target.value })}
                                            placeholder="Vendre ma formation, Devenir viral..."
                                            className="bg-background/50 border-input/50 focus-visible:ring-primary"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex justify-between mt-4">
                        {step > 1 ? (
                            <Button variant="outline" onClick={handleBack}>Retour</Button>
                        ) : (
                            <div></div> // Spacer
                        )}

                        {step < 4 ? (
                            <Button onClick={handleNext} disabled={!formData.tiktokName && step === 1}>Suivant</Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isPending} className="bg-primary text-primary-foreground">
                                {isPending ? 'Enregistrement...' : 'Valider'}
                            </Button>
                        )}
                    </div>

                    <div className="flex justify-center mt-2 gap-1">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 w-8 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-secondary/20'}`} />
                        ))}
                    </div>

                </DialogContent>
            </Dialog>
        </>
    );
}
