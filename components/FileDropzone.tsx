
import React, { useCallback, useState } from 'react';
import { UploadedImage } from '../types.ts';
import { UploadIcon } from './icons.tsx';

interface FileDropzoneProps {
  onFileUpload: (files: UploadedImage[]) => void;
  preview?: string;
  icon: React.ReactNode;
  title: string;
  isMini?: boolean;
  multiple?: boolean;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export default function FileDropzone({ onFileUpload, preview, icon, title, isMini = false, multiple = false }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback(async (fileList: FileList | null) => {
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);

      const processedFiles = await Promise.all(files.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          return null;
        }
        const base64 = await fileToBase64(file);
        const previewUrl = URL.createObjectURL(file);

        return new Promise<UploadedImage>((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              file,
              preview: previewUrl,
              base64,
              mimeType: file.type,
              width: img.width,
              height: img.height,
            });
          };
          img.src = previewUrl;
        });
      }));

      const validFiles = processedFiles.filter((f): f is UploadedImage => f !== null);

      if (validFiles.length > 0) {
        onFileUpload(validFiles);
      } else {
        alert('Please upload valid image files.');
      }
    }
  }, [onFileUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFileChange(event.dataTransfer.files);
  }, [handleFileChange]);

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  if (preview && !isMini) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden">
        <img src={preview} alt="Model preview" className="w-full h-auto max-h-[600px] object-contain mx-auto" />
        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
          <span className="text-white font-semibold">Change Photo</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files)}
          />
        </label>
      </div>
    );
  }

  const baseClasses = "flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed cursor-pointer transition-colors";
  const sizeClasses = isMini ? "h-40" : "h-64";
  const stateClasses = isDragging ? "border-indigo-400 bg-gray-700" : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/70";

  return (
    <label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`${baseClasses} ${sizeClasses} ${stateClasses}`}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
        {isMini ? <UploadIcon className="w-8 h-8 mb-2 text-gray-500" /> : icon}
        <p className={`mb-2 ${isMini ? 'text-sm' : 'text-md'} text-gray-400`}>
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          {isMini ? `Add ${title}` : `Upload ${title}`}
        </p>
      </div>
      <input
        type="file"
        className="hidden"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => handleFileChange(e.target.files)}
      />
    </label>
  );
}
