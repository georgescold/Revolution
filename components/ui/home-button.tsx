"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeButton() {
    return (
        <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Link href="/dashboard">
                <Button
                    size="icon"
                    className="rounded-full w-12 h-12 bg-background/80 hover:bg-background border border-border backdrop-blur-md shadow-lg group transition-all hover:scale-110"
                    title="Retour au menu principal"
                >
                    <Home className="w-5 h-5 text-foreground/80 group-hover:text-primary transition-colors" />
                    <span className="sr-only">Accueil</span>
                </Button>
            </Link>
        </div>
    );
}
