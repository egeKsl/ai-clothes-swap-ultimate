
import React, { useState, useCallback } from 'react';
import { ImageFile } from './types';
import { swapClothes } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import { LoadingSpinner, SwapIcon } from './components/icons';

const App: React.FC = () => {
  const [personImage, setPersonImage] = useState<ImageFile | null>(null);
  const [clothingImage, setClothingImage] = useState<ImageFile | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handlePersonImageUpload = useCallback((file: ImageFile) => {
    setPersonImage(file);
    setResultImage(null);
    setResultText(null);
    setError(null);
  }, []);

  const handleClothingImageUpload = useCallback((file: ImageFile) => {
    setClothingImage(file);
    setResultImage(null);
    setResultText(null);
    setError(null);
  }, []);
  
  const handleSwap = async () => {
    if (!personImage || !clothingImage) {
      setError("Please upload both a person and a clothing image.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setResultText(null);

    try {
      const result = await swapClothes(personImage, clothingImage);
      if (result.imageUrl) {
        setResultImage(result.imageUrl);
        setResultText(result.text || "Here is the swapped image.");
      } else {
        setError(result.text || "Could not generate an image. The model may not have returned an image for this request.");
      }
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to swap clothes: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
      <header className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          AI Clothes Swap
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Powered by Gemini 2.5 Flash Image Preview
        </p>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ImageUploader title="Person" onImageUpload={handlePersonImageUpload} />
          <ImageUploader title="Clothing" onImageUpload={handleClothingImageUpload} />
        </div>
        
        <button
          onClick={handleSwap}
          disabled={!personImage || !clothingImage || isLoading}
          className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-800 rounded-md shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Swapping...
            </>
          ) : (
            <>
              <SwapIcon />
              Swap Clothes
            </>
          )}
        </button>

        {error && (
          <div className="mt-6 w-full max-w-2xl bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md text-center">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        {isLoading && (
          <div className="mt-6 text-center text-gray-400">
            <p>The AI is working its magic... This might take a moment.</p>
          </div>
        )}

        {resultImage && (
          <ResultDisplay image={resultImage} text={resultText} />
        )}
      </main>

      <footer className="w-full max-w-5xl text-center mt-auto pt-8">
        <p className="text-gray-500 text-sm">
          Generated images are AI-creations and may not be perfect.
        </p>
      </footer>
    </div>
  );
};

export default App;
