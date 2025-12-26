import { ApifyClient } from 'apify-client';

const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

async function getTaskInput() {
    if (!process.env.APIFY_TASK_ID) {
        throw new Error("APIFY_TASK_ID is not set");
    }
    const task = await apifyClient.task(process.env.APIFY_TASK_ID).get();
    return task?.input || {};
}

async function updateTaskInput(newInput: Record<string, any>) {
    if (!process.env.APIFY_TASK_ID) return;
    await apifyClient.task(process.env.APIFY_TASK_ID).update({
        input: newInput
    });
}

export async function addProfileToApify(tiktokName: string) {
    try {
        const input: any = await getTaskInput();
        const profiles: string[] = Array.isArray(input.profiles) ? input.profiles : [];

        if (!profiles.includes(tiktokName)) {
            profiles.push(tiktokName);
            await updateTaskInput({ ...input, profiles });
            console.log(`Added ${tiktokName} to Apify task input.`);

            // Optionally trigger the run now that it's added
            // runTikTokScraper(); // decided to not await this to avoid blocking
        }
    } catch (error) {
        console.error("Failed to add profile to Apify:", error);
    }
}

export async function removeProfileFromApify(tiktokName: string) {
    try {
        const input: any = await getTaskInput();
        const profiles: string[] = Array.isArray(input.profiles) ? input.profiles : [];

        const newProfiles = profiles.filter(p => p !== tiktokName);

        if (newProfiles.length !== profiles.length) {
            await updateTaskInput({ ...input, profiles: newProfiles });
            console.log(`Removed ${tiktokName} from Apify task input.`);
        }
    } catch (error) {
        console.error("Failed to remove profile from Apify:", error);
    }
}

export async function runTikTokScraper(profiles?: string[], waitForFinish: boolean = true) {
    if (!process.env.APIFY_TASK_ID) {
        throw new Error("APIFY_TASK_ID is not set in environment variables");
    }

    console.log(`Starting Apify Task${profiles ? ` for profiles: ${profiles.join(', ')}` : ''} (Wait: ${waitForFinish})...`);

    // If profiles are provided, we override the input for this specific run
    const inputOverride = profiles ? { profiles } : undefined;

    // Options for the call
    const options = waitForFinish ? {} : { waitSecs: 0 };

    // Run the Actor Task
    const run = await apifyClient.task(process.env.APIFY_TASK_ID).call(inputOverride, options);

    console.log(`Apify Task ${waitForFinish ? 'finished' : 'started'}. Dataset ID: ${run.defaultDatasetId}`);
    return run.defaultDatasetId;
}

export async function fetchTikTokDataset(datasetId: string) {
    console.log(`Fetching dataset ${datasetId}...`);
    const { items } = await apifyClient.dataset(datasetId).listItems();
    return items;
}
