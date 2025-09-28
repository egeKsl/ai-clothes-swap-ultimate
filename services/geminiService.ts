
import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility to remove base64 prefix
const stripBase64Prefix = (base64: string): string => {
    return base64.split(',')[1] || base64;
};

export const swapClothes = async (personImage: ImageFile, clothingImage: ImageFile): Promise<{ imageUrl: string | null, text: string | null }> => {
    const model = 'gemini-2.5-flash-image-preview';

    const prompt = 'Using the first image as the base, replace the clothing on the person with the clothing item from the second image. Maintain the person\'s pose, body shape, and the background. The result should be a realistic photo.';

    const personImagePart = {
        inlineData: {
            data: stripBase64Prefix(personImage.base64),
            mimeType: personImage.mimeType,
        }
    };

    const clothingImagePart = {
        inlineData: {
            data: stripBase64Prefix(clothingImage.base64),
            mimeType: clothingImage.mimeType,
        }
    };
    
    const textPart = { text: prompt };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [personImagePart, clothingImagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        let imageUrl: string | null = null;
        let text: string | null = null;

        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes = part.inlineData.data;
                    imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                } else if (part.text) {
                    text = part.text;
                }
            }
        }

        return { imageUrl, text };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("The request to the AI model failed. Please check your inputs or try again later.");
    }
};
