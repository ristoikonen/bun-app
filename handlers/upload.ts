import { join, normalize } from "node:path";

const MAX_FILE_SIZE = 500 * 1024; // 500 KB limit
const MAX_IMAGE_WIDTH = 600; 
const MAX_IMAGE_HEIGHT = 600; 
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";
const THUMB_SIZE_PX = 200;
const THUMB_QUALITY = 80;

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