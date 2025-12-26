import Anthropic from '@anthropic-ai/sdk';
import { PROMPTS } from './prompts';

// Removed unused default anthropic instance

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';

export async function analyzeImage(imageBase64: string, mediaType: string = "image/jpeg", apiKey: string) {
    if (!apiKey) {
        throw new Error("API Key is required for image analysis via Claude.");
    }

    try {
        const client = new Anthropic({
            apiKey: apiKey,
        });

        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system: PROMPTS.IMAGE_ANALYSIS_SYSTEM,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType as any,
                                data: imageBase64,
                            },
                        },
                        {
                            type: "text",
                            text: "Analyse cette image."
                        }
                    ],
                },
            ],
        });

        // Parse JSON from response
        const text = (msg.content[0] as any).text;
        // Simple basic cleanup if markdown is present
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Claude Analysis Error:", error);
        throw error; // Rethrow to allow upstream handling (e.g. invalid user key)
    }
}

export type ImageAnalysisResult = {
    description_long: string;
    keywords: string[];
    mood: string;
    colors: string[];
    style: string;
    composition: string;
    facial_expression: string | null;
    text_content: string | null;
};
