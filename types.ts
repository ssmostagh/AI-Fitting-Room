
export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface Garment extends UploadedImage {
  description?: string;
}

export interface BodyAnalysis {
  estimated_height_in: number;
  bust_or_chest_in: number;
  waist_in: number;
  hip_in: number;
  build: string;
  posture_notes: string;
  confidence_0_to_1: number;
}

export interface SizeRecommendation {
  base_size: string | null;
  try_on_sizes: string[];
  skipped_sizes: string[];
  reason: string;
}
