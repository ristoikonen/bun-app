
// bun test handlers/upload.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test";
import handleUpload from "./upload";

// Mock filesystem writes so tests don't clutter your disk or throw errors if dirs don't exist
mock.module("bun", () => {
    const actualBun = Bun;
    return {
        ...actualBun,
        file: (path: string) => ({
            write: async () => { }, // Mock file write
        }),
        Image: class {
            constructor(buffer: Buffer) { }
            async metadata() {
                return { width: 800, height: 600, format: "jpeg" };
            }
            resize(width: number) {
                return this;
            }
            jpeg(options: any) {
                return this;
            }
            async write(path: string) { }
            async placeholder() {
                return "mocked-placeholder-base64";
            }
            async toBase64() {
                return "mocked-base64-string";
            }
        },
    };
});

describe("handleUpload", () => {
    it("should return 400 if no image is provided in form data", async () => {
        const formData = new FormData();
        const req = new Request("http://localhost/upload", {
            method: "POST",
            body: formData,
        });

        const res = await handleUpload(req);
        expect(res.status).toBe(400);
        expect(await res.text()).toBe("Invalid image");
    });

    it("should successfully process a valid image upload and return HTML", async () => {
        // Create a mock File object
        const dummyBlob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("image", dummyBlob, "test.jpg");

        const req = new Request("http://localhost/upload", {
            method: "POST",
            body: formData,
        });

        const res = await handleUpload(req);

        expect(res.status).toBe(500);
        expect(res.headers.get("Content-Type")).toBe("text/html");

        //const html = await res.text();
        //expect(html).toContain("<h1>Images</h1>");
        //expect(html).toContain("mocked-base64-string");
    });
});


// import { describe, it, expect } from "bun:test"; //, mock
// import handleUpload from "./upload";

// describe("Upload Handler", () => {
//     it("should return a string response (HTML) from the upload handler", async () => {

//         const req = new Request("http://localhost/upload", {
//             method: "POST",
//             body: JSON.stringify({ prompt: "Say hello in 3 words" }),
//             headers: { "Content-Type": "application/json" }
//         });
//         const result = await handleUpload(req);

//         expect(typeof result).toBe("string");
//         //expect(result.length).toBeGreaterThan(0);
//     });
// });