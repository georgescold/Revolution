'use client';

import { useState, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadImage } from '@/server/actions/image-actions';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export function ImageUploader() {
    const [isUploading, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Multi-upload not fully implemented in UI but action handles single.
        // Iterating for multi-support simplicity
        const file = files[0];

        // Hacky progress simulation since server actions don't stream progress easily
        setProgress(10);
        const interval = setInterval(() => {
            setProgress(p => Math.min(p + 5, 90));
        }, 200);

        const formData = new FormData();
        formData.append('file', file);

        startTransition(async () => {
            const result = await uploadImage(formData);
            clearInterval(interval);

            if (result.error) {
                toast.error(result.error);
                setProgress(0);
            } else {
                setProgress(100);
                toast.success("Image analysée et ajoutée !");
                setTimeout(() => setProgress(0), 1000);
            }

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };

    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Analyse en cours par Claude...</p>
                        <Progress value={progress} className="w-[200px]" />
                    </div>
                ) : (
                    <>
                        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Glisser-déposer ou cliquer pour uploader</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG jusqu'à 5MB</p>
                    </>
                )}
            </div>
        </div>
    );
}
