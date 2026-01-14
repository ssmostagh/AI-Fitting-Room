import { useState, useCallback } from 'react';
import { UploadedImage, Garment, BodyAnalysis, SizeRecommendation } from './types.ts';
import { useGeminiApi } from './hooks/useGeminiApi.ts';
import { SparklesIcon, TrashIcon, UserIcon, ShirtIcon, ArrowPathIcon, ArrowDownTrayIcon, RulerIcon } from './components/icons.tsx';
import FileDropzone from './components/FileDropzone.tsx';

export default function App() {
  const [modelImage, setModelImage] = useState<UploadedImage | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isSameGarment, setIsSameGarment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Size & Fit State
  const [isSizeFitMode, setIsSizeFitMode] = useState(false);
  const [sizeGuide, setSizeGuide] = useState<UploadedImage | null>(null);
  const [productInfo, setProductInfo] = useState('');
  // const [availableSizes, setAvailableSizes] = useState<string>('XS, S, M, L, XL'); // Default sizes (unused in UI for now)
  const availableSizes = 'XS, S, M, L, XL';
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysis | null>(null);
  const [sizeRecommendation, setSizeRecommendation] = useState<SizeRecommendation | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const outfitType = 'Dress'; // Default, could be dynamic

  const { generateVirtualTryOn, analyzeBody, recommendSize, generateSizeFitTryOn } = useGeminiApi();

  const handleModelUpload = (images: UploadedImage[]) => {
    if (images.length > 0) {
      setModelImage(images[0]);
      setFinalImage(null);
      setError(null);
    }
  };

  const handleGarmentUpload = (images: UploadedImage[]) => {
    if (isSizeFitMode) {
      // In Size & Fit mode, we only allow one garment
      setGarments(images.slice(0, 1));
    } else {
      setGarments((prev) => [...prev, ...images]);
    }
    setFinalImage(null);
    setError(null);
  };

  const handleSizeGuideUpload = (images: UploadedImage[]) => {
    if (images.length > 0) {
      setSizeGuide(images[0]);
    }
  };

  const handleRemoveGarment = (id: string) => {
    setGarments((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAnalyzeBody = async () => {
    if (!modelImage) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeBody(modelImage, setLoadingMessage);
      setBodyAnalysis(result);
    } catch (e) {
      console.error(e);
      setError("Body analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysisChange = (field: keyof BodyAnalysis, value: string | number) => {
    if (!bodyAnalysis) return;
    setBodyAnalysis({
      ...bodyAnalysis,
      [field]: value
    });
  };

  const handleRecommendSize = async () => {
    if (!bodyAnalysis || !productInfo) return;
    setIsLoading(true);
    setError(null);
    try {
      const sizes = availableSizes.split(',').map(s => s.trim());
      const result = await recommendSize(bodyAnalysis, productInfo, sizes, setLoadingMessage);
      setSizeRecommendation(result);
      if (result.base_size) setSelectedSize(result.base_size);
    } catch (e) {
      console.error(e);
      setError("Size recommendation failed.");
    } finally {
      setIsLoading(false);
    }
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
      if (isSizeFitMode && sizeGuide && bodyAnalysis && selectedSize) {
        // Use Size & Fit Workflow
        setLoadingMessage("Generating size-specific try-on...");
        const img = await generateSizeFitTryOn(
          modelImage,
          garments[0], // Assuming single garment for Size & Fit for now
          sizeGuide,
          bodyAnalysis,
          selectedSize,
          productInfo,
          outfitType,
          setLoadingMessage
        );
        setFinalImage(img);
      } else {
      // Use Standard Workflow
        setLoadingMessage("Initializing virtual try-on...");
        const generatedImage = await generateVirtualTryOn(
          modelImage,
          garments,
          isSameGarment,
          (progressMessage) => {
            setLoadingMessage(progressMessage);
          }
        );
        setFinalImage(generatedImage);
      }

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "An unknown error occurred. Please check the console.");
    } finally {
      setIsLoading(false);
    }
  }, [modelImage, garments, isSameGarment, generateVirtualTryOn, sizeGuide, bodyAnalysis, selectedSize, productInfo, outfitType, generateSizeFitTryOn, isSizeFitMode]);

  const handleReset = () => {
    setModelImage(null);
    setGarments([]);
    setSizeGuide(null);
    setProductInfo('');
    setBodyAnalysis(null);
    setSizeRecommendation(null);
    setFinalImage(null);
    setError(null);
    setIsLoading(false);
    setIsSizeFitMode(false);
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

              {/* Size & Fit Toggle */}
              {modelImage && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="sizeFitMode"
                      checked={isSizeFitMode}
                      onChange={(e) => {
                        const newMode = e.target.checked;
                        setIsSizeFitMode(newMode);
                        // If switching TO Size Fit Mode, enforce single garment limit immediately if we have multiple
                        if (newMode && garments.length > 1) {
                          setGarments(garments.slice(0, 1));
                        }
                      }}
                      className="w-5 h-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                    />
                    <label htmlFor="sizeFitMode" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                      Enable Size & Fit Analysis?
                    </label>
                  </div>

                  {isSizeFitMode && !bodyAnalysis && (
                    <button
                      onClick={handleAnalyzeBody}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      <SparklesIcon className="h-4 w-4" />
                      Analyze Body Measurements
                    </button>
                  )}
                </div>
              )}

              {/* Editable Body Analysis */}
              {isSizeFitMode && bodyAnalysis && (
                <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-700 text-sm space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-white">Body Analysis (Editable)</h3>
                    <button onClick={handleAnalyzeBody} className="text-xs text-blue-400 hover:text-blue-300">Re-analyze</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-500 text-xs mb-1">Height (in)</label>
                      <input
                        type="number"
                        value={bodyAnalysis.estimated_height_in}
                        onChange={(e) => handleAnalysisChange('estimated_height_in', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border-gray-600 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-xs mb-1">Build</label>
                      <input
                        type="text"
                        value={bodyAnalysis.build}
                        onChange={(e) => handleAnalysisChange('build', e.target.value)}
                        className="w-full bg-gray-900 border-gray-600 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-xs mb-1">Bust/Chest (in)</label>
                      <input
                        type="number"
                        value={bodyAnalysis.bust_or_chest_in}
                        onChange={(e) => handleAnalysisChange('bust_or_chest_in', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border-gray-600 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-xs mb-1">Waist (in)</label>
                      <input
                        type="number"
                        value={bodyAnalysis.waist_in}
                        onChange={(e) => handleAnalysisChange('waist_in', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border-gray-600 rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 text-xs mb-1">Hips (in)</label>
                      <input
                        type="number"
                        value={bodyAnalysis.hip_in}
                        onChange={(e) => handleAnalysisChange('hip_in', parseFloat(e.target.value))}
                        className="w-full bg-gray-900 border-gray-600 rounded px-2 py-1 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Garment Uploader */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">{isSizeFitMode ? "2. Add Garment" : "2. Add Garments"}</h2>
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
                  title={isSizeFitMode ? "garment" : "garments"}
                  isMini={true}
                  multiple={!isSizeFitMode}
                />
              </div>

              {/* Same Garment Checkbox (Standard Flow) */}
              {!isSizeFitMode && (
                <div className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700 mb-4">
                  <input
                    type="checkbox"
                    id="sameGarment"
                    checked={isSameGarment}
                    onChange={(e) => setIsSameGarment(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                  />
                  <label htmlFor="sameGarment" className="text-sm text-gray-300 cursor-pointer select-none">
                    These are different views of the <strong>same garment</strong>
                  </label>
                </div>
              )}

              {/* Size & Fit Inputs */}
              {isSizeFitMode && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Size Guide</h3>
                    <FileDropzone
                      onFileUpload={handleSizeGuideUpload}
                      preview={sizeGuide?.preview}
                      icon={<RulerIcon className="h-8 w-8 text-gray-500" />}
                      title="size chart"
                      isMini={true}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Product Info (Optional)</h3>
                    <textarea
                      className="w-full bg-gray-800 border-gray-700 rounded-md text-white p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      placeholder="Describe fabric, fit (e.g. slim, loose), and stretch..."
                      value={productInfo}
                      onChange={(e) => setProductInfo(e.target.value)}
                    />
                  </div>
                  {sizeGuide && productInfo && bodyAnalysis && (
                    <button
                      onClick={handleRecommendSize}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded text-white font-medium disabled:opacity-50"
                      disabled={isLoading}
                    >
                      Step 2: Get Size Recommendation
                    </button>
                  )}
                  {sizeRecommendation && (
                    <div className="p-4 bg-purple-900/20 rounded border border-purple-700 text-sm">
                      <h4 className="font-bold text-purple-300 mb-1">Recommendation</h4>
                      <p className="text-white mb-2">{sizeRecommendation.base_size ? `Best Fit: ${sizeRecommendation.base_size}` : "Could not determine best fit."}</p>
                      <p className="text-purple-200 italic mb-2">"{sizeRecommendation.reason}"</p>
                      <label className="block text-gray-400 text-xs mb-1">Try-on Size:</label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full bg-gray-900 border-gray-600 rounded text-white text-sm"
                      >
                        <option value="">Select Size</option>
                        {sizeRecommendation.try_on_sizes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
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
