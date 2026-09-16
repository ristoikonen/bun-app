import { Image } from "bun";

//TODO: create lib or utils dir for these generic code functions! src/lib/image-processor.ts
// NOTE: This strips out malicious metadata (like XSS vectors or EXIF location data).
//USAGE:  const webpBuffer = await convertToWebP(byteSpan); 
//
export async function convertToWebP(inputBuffer: Uint8Array): Promise<Buffer> {
  const bytes = await new Bun.Image(inputBuffer)
    .webp({ quality: 65 })
    .bytes();
    
  return Buffer.from(bytes);
}

export async function convertToAVIF(inputBuffer: Uint8Array): Promise<Buffer> {
  const bytes = await new Bun.Image(inputBuffer)
    .avif({ quality: 65 }) 
    .bytes();
    
  return Buffer.from(bytes);
}