import { ImageUploader } from "./image-uploader";
import { ImageGrid } from "./image-grid";
import { getUserImages } from "@/server/actions/image-actions";
import { getUserCollections } from "@/server/actions/collection-actions";
import { Button } from "@/components/ui/button";
import { Download, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { CollectionsSidebar } from "./collections-sidebar";

interface CollectionsViewProps {
    collectionId?: string;
}

export async function CollectionsView({ collectionId }: CollectionsViewProps) {
    // Parallel fetching
    const [imagesResult, collectionsResult] = await Promise.all([
        getUserImages(collectionId),
        getUserCollections()
    ]);

    const images = imagesResult.success ? imagesResult.images : [];
    const collections = collectionsResult.success ? collectionsResult.collections : [];

    const activeCollection = collections?.find(c => c.id === collectionId);
    const title = activeCollection ? activeCollection.name : "Toutes les images";

    return (
        <div className="flex h-[calc(100vh-12rem)]"> {/* Fixed height for sidebar scrolling */}

            <CollectionsSidebar collections={collections as any} />

            <div className="flex-1 pl-6 overflow-y-auto space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center">
                            {collectionId && <LayoutGrid className="mr-2 h-6 w-6 text-muted-foreground" />}
                            {title}
                        </h2>
                        <p className="text-muted-foreground">
                            {collectionId
                                ? "Images dans cette collection"
                                : "Toutes les images partagées par la communauté."}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/api/backup/collections" target="_blank">
                                <Download className="mr-2 h-4 w-4" />
                                Tout télécharger
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Only show Uploader if we are NOT in a specific collection, OR if we pass the ID to it */}
                {/* Actually user requested: "Une nouvelle image ajoutée à sa propre collection..." so we pass appropriate ID */}
                <ImageUploader collectionId={collectionId} />

                <ImageGrid images={images as any} />
            </div>
        </div>
    )
}
