'use client';

import { useState, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadImage } from '@/server/actions/image-actions';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import imageCompression from 'browser-image-compression';

interface ImageUploaderProps {
    onUploadSuccess?: () => void;
    collectionId?: string;
}

export function ImageUploader({ onUploadSuccess, collectionId }: ImageUploaderProps) {
    const [isUploading, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState(0);
    const cancelRef = useRef(false);

    const handleCancel = () => {
        cancelRef.current = true;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        cancelRef.current = false;
        const allFiles = Array.from(files);
        const total = allFiles.length;
        let uploadedCount = 0;

        // Batch configuration
        const BATCH_SIZE = 5;

        // Helper to process a batch
        const processBatch = async (batchFiles: File[]) => {
            const formData = new FormData();

            // Compress/Convert all files in parallel
            const compressedFiles = await Promise.all(batchFiles.map(async (file) => {
                try {
                    const options = {
                        maxSizeMB: 4.8, // Close to 5MB limit but safe
                        maxWidthOrHeight: 4096, // High resolution support (4K)
                        useWebWorker: true,
                        fileType: "image/jpeg", // Force JPEG for compatibility
                        initialQuality: 0.95 // Very high quality
                    };
                    const compressedFile = await imageCompression(file, options);
                    // Create a new file with the original name (but .jpg extension if changed)
                    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                    return new File([compressedFile], newName, { type: "image/jpeg" });
                } catch (error) {
                    console.error("Compression failed for", file.name, error);
                    return file; // Fallback to original if compression fails
                }
            }));

            compressedFiles.forEach(f => formData.append('file', f));

            if (collectionId) {
                formData.append('collectionId', collectionId);
            }

            const result = await uploadImage(formData);
            if (result.success && result.count) {
                return result.count;
            }
            return 0; // Error or 0 uploaded
        };

        startTransition(async () => {
            for (let i = 0; i < total; i += BATCH_SIZE) {
                if (cancelRef.current) {
                    toast.info("Upload annulé");
                    break;
                }

                const batch = allFiles.slice(i, i + BATCH_SIZE);

                // Update progress based on start of batch
                const currentProgress = Math.round((uploadedCount / total) * 100);
                setProgress(Math.max(10, currentProgress)); // Min 10 to show activity

                // Upload batch
                const processed = await processBatch(batch);
                uploadedCount += processed;
            }

            setProgress(100);
            if (!cancelRef.current) {
                toast.success(`${uploadedCount}/${total} images ajoutées avec succès !`);
            }
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
                className={`border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors ${isUploading ? 'cursor-default' : ''}`}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center gap-4 w-full" onClick={(e) => e.stopPropagation()}>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div className="space-y-1 text-center">
                            <p className="text-sm font-medium">Analyse en cours...</p>
                            <p className="text-xs text-muted-foreground">{fileInputRef.current?.files?.length || "plusieurs"} images</p>
                        </div>
                        <Progress value={progress} className="w-[200px] h-2 bg-secondary/20" />
                        <Button variant="destructive" size="sm" onClick={handleCancel} className="mt-2">
                            Annuler
                        </Button>
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
