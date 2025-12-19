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

        const allFiles = Array.from(files);
        const total = allFiles.length;
        let uploadedCount = 0;

        // Batch configuration
        const BATCH_SIZE = 5;

        // Helper to process a batch
        const processBatch = async (batchFiles: File[]) => {
            const formData = new FormData();
            batchFiles.forEach(f => formData.append('file', f));

            const result = await uploadImage(formData);
            if (result.success && result.count) {
                return result.count;
            }
            return 0; // Error or 0 uploaded
        };

        startTransition(async () => {
            for (let i = 0; i < total; i += BATCH_SIZE) {
                const batch = allFiles.slice(i, i + BATCH_SIZE);

                // Update progress based on start of batch
                const currentProgress = Math.round((uploadedCount / total) * 100);
                setProgress(Math.max(10, currentProgress)); // Min 10 to show activity

                // Upload batch
                const processed = await processBatch(batch);
                uploadedCount += processed;
            }

            setProgress(100);
            toast.success(`${uploadedCount}/${total} images ajoutées avec succès !`);
            setTimeout(() => {
                setProgress(0);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }, 1000);
        });
    };

    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                multiple
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
                        <p className="text-sm text-muted-foreground">Analyse de {fileInputRef.current?.files?.length || "plusieurs"} images par Claude...</p>
                        <Progress value={progress} className="w-[200px]" />
                    </div>
                ) : (
                    <>
                        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Glisser-déposer ou cliquer pour uploader plusieurs images</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG jusqu'à 5MB</p>
                    </>
                )}
            </div>
        </div>
    );
}
