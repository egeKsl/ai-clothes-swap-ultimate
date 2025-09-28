import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions";
import { GoogleGenAI, Modality } from "@google/genai";

// 1. HATA ÇÖZÜMÜ: Secret'lar ve diğer ayarlar setGlobalOptions içine taşındı
setGlobalOptions({ 
    maxInstances: 10,
    secrets: ["GEMINI_API_KEY"], // Secret tanımı artık burada
});

// Ön yüzden gelecek veri yapısının tanımı
interface ImageFile {
  base64: string;
  mimeType: string;
}

// Utility: Base64 önekini kaldırma
const stripBase64Prefix = (base64: string): string => {
  // "data:image/jpeg;base64,..." kısmını atar
  return base64.split(",")[1] || base64;
};


/**
 * Firebase Callable Function: Kıyafet Değiştirme işlemini arka planda yapar.
 * Bu fonksiyon, GEMINI_API_KEY secret'ını process.env üzerinden kullanır.
 */
// SON HATA ÇÖZÜMÜ: Parametre tipi CallableRequest olarak güncellendi
export const swapClothes = functions.https.onCall(
    async (request: functions.https.CallableRequest<{
      personImage: ImageFile, 
      clothingImage: ImageFile
    }>) => {

  // CallableRequest objesinin içindeki "data" property'sinden değişkenleri alıyoruz
  const { personImage, clothingImage } = request.data; 

  // Güvenli bir şekilde process.env'den API anahtarını alıyoruz
  const apiKey = process.env.GEMINI_API_KEY;

  // API anahtarının gizlice ayarlanıp ayarlanmadığını kontrol et
  if (!apiKey) {
    logger.error("AI instance is not initialized: GEMINI_API_KEY is missing " +
      "from runtime secrets.");
    throw new functions.https.HttpsError("unavailable", "AI servis " +
      "yapılandırması eksik. Lütfen yöneticinizle iletişime geçin.");
  }

  // AI nesnesini burada oluşturuyoruz
  const ai = new GoogleGenAI({ apiKey: apiKey });

  if (!personImage || !clothingImage) {
    throw new functions.https.HttpsError("invalid-argument", "Hem model hem " +
      "de kıyafet resmi sağlanmalıdır.");
  }

  const model = "gemini-2.5-flash-image-preview";
  const prompt = "Using the first image as the base, replace the clothing on the " +
    "person with the clothing item from the second image. Maintain the person's pose, " +
    "body shape, and the background. The result should be a realistic photo.";

  const personImagePart = {
    inlineData: {
      data: stripBase64Prefix(personImage.base64),
      mimeType: personImage.mimeType,
    },
  };

  const clothingImagePart = {
    inlineData: {
      data: stripBase64Prefix(clothingImage.base64),
      mimeType: clothingImage.mimeType,
    },
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

    // Güvenli erişim ve parts kontrolü
    if (response.candidates?.length) {
        const parts = response.candidates[0].content?.parts;

        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    const base64ImageBytes = part.inlineData.data;
                    imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                } else if (part.text) {
                    text = part.text;
                }
            }
        }
    }

    // Ön yüze döndürülecek JSON yanıtı
    return { imageUrl, text };
  } catch (error) {
    logger.error("Error calling Gemini API:", error);
    throw new functions.https.HttpsError("internal", "AI modeline yapılan " +
      "istek başarısız oldu. Lütfen tekrar deneyin.");
  }
});