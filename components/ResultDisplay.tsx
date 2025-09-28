
import React from 'react';
import { DownloadIcon } from './icons';

interface ResultDisplayProps {
  image: string | null;
  text: string | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ image, text }) => {
  if (!image) {
    return null;
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image;
    link.download = `ai-clothes-swap-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full max-w-2xl mt-10 bg-gray-800/50 rounded-lg p-6 shadow-2xl border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Result</h2>
      <div className="relative group">
        <img src={image} alt="Generated result" className="rounded-md w-full object-contain" />
        <button
          onClick={handleDownload}
          className="absolute top-3 right-3 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Download image"
        >
          <DownloadIcon />
        </button>
      </div>
      {text && (
        <p className="text-gray-300 mt-4 bg-gray-900/50 p-3 rounded-md text-center">
          {text}
        </p>
      )}
    </div>
  );
};

export default ResultDisplay;
