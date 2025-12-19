import Anthropic from '@anthropic-ai/sdk';
import { PROMPTS } from './prompts';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';

export async function analyzeImage(imageBase64: string, mediaType: string = "image/jpeg") {
    try {
        const msg = await anthropic.messages.create({
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
        throw new Error("Failed to analyze image with Claude");
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
