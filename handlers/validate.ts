import { write } from "bun";
import { extname, basename,join, normalize } from "node:path";

const MAX_FILE_SIZE = 500 * 1024; // 500 KB limit
const MAX_IMAGE_WIDTH = 600; 
const MAX_IMAGE_HEIGHT = 600; 
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";
const THUMB_SIZE_PX = 200;
const THUMB_QUALITY = 80;

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  webp: [0x52, 0x49, 0x46, 0x46],
};

export enum WebPFormat {
    Unknown = 0,
    Lossy = 1,      // VP8 
    Lossless = 2,   // VP8L
    Extended = 3    // VP8X
}

/**
 * Detects the specific WebP format variant from a byte array.
 * Equivalent to the format sniffing logic in FormatDetection.cs
 */
export function detectWebPFormat(buffer: Uint8Array): WebPFormat {
    // Minimum length for a valid WebP header (RIFF + size + WEBP + chunk header)
    if (buffer.length < 16) {
        return WebPFormat.Unknown;
    }

    // Check for 'RIFF' signature at bytes 0-3
    const isRIFF = 
        buffer[0] === 0x52 && // 'R'
        buffer[1] === 0x49 && // 'I'
        buffer[2] === 0x46 && // 'F'
        buffer[3] === 0x46;   // 'F'

    // Check for 'WEBP' signature at bytes 8-11
    const isWebP = 
        buffer[8] === 0x57 &&  // 'W'
        buffer[9] === 0x45 &&  // 'E'
        buffer[10] === 0x42 && // 'B'
        buffer[11] === 0x50;   // 'P'

    if (!isRIFF || !isWebP) {
        return WebPFormat.Unknown;
    }

    // Read the 4-character chunk header at bytes 12-15
    const chunkHeader = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);

    switch (chunkHeader) {
        case 'VP8 ':
            return WebPFormat.Lossy;
        case 'VP8L':
            return WebPFormat.Lossless;
        case 'VP8X':
            return WebPFormat.Extended;
        default:
            return WebPFormat.Unknown;
    }
}

async function checkFile(filePath: string) {
    const file = Bun.file(filePath);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const format = detectWebPFormat(bytes);

    switch (format) {
        case WebPFormat.Lossy:
            console.log("Detected: Lossy WebP (VP8)");
            break;
        case WebPFormat.Lossless:
            console.log("Detected: Lossless WebP (VP8L)");
            break;
        case WebPFormat.Extended:
            console.log("Detected: Extended WebP (VP8X)");
            break;
        default:
            console.log("Detected: Unknown or non-WebP format");
            break;
    }

}

/*

export default async function handleUpload(req: Request): Promise<Response> {
    try {
        const formData = await req.formData();
        const file = formData.get("image");

        // 1. Ensure it's a valid File object instance
        if (!file || typeof file === "string") {
            return new Response("Invalid submission", { status: 400 });
        }

        // 2. Strict Size Restriction Check (< 500KB) BEFORE reading into memory
        if (file.size > MAX_FILE_SIZE) {
            return new Response("File too large. Maximum size allowed is 500KB.", { status: 400 });
        }

        // 3. Strict MIME type verification
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return new Response("Unsupported file type. Only JPEG, PNG, GIF, and WEBP are allowed.", { status: 400 });
        }

        // Read into buffer safely now that size is strictly bounded
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Double check buffer size matches file.size attribute
        if (buffer.length > MAX_FILE_SIZE) {
            return new Response("Payload limit exceeded", { status: 400 });
        }

        const image = new Bun.Image(buffer);
        const meta = await image.metadata();

        // 4. Validate metadata integrity (Blocks corrupted images or crafted exploits)
        if (!meta.width || !meta.height || meta.width > MAX_IMAGE_WIDTH || meta.height > MAX_IMAGE_HEIGHT) {
            return new Response("Invalid image dimensions or malformed image data", { status: 400 });
        }

        const fileext =
            meta.format === "jpeg" ? "jpg" :
            meta.format === "png" ? "png" :
            meta.format === "gif" ? "gif" :
            meta.format === "webp" ? "webp" : null;

        if (!fileext) {
            return new Response("Unrecognized image format", { status: 400 });
        }

        // 5. Generate secure, unpredictable filename (prevents directory traversal or collisions)
        const safeId = crypto.randomUUID();
        const filename = `${Date.now()}-${safeId}.${fileext}`;

        // Ensure target path stays strictly inside UPLOAD_DIR (Path Traversal defense)
        const safeUploadPath = normalize(join(UPLOAD_DIR, filename));
        const safeThumbPath = normalize(join(THUMB_DIR, filename));

        if (!safeUploadPath.startsWith(normalize(UPLOAD_DIR))) {
            return new Response("Forbidden path sequence detected", { status: 403 });
        }

        // Save original file
        await Bun.file(safeUploadPath).write(buffer);

        // Generate thumbnail safely
        await image
            .resize(THUMB_SIZE_PX)
            .jpeg({ quality: THUMB_QUALITY })
            .write(safeThumbPath);

        const placeholder = await image.placeholder();
        const base64 = await image.toBase64();

        const thumbimageHTML = `<img src="data:image/png;base64,${base64}" alt="Inlined Image" />`;
        const placeholderHTMLloading = `<img src="${placeholder}" alt="Placeholder Image" />`;

        return new Response('<p>' + thumbimageHTML + '<br/>Thumb</p><br/><br/><p>' + placeholderHTMLloading + '<br/>Placeholder</p>', {
            headers: { "Content-Type": "text/html" },
        });
    }
    catch (error) {
        console.error("Error handling upload:", error);
        return new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/html" } });
    }
}

*/