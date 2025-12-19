import { ImageUploader } from "./image-uploader";
import { ImageGrid } from "./image-grid";
import { getUserImages } from "@/server/actions/image-actions";

export async function CollectionsView() {
    const result = await getUserImages();
    const images = result.success ? result.images : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Ma Collection</h2>
                    <p className="text-muted-foreground">Ajoute tes sources. Claude les décrira pour toi.</p>
                </div>
            </div>

            <ImageUploader />

            <ImageGrid images={images as any} />
        </div>
    )
}
