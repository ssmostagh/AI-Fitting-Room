
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
