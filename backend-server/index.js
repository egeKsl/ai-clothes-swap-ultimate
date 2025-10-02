import express from "express"; 
import cors from "cors"; 
import dotenv from "dotenv"; 
import { GoogleGenAI, Modality } from "@google/genai"; 

dotenv.config(); 

const app = express(); 

const allowedOrigins = [ 
  'https://ai-clothes-swap.web.app', 
  'https://ai-clothes-swap.firebaseapp.com', 
  "https://backend-ai-server--ai-clothes-swap.us-central1.hosted.app/", 
]; 

app.use((req, res, next) => { 
  const origin = req.get("Origin"); 
  if (origin && allowedOrigins.includes(origin)) { 
    res.header("Access-Control-Allow-Origin", origin); 
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS"); 
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization"); 
    res.header("Access-Control-Allow-Credentials", "false"); 
  } 
  if (req.method === "OPTIONS") { 
    return res.sendStatus(204); 
  } 
  next(); 
}); 

app.use(express.json({ limit: "50mb" })); 

// Utility: Base64 önekini kaldırma 
const stripBase64Prefix = (base64) => { 
  return base64.split(",")[1] || base64; 
}; 

const isPlausibleBase64 = (b64) => typeof b64 === "string" && b64.length > 100; 

app.post("/swap-clothes", async (req, res) => { 
  const { personImage, clothingImage } = req.body; 

  console.log("swap-clothes called; personImage.mimeType:", personImage?.mimeType, "clothingImage.mimeType:", clothingImage?.mimeType); 

  const apiKey = process.env.GEMINI_API_KEY2; 
  //const apiKey ="AIzaSyAxzFhRgbdXt3RjmsHk2NXZ06hApmXS--s";
  if (!apiKey) { 
    return res.status(500).json({ 
      success: false, 
      error: "GEMINI_API_KEY environment variable eksik." 
    }); 
  } 

  if (!personImage || !clothingImage) { 
    return res.status(400).json({ 
      success: false, 
      error: "Hem model hem de kıyafet resmi sağlanmalıdır." 
    }); 
  } 

  if (!isPlausibleBase64(personImage.base64) || !isPlausibleBase64(clothingImage.base64)) { 
    return res.status(400).json({ 
      success: false, 
      error: "Gönderilen resimler eksik veya çok küçük." 
    }); 
  } 

  const ai = new GoogleGenAI({ apiKey }); 
  const model = "gemini-2.5-flash-image-preview"; 
  const prompt = "Using the first image as the base, replace the clothing on the " + 
                 "person with the clothing item from the second image. Maintain the person's pose, " + 
                 "body shape, and the background. The result should be a realistic photo."; 

  const personImagePart = { 
    inlineData: { 
      data: stripBase64Prefix(personImage.base64), 
      mimeType: personImage.mimeType 
    } 
  }; 

  const clothingImagePart = { 
    inlineData: { 
      data: stripBase64Prefix(clothingImage.base64), 
      mimeType: clothingImage.mimeType 
    } 
  }; 

  const textPart = { text: prompt }; 

  try { 
    const response = await ai.models.generateContent({ 
      model, 
      contents: { parts: [personImagePart, clothingImagePart, textPart] }, 
      config: { responseModalities: [Modality.IMAGE] } 
    }); 

    console.log("Gemini response keys:", Object.keys(response || {})); 
    if (response?.candidates) { 
      console.log("Candidates length:", response.candidates.length); 
      const candidate = response.candidates[0]; 
      console.log("Candidate content parts count:", candidate?.content?.parts?.length); 
    } else { 
      console.log("No candidates in Gemini response; full response:", JSON.stringify(response)); 
    } 

    let imageUrl = null; 
    let text = null; 

    if (response.candidates?.length) { 
      const parts = response.candidates[0].content?.parts; 
      if (parts) { 
        for (const part of parts) { 
          if (part.inlineData) { 
            const base64ImageBytes = part.inlineData.data; 
            if (base64ImageBytes && base64ImageBytes.length > 100) { 
              imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`; 
            } else { 
              console.log("inlineData present but base64 empty or too small:", part.inlineData?.data?.length); 
            } 
          } else if (part.text) { 
            text = (text ? text + "\n" : "") + part.text; 
          } 
        } 
      } 
    } 

    if (!imageUrl) { 
      const errMsg = text || "AI modelinden geçerli bir görüntü dönülmedi"; 
      console.warn("No image produced by AI:", errMsg); 
      return res.status(502).json({ 
        success: false, 
        error: errMsg, 
        debug: { hasCandidates: !!response.candidates, candidateCount: response.candidates?.length ?? 0 } 
      }); 
    } 

    return res.json({ 
      success: true, 
      imageUrl, 
      text 
    }); 
  } catch (error) { 
    console.error("Error calling Gemini API:", error); 
    const errText = error?.message || String(error); 
    return res.status(500).json({ 
      success: false, 
      error: "AI modeline yapılan istek başarısız oldu.", 
      details: errText 
    }); 
  } 
}); 

// Health check endpoint 
app.get("/health", (req, res) => { 
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(), 
    service: "AI Clothes Swap API" 
  }); 
}); 

app.get("/", (req, res) => { 
  res.send("AI Clothes Swap servisiniz çalışıyor"); 
}); 

const PORT = process.env.PORT || 8080; 
app.listen(PORT, "0.0.0.0", () => { 
  console.log(`Server ${PORT} portunda çalışıyor`); 
}); 
