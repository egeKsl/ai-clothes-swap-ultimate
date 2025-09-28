
import React, { useState, useRef, useCallback, DragEvent } from 'react';
import { ImageFile } from '../types';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  title: string;
  onImageUpload: (file: ImageFile) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ title, onImageUpload }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onImageUpload({
          base64: base64String,
          mimeType: file.type,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFile(event.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };


  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl font-bold text-gray-300 mb-3">{title}</h2>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full aspect-square max-w-md bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-purple-500 bg-gray-800' : 'hover:border-purple-400'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        {preview ? (
          <img src={preview} alt={`${title} preview`} className="object-contain w-full h-full rounded-lg" />
        ) : (
          <div className="text-center text-gray-500">
            <UploadIcon />
            <p>Click or drag & drop</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
