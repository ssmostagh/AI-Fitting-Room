
import { GoogleGenAI, Modality, Part } from '@google/genai';
import { Garment, UploadedImage } from '../types.ts';

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
    -   New garments: USE VISUAL TEXTURE FROM IMAGES. (Description: ${garmentDescriptions}).
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

  return { generateVirtualTryOn };
}
