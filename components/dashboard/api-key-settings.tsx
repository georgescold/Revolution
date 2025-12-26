'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, AlertCircle, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { updateUserApiKey, getUserApiKey } from '@/server/actions/user-actions';

export function ApiKeySettings() {
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        const loadKey = async () => {
            const result = await getUserApiKey();
            if (result.success) {
                if (result.apiKey) {
                    setHasKey(true);
                    // Don't show the full key, just placeholder if desired, or empty to force re-entry
                    setApiKey(result.apiKey);
                }
            }
            setIsLoading(false);
        };
        loadKey();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // Basic validation
        if (apiKey.trim().length === 0) {
            toast.error("La clé ne peut pas être vide");
            setIsSaving(false);
            return;
        }

        if (!apiKey.startsWith("sk-ant-")) {
            toast.warning("Le format de la clé semble incorrect (devrait commencer par sk-ant-...)");
        }

        const result = await updateUserApiKey(apiKey);

        if (result.success) {
            toast.success("Clé API mise à jour avec succès");
            setHasKey(true);
        } else {
            toast.error("Erreur lors de la sauvegarde de la clé");
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        Configuration de l'IA (Claude)
                    </CardTitle>
                    <CardDescription>
                        Utilisez votre propre clé API Anthropic pour générer du contenu sans limites.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">Clé API Anthropic (Claude)</Label>
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    type="password"
                                    placeholder="sk-ant-api03-..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="pl-10"
                                />
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Votre clé est stockée de manière sécurisée et utilisée uniquement pour vos générations.
                                Le modèle utilisé sera strictement <strong>claude-opus-4-5-20251101</strong>.
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                {hasKey ? (
                                    <div className="flex items-center text-green-500 text-sm bg-green-500/10 px-3 py-1 rounded-full">
                                        <CheckCircle className="h-4 w-4 mr-1.5" />
                                        Clé active
                                    </div>
                                ) : (
                                    <div className="flex items-center text-amber-500 text-sm bg-amber-500/10 px-3 py-1 rounded-full">
                                        <AlertCircle className="h-4 w-4 mr-1.5" />
                                        Aucune clé configurée (Système par défaut)
                                    </div>
                                )}
                            </div>

                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                Enregistrer
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
