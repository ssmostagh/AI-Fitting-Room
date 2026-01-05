import { useState, useCallback } from 'react';
import { UploadedImage, Garment } from './types.ts';
import { useGeminiApi } from './hooks/useGeminiApi.ts';
import { SparklesIcon, TrashIcon, UserIcon, ShirtIcon, ArrowPathIcon, ArrowDownTrayIcon } from './components/icons.tsx';
import FileDropzone from './components/FileDropzone.tsx';

export default function App() {
  const [modelImage, setModelImage] = useState<UploadedImage | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isSameGarment, setIsSameGarment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { generateVirtualTryOn } = useGeminiApi();

  const handleModelUpload = (images: UploadedImage[]) => {
    if (images.length > 0) {
      setModelImage(images[0]);
      setFinalImage(null);
      setError(null);
    }
  };

  const handleGarmentUpload = (images: UploadedImage[]) => {
    setGarments((prev) => [...prev, ...images]);
    setFinalImage(null);
    setError(null);
  };

  const handleRemoveGarment = (id: string) => {
    setGarments((prev) => prev.filter((g) => g.id !== id));
  };

  const handleGenerate = useCallback(async () => {
    if (!modelImage || garments.length === 0) {
      setError("Please upload a model image and at least one garment.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFinalImage(null);

    try {
      setLoadingMessage("Initializing virtual try-on...");

      // The hook now orchestrates the entire multi-stage process.
      // We pass a callback to receive real-time progress updates for the UI.
      const generatedImage = await generateVirtualTryOn(
        modelImage,
        garments,
        isSameGarment,
        (progressMessage) => {
          setLoadingMessage(progressMessage);
        }
      );

      setFinalImage(generatedImage);

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "An unknown error occurred. Please check the console.");
    } finally {
      setIsLoading(false);
    }
  }, [modelImage, garments, generateVirtualTryOn]);

  const handleReset = () => {
    setModelImage(null);
    setGarments([]);
    setFinalImage(null);
    setError(null);
    setIsLoading(false);
  };

  const canGenerate = modelImage && garments.length > 0 && !isLoading;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Virtual Fitting Room
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Upload a photo, add your garments, and let AI create your new look.
          </p>
          <p className="mt-2 text-xs text-gray-500 max-w-xl mx-auto italic">
            Disclaimer: This tool visualizes styling only. Garments are AI-adapted to fit the model's form and do not represent actual product sizing or measurements.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-8">
            {/* Model Uploader */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Upload Your Photo</h2>
              <FileDropzone
                onFileUpload={handleModelUpload}
                preview={modelImage?.preview}
                icon={<UserIcon className="h-12 w-12 text-gray-500" />}
                title="your photo"
              />
            </div>

            {/* Garment Uploader */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Add Garments</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {garments.map((garment) => (
                  <div key={garment.id} className="relative group">
                    <img src={garment.preview} alt="Garment" className="w-full h-40 object-cover rounded-lg" />
                    <button
                      onClick={() => handleRemoveGarment(garment.id)}
                      className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove garment"
                    >
                      <TrashIcon className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
                <FileDropzone
                  onFileUpload={handleGarmentUpload}
                  icon={<ShirtIcon className="h-12 w-12 text-gray-500" />}
                  title="garments"
                  isMini={true}
                  multiple={true}
                />
              </div>

              {/* Same Garment Checkbox */}
              <div className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <input
                  type="checkbox"
                  id="sameGarment"
                  checked={isSameGarment}
                  onChange={(e) => setIsSameGarment(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                />
                <label htmlFor="sameGarment" className="text-sm text-gray-300 cursor-pointer select-none">
                  These are different views of the <strong>same garment</strong> (e.g. front/back)
                </label>
              </div>
            </div>
          </div>

          {/* Output Section */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold text-white mb-4">3. See The Result</h2>
            <div className="flex-grow bg-gray-800/50 rounded-lg flex items-center justify-center min-h-[400px] lg:min-h-full p-4 border-2 border-dashed border-gray-700">
              {isLoading ? (
                <div className="text-center">
                  <SparklesIcon className="h-12 w-12 text-indigo-400 mx-auto animate-pulse" />
                  <p className="mt-4 text-lg font-medium text-white">{loadingMessage}</p>
                  <p className="text-sm text-gray-400">AI is working its magic...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-400">
                  <h3 className="font-bold text-lg">Generation Failed</h3>
                  <p className="mt-2 text-sm max-w-sm">{error}</p>
                </div>
              ) : finalImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img src={finalImage} alt="Generated try-on" className="max-w-full max-h-full object-contain rounded-lg" />
                  <a
                    href={finalImage}
                    download={`vto-look-${Date.now()}.png`}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md p-2 rounded-full text-white transition-colors"
                    title="Download Image"
                  >
                    <ArrowDownTrayIcon className="w-6 h-6" />
                  </a>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <SparklesIcon className="h-12 w-12 mx-auto" />
                  <p className="mt-4 text-lg">Your generated image will appear here</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="mt-24 pb-20 flex flex-col sm:flex-row items-center justify-center gap-8">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
          >
            <SparklesIcon className="h-6 w-6" />
            Generate Look
          </button>
          <button
            onClick={handleReset}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-md font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Start Over
          </button>
        </footer>
      </div>
    </div>
  );
}
