// src/services/firebaseService.ts

// index.tsx'ten dışa aktardığımız functions servisini buraya import ediyoruz
// Bu, "functions" nesnesine erişimi sağlar
import { functions } from '../index.tsx'; 

import { httpsCallable } from "firebase/functions";
import { ImageFile } from '../types'; // Kendi tip dosyanızdan ImageFile'ı import edin


// 1. Firebase Function çağrısını hazırlayın (Bir kez tanımlanır)
const callSwapClothesFunction = httpsCallable<{ personImage: ImageFile, clothingImage: ImageFile }, { imageUrl: string | null, text: string | null }>(
    functions, 
    'swapClothes'
);

/**
 * Yeni Sanal Giydirme Fonksiyonu: 
 * Ön yüzün çağıracağı temiz fonksiyondur.
 */
export const swapClothes = async (personImage: ImageFile, clothingImage: ImageFile): Promise<{ imageUrl: string | null, text: string | null }> => {
    
    try {
        // Firebase Function'ı çağır ve verileri gönder
        const response = await callSwapClothesFunction({ 
            personImage, 
            clothingImage 
        });

        // Backend'den dönen veriyi döndür
        const { imageUrl, text } = response.data;
        return { imageUrl, text };

    } catch (error) {
        console.error("Error calling Firebase Function (swapClothes):", error);
        
        // Hata durumunda kullanıcı dostu bir nesne döndür
        let errorMessage = "Giydirme işlemi başarısız oldu. Lütfen tekrar deneyin.";
        
        return { imageUrl: null, text: errorMessage };
    }
};