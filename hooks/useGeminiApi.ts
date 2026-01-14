import { GoogleGenAI, Modality, Part, SchemaType as GoogleSchemaType } from '@google/genai';
import { Garment, UploadedImage, BodyAnalysis, SizeRecommendation } from '../types.ts';

// Fallback if SchemaType is not exported
enum SchemaType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT"
}

// Initialize lazily to avoid crash if env var is missing at module load
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (ai) return ai;

  const API_KEY = import.meta.env.VITE_API_KEY;
  if (!API_KEY) {
    console.error("VITE_API_KEY is missing. Please set it in .env");
    throw new Error("VITE_API_KEY is missing. Please checks your .env file.");
  }

  ai = new GoogleGenAI({ apiKey: API_KEY });
  return ai;
};

const fileToGenerativePart = (base64: string, mimeType: string): Part => ({
  inlineData: { data: base64, mimeType },
});

export function useGeminiApi() {
  const generateVirtualTryOn = async (
    modelImage: UploadedImage,
    initialGarments: Garment[],
    isSameGarment: boolean,
    onProgress: (message: string) => void
  ): Promise<string> => {

    let isolatedGarments: Garment[] = [];

    // Step 1: Analyze Garments
    if (isSameGarment) {
      // CONSOLIDATED ANALYSIS: Best for multi-view of single garment
      onProgress("Analyzing garment structure (Consolidated)...");

      const allGarmentParts = initialGarments.map(g => fileToGenerativePart(g.base64, g.mimeType));
      const prompt = `Act as a technical fashion designer. 
      These images are multiple views of a **SINGLE GARMENT**.
      Analyze them together to create ONE cohesive, highly detailed technical description for this single item.
      Focus on:
      1. Fabric texture, weight, and material properties.
      2. Precise construction details (e.g., seams, ruffles, hem style).
      3. Exact fit and silhouette.
      4. Accurate color and pattern.
      5. IGNORE duplicate views; synthesize them into one description.
      Be precise and technical.`;

      const client = getAiClient();
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { role: 'user', parts: [...allGarmentParts, { text: prompt }] }
      });

      const consolidatedDescription = response.text ? response.text.trim() : "garment";

      // Apply the same description to all "views" so the final model knows they are the same
      isolatedGarments = initialGarments.map(g => ({
        ...g,
        description: consolidatedDescription
      }));

    } else if (initialGarments.length === 1) {
      // SINGLE IMAGE OPTIMIZATION: Skip explicit analysis for speed
      onProgress("Processing garment...");

      // We skip the detailed text analysis and rely on the visual prompt.
      isolatedGarments = initialGarments.map(g => ({
        ...g,
        description: "" // Visual-only processing
      }));

    } else {
      // INDIVIDUAL ANALYSIS: Best for distinct items (Shirt + Pants)
      onProgress("Analyzing and isolating garments (Parallel)...");

      const descriptionPromise = Promise.all(
        initialGarments.map(async (garment) => {
          const imagePart = fileToGenerativePart(garment.base64, garment.mimeType);
          const prompt = `Act as a technical fashion designer. Analyze this garment image and provide a highly detailed technical description. 
          Focus specifically on:
          1. Fabric texture, weight, and material properties.
          2. Precise construction details (e.g., specific ruffle types, pleat direction, seam placement, hem style).
          3. Exact volume, silhouette, and fit.
          4. Accurate color and pattern details.
          Be precise and technical.`;
          const client = getAiClient();
          const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { role: 'user', parts: [imagePart, { text: prompt }] }
          });
          return { id: garment.id, description: response.text ? response.text.trim() : "garment" };
        })
      );

      const [descriptions] = await Promise.all([descriptionPromise]);

      isolatedGarments = initialGarments.map(garment => {
        const descObj = descriptions.find(d => d.id === garment.id);
        return { ...garment, description: descObj ? descObj.description : "" };
      });
    }

    // Step 3: Generate Final Image
    onProgress("Compositing new look...");

    // For consolidated, we only need to pass the description once effectively, 
    // but passing it for each image part logic below remains fine as string join.
    // If consolidated, we might want to deduplicate descriptions in the prompt to avoid redundancy,
    // but keeping it simple is often safer. Let's just use the first one if consolidated.

    let garmentDescriptions = "";
    if (isSameGarment && isolatedGarments.length > 0) {
      garmentDescriptions = isolatedGarments[0].description || "";
    } else {
      garmentDescriptions = isolatedGarments.map(g => g.description).filter(Boolean).join(', ');
    }

    const descLower = garmentDescriptions.toLowerCase();
    const hasDress = /\b(dress|gown|frock|jumpsuit|romper|suit|maxi|mini|midi)\b/.test(descLower);
    const hasNecklace = /\b(necklace|pendant|choker|chain|jewel|beads|pearls|strand|neckwear)\b/.test(descLower);
    const hasShoes = /\b(shoe|boots|heels|sandals|sneakers|flats|pumps|footwear|stiletto|wedge)\b/.test(descLower);
    const hasNewBottoms = hasDress || /skirt|pants|trousers|jeans|leggings|shorts/.test(descLower);
    const hasNewTop = hasDress || /\b(top|shirt|blouse|t-shirt|cardigan|jacket|bodysuit|sweater|vest)\b/.test(descLower);
    const hasHat = /\b(hat|cap|beanie|fedora|beret)\b/.test(descLower);

    console.log("Detected Garments:", { hasDress, hasNecklace, hasShoes, descriptions: garmentDescriptions });

    const modelImagePart = fileToGenerativePart(modelImage.base64, modelImage.mimeType);
    const garmentImageParts = isolatedGarments.map(g => fileToGenerativePart(g.base64, g.mimeType || 'image/png'));

    // Handle Aspect Ratio
    let aspectRatio = "1:1";
    if (modelImage.width && modelImage.height) {
      const ratio = modelImage.width / modelImage.height;
      if (Math.abs(ratio - 16 / 9) < 0.1) aspectRatio = "16:9";
      else if (Math.abs(ratio - 9 / 16) < 0.1) aspectRatio = "9:16";
      else if (Math.abs(ratio - 4 / 3) < 0.1) aspectRatio = "4:3";
      else if (Math.abs(ratio - 3 / 4) < 0.1) aspectRatio = "3:4";
      // Default to 1:1 if unknown or close to square
    }

    const prompt = `You are a hyper-realistic AI photo-editing tool. Your sole function is to perform a virtual try-on.
    
**-- CRITICAL PRIORITY: PRESERVE IDENTITY AND FRAME --**
1.  **NO CROPPING:** The output must have existing composition.
2.  **IDENTITY LOCK:** The person's identity must be preserved EXACTLY.
3.  **ASPECT RATIO:** ${aspectRatio}.

**-- GARMENT ACCURACY RULES --**
**-- 1:1 REPLICATION ENFORCEMENT --**
1.  **SHOES & GARMENTS:** Must be a PIXEL-PERFECT match to the reference. Do not hallucinate straps, heel height, or toe shape. Preserve buckles, bows, and hardware EXACTLY as they appear in the reference.
2.  **RUFFLES & CONSTRUCTION:** The specific count, placement, and "fall" of ruffles must exactly match the technical reality of the reference.
3.  **SOURCE OF TRUTH:** The "GARMENTS" images are the texture maps. Wrap them onto the subject.

**-- STYLING INTELLIGENCE --**
1.  **ACCESSORY ADAPTATION:** For accessories like bags, use expert fashion judgment to reduce clashing.
2.  **NECKWEAR LOGIC:** 
    -   **IF** the user uploaded a NECKLACE (${hasNecklace ? "YES" : "NO"}): 
        -   **ACTION:** The NECKLACE must be visible on the skin.
        -   **FORBIDDEN:** Do NOT place any matching dress scarves/ties on the neck.
        -   **REQUIRED STYLING:** You MUST move the scarf/tie to the ARMS (shawl position) or trailing behind. It is strictly banned from the neck area to avoid conflict.
    -   **ELSE** (No necklace): Style scarves/ties naturally around the neck as intended by the original garment.
3.  **HEADWEAR LOGIC:**
    -   **IF** the user uploaded a HAT (${hasHat ? "YES" : "NO"}):
        -   **ACTION:** Replace any existing headwear. Ensure it sits naturally on the head.
4.  **HARMONY:** Prioritize the overall look's cohesion.

**-- PHOTOREALISM & LIGHTING RULES --**
1.  **LIGHTING MATCH:** The lighting on the new garments MUST perfectly match the lighting on the subject's skin and face.
2.  **NATURAL DRAPING:** Fabric must drape naturally over the body's curves.
3.  **CAST SHADOWS:** The garments must cast realistic shadows on the body and ground.
4.  **TEXTURE:** Enhance fabric texture (e.g., silk sheen, cotton matte) to look tangible.

**-- INSTRUCTIONS --**
-   SUBJECT: The first image.
-   GARMENTS: The subsequent images.
-   ACTION: Dress the SUBJECT in the GARMENTS.
    -   New garments: USE VISUAL TEXTURE FROM IMAGES.${garmentDescriptions ? ` (Description: ${garmentDescriptions})` : ""}.
    -   ${hasNewTop ? "REPLACE the subject's top." : "KEEP the subject's top."}
    -   ${hasNewBottoms ? "REPLACE the subject's bottoms." : "KEEP the subject's bottoms."}
    -   ${hasDress ? "Ensure the garment is worn as a full-body outfit, completely replacing the original outfit. Do not render as a vest." : "Ensure seamless integration."}
`;

    const textPart = { text: prompt };

    const parts: Part[] = [
      textPart,
      modelImagePart,
      ...garmentImageParts
    ];

    const client = getAiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3-pro-image-preview', // USER REQUESTED SPECIFICALLY
      contents: { role: 'user', parts },
      config: {
        responseModalities: [Modality.IMAGE],
        generationConfig: {
          aspectRatio: aspectRatio
        }
      } as any, // Cast to any to avoid type error for generationConfig
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart?.inlineData) {
      onProgress("Finalizing image...");
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    const textResponse = response.text;
    console.warn("Model did not return an image. Text response:", textResponse);
    throw new Error("The AI failed to generate an image. It may have refused the request or produced an invalid response.");
  };

  const analyzeBody = async (
    modelImage: UploadedImage,
    onProgress: (message: string) => void
  ): Promise<BodyAnalysis> => {
    onProgress("Analyzing body measurements...");
    const client = getAiClient();
    const modelPart = fileToGenerativePart(modelImage.base64, modelImage.mimeType);

    const prompt = `You are a fashion fit and body measurement assistant.
    You receive a single PERSON_IMAGE of one person standing.
    From just this image, estimate the person's body in the most realistic and practical way possible.

    Return a JSON object with keys:
    estimated_height_in: number,        // person's approximate height in inches
    bust_or_chest_in: number,          // fullest part of chest/bust
    waist_in: number,                  // natural waist
    hip_in: number,                    // fullest part of hips
    build: "slim|medium|curvy|broad|athletic",
    posture_notes: string,
    confidence_0_to_1: number          // how confident you are in these estimates

    Rules:
    - Use reasonable, fashion-relevant ranges.
    - If unsure, still give your best numeric estimate.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash', // Updated to 2.5 Flash to match notebook recommendation
      contents: { role: 'user', parts: [modelPart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            estimated_height_in: { type: SchemaType.NUMBER },
            bust_or_chest_in: { type: SchemaType.NUMBER },
            waist_in: { type: SchemaType.NUMBER },
            hip_in: { type: SchemaType.NUMBER },
            build: { type: SchemaType.STRING },
            posture_notes: { type: SchemaType.STRING },
            confidence_0_to_1: { type: SchemaType.NUMBER },
          },
          required: [
            "estimated_height_in",
            "bust_or_chest_in",
            "waist_in",
            "hip_in",
            "build",
            "posture_notes",
            "confidence_0_to_1"
          ]
        }
      }
    });

    if (!response.text) throw new Error("Failed to analyze body.");
    return JSON.parse(response.text) as BodyAnalysis;
  };

  const recommendSize = async (
    bodyAnalysis: BodyAnalysis,
    productInfo: string,
    availableSizes: string[],
    onProgress: (message: string) => void
  ): Promise<SizeRecommendation> => {
    onProgress("Recommending size...");
    const client = getAiClient();

    const prompt = `You are a senior fashion fit expert.

    ESTIMATED_BODY_MEASUREMENTS_JSON:
    ${JSON.stringify(bodyAnalysis)}

    PRODUCT_INFO_TEXT:
    """${productInfo}"""

    AVAILABLE_SIZES: [${availableSizes.join(', ')}]

    Goals:
    1) Infer the approximate base size for this model in THIS SPECIFIC GARMENT.
    2) Decide which sizes are realistically TRY-ON-ABLE for this model.
    3) Prefer natural, realistic fit decisions over extreme distortion.

    Return JSON with keys:
    base_size: "XS|S|M|L|XL|XXL|null",
    try_on_sizes: ["sizes from AVAILABLE_SIZES that are reasonable to render"],
    skipped_sizes: ["sizes from AVAILABLE_SIZES that are unrealistic"],
    reason: "short, one liner for each size"`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            base_size: { type: SchemaType.STRING, nullable: true },
            try_on_sizes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            skipped_sizes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            reason: { type: SchemaType.STRING }
          },
          required: ["try_on_sizes", "skipped_sizes", "reason"]
        }
      }
    });

    if (!response.text) throw new Error("Failed to recommend size.");
    return JSON.parse(response.text) as SizeRecommendation;
  };

  const generateSizeFitTryOn = async (
    modelImage: UploadedImage,
    garmentImage: UploadedImage,
    sizeGuideImage: UploadedImage,
    bodyAnalysis: BodyAnalysis,
    targetSize: string,
    productInfo: string,
    outfitType: string,
    onProgress: (message: string) => void
  ): Promise<string> => {
    onProgress(`Generating try-on for size ${targetSize}...`);
    const client = getAiClient();

    const modelPart = fileToGenerativePart(modelImage.base64, modelImage.mimeType);
    const garmentPart = fileToGenerativePart(garmentImage.base64, garmentImage.mimeType);
    const sizeGuidePart = fileToGenerativePart(sizeGuideImage.base64, sizeGuideImage.mimeType);

    // Handle Aspect Ratio (reused from existing logic)
    let aspectRatio = "1:1";
    if (modelImage.width && modelImage.height) {
      const ratio = modelImage.width / modelImage.height;
      if (Math.abs(ratio - 16 / 9) < 0.1) aspectRatio = "16:9";
      else if (Math.abs(ratio - 9 / 16) < 0.1) aspectRatio = "9:16";
      else if (Math.abs(ratio - 4 / 3) < 0.1) aspectRatio = "4:3";
      else if (Math.abs(ratio - 3 / 4) < 0.1) aspectRatio = "3:4";
    }

    const prompt = `You are a fashion virtual try-on engine.

    Inputs:
    1) PERSON_IMAGE (real person).
    2) OUTFIT_IMAGE (product photo).
    3) BRAND_SIZE_GUIDE_IMAGE (table with Size | Bust (in) | Waist (in) | Hip (in)).
    4) TARGET_SIZE: ${targetSize}
    5) OUTFIT_TYPE: ${outfitType}
    6) ESTIMATED_BODY_MEASUREMENTS_JSON:
    ${JSON.stringify(bodyAnalysis)}
    7) PRODUCT_INFO_TEXT:
    """${productInfo}"""

    Tasks:
    1. Use ESTIMATED_BODY_MEASUREMENTS_JSON as reference.
    2. Read BRAND_SIZE_GUIDE_IMAGE to determine best 'true size'.
    3. Use PRODUCT_INFO_TEXT to understand fit/fabric.
    4. For TARGET_SIZE:
       - If smaller than best size -> looks tight (tension lines).
       - If matches best size -> perfect fit.
       - If larger -> looks loose (drape/folds).
    5. Preserve person's identity and background.

    Strict rule:
    - Do NOT modify the person’s body proportions to force fit.
    - Only adjust the garment fit.

    Generate ONE highly realistic try-on image.`;

    const response = await client.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { role: 'user', parts: [modelPart, garmentPart, sizeGuidePart, { text: prompt }] },
      config: {
        responseModalities: [Modality.IMAGE],
        generationConfig: {
          aspectRatio: aspectRatio
        }
      } as any
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart?.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    throw new Error("Failed to generate image.");
  };

  return { generateVirtualTryOn, analyzeBody, recommendSize, generateSizeFitTryOn };
}
