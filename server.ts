import { GoogleGenAI } from '@google/genai';
import { mkdir } from "node:fs/promises";
import { Glob,  BunRequest} from "bun";
import { Auth } from "./auth";
import askGemini, { analyseGeminiBase64, askGeminiImageQuestion } from './services/ask_gemini';

import {getGoogleUserProfileFromCookie} from './services/cookie';
import handleUpload from './handlers/upload';
import verifyUserWithBackend, { verifyIdToken } from './handlers/verify';
import registrationForm from "./pages/form.html" with { type: "text" };
import newclientForm from "./pages/newclient.html" with { type: "text" };
import testformPage from "./pages/testform.html" with { type: "text" };
import profilePage from "./pages/profile.html" with { type: "text" };
import baseimagePage from "./pages/baseimage.html" with { type: "text" };
import glowPage from "./pages/glow.html" with { type: "text" };
import glowspotPage from "./pages/glowspot.html" with { type: "text" };

import googletokenPage from "./pages/googletoken.html" with { type: "text" };
import signinPage from "./pages/signin.html" with { type: "text" };
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(CLIENT_ID);

const IMAGES_DIR = "./images";
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";
const RECT1_PNG = "./images/rect1.png";
const RECT2_PNG = "./images/rect2.png";


const apiBaseUrl = process.env.services__apiservice__http__1;
const googleTokenPageText = await Bun.file("./pages/googletoken.html").text();

(async function main() {
    await mkdir(IMAGES_DIR, { recursive: true });
    await mkdir(UPLOAD_DIR, { recursive: true });
    await mkdir(THUMB_DIR, { recursive: true });

    const port = Number(Bun.env.APP_PORT ?? 3000);
    const host = Bun.env.APP_HOST ?? "localhost";
    const apiKey = Bun.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    const ai = new GoogleGenAI();


    // Incoming req object is a BunRequest
    const server = Bun.serve({
        port,
        routes: {
            "/auth/callback": {
                GET: (req) => {
                    const url = new URL(req.url);
                    const code = url.searchParams.get("code");
                    const error = url.searchParams.get("error");
                    
                    verifyUserWithBackend(code || '');

                    if (error) {
                        return new Response(`Google Auth Error: ${error}`, { status: 400 });
                    }
                    if (!code) {
                        return new Response("Missing authorization code from Google.", { status: 400 });
                    }
                    return new Response("Authorization successful", { status: 200 });
                }
            },
            "/uploadnew": {
                POST: async (req) => await handleUpload(req)
            },
            "/submit_form": {
                POST: () => new Response("submit_form", { headers: { "Content-Type": "text/html" } })
            },
            "/submit_newclient": {
                POST: () => new Response("submit_newclient", { headers: { "Content-Type": "text/html" } })
            },
            "/baseimage": {
                GET: () => new Response(String(baseimagePage), { headers: { "Content-Type": "text/html" } })
            },



    "/api/stream" : {
        GET: (req) => {
      const stream = new ReadableStream({
        start(controller) {
          const intervalId = setInterval(() => {
            const states = ["healthy", "warning", "critical"];
            
            // Randomly rotate states for visualization testing
            const payload = {
              message: 'Estim round 10',
              locale: 'Palm',
              timestamp: new Date().toLocaleTimeString('en-AU'),
              nodes: {
                nodeA: { status: states[Math.floor(Math.random() * states.length)] },
                nodeB: { status: states[Math.floor(Math.random() * states.length)] }
              }
            };

            controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
          }, 5000);

          req.signal.addEventListener("abort", () => {
            clearInterval(intervalId);
          });
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    
  },




            "/upload": {
                POST: async (req: BunRequest) => {

                    try {
                        const url = new URL(req.url);
                        const variant = url.searchParams.get("variant");

                        // 1. Parse multipart/form-data
                        const formData = await req.formData();
                        const file = formData.get("image"); // Matches the input field name

                        if (!file || !(file instanceof File)) {
                            return new Response("No valid file uploaded", { status: 400 });
                        }

                        //TODO: If you need a placeholder
                        /*
                        return Response.json({
                            placeholder: `/upload/placeholder`,
                            thumbnail: `/upload/thumbnail`,
                            original: `/api/image/${imageId}?variant=original`,
                        });
                        const data = await response.json();
                        placeholderImage.src = data.placeholder;
                        thumbnailImage.src = data.thumbnail; /
                        */

                        if (variant === "placeholder") {
                            // img.jpeg({ progressive: true });
                            const placeholder = await file.image().placeholder();
                            return new Response(placeholder, {
                                headers: { "Content-Type": "image/png" },
                            });
                        }

                        const out = await file.image().resize(256).png().blob();
                    
                        const processedBytes = await file.image()
                            .png({ compressionLevel: 60 })
                            .bytes();

                        return new Response(out, {
                            headers: { "Content-Type": "image/png" },
                        });

                    } catch (error) {
                        return new Response("Error processing upload", { status: 500 });
                    }
                }
            },
            "/signin": {
                GET: () => {
                    const clientID = Bun.env.GOOGLE_CLIENT_ID || "";
                    const renderedHtml = String(signinPage).replace("__GOOGLE_CLIENT_ID__", clientID);
                    return new Response(renderedHtml, { headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } });

                //POST: () => new Response(String(signinPage), { headers: { "Content-Type": "text/html" } })
                }
            },
            "/api/auth/google": {
                POST: async (req: BunRequest) => {
                    try {
                        return await verifyIdToken(req, client);
                    } catch (error) {
                        console.error("Token verification failed:", error);
                        return Response.json({ success: false, error: "Invalid Google token" }, { status: 401 });
                    }
                }
            },
            "/": {
                GET: async (req: BunRequest) => {
                    const googleuserprofile = getGoogleUserProfileFromCookie(req, "session_token")
                    let userprofile ='';
                    if (googleuserprofile) {
                        userprofile = googleuserprofile?.name || '';
                    }
                    
                    const imagesfilenames: Array<string> = [];
                    const glob = new Glob("*");
                    for (const file of glob.scanSync(IMAGES_DIR)) {
                        imagesfilenames.push(IMAGES_DIR + "/" + file);
                    }
                    
                    const bunimages: Array<any> = [];
                    const fileArrayData = Bun.file(RECT1_PNG);
                    const image1 = new Bun.Image(await fileArrayData.arrayBuffer());
                    const base64String = await image1.toBase64();

                    let images = "";
                    const imageHTML = `<img src="data:image/png;base64,${base64String}" alt="Inlined Image" />`;

                    for (const file of imagesfilenames) {
                        const fileData = Bun.file(file);
                        const ima = new Bun.Image(await fileData.arrayBuffer());
                        bunimages.push(ima);
                    }

                    const countimages = bunimages.length;
                    if (bunimages.length > 0) {
                        for (const image of bunimages) {
                            const lqip = await image.placeholder();
                            images += `<img src="${lqip}" />`;
                        }
                    }

                    const bodyContent = countimages.toString() + " images found in the images folder." + imageHTML + images;
                    let res = "No analysis";
                    const fileArrayData2 = Bun.file(RECT2_PNG);
                    if (await fileArrayData2.exists()) {
                        const image2 = new Bun.Image(await fileArrayData2.arrayBuffer());
                        const byteSpan = new Uint8Array(await fileArrayData2.arrayBuffer());
                        //TODO add format check
                        res = await askGeminiImageQuestion(ai, "Analyse image, descibe it's form and size: width and height in pixels; [x px] and [y px] and what it contains", image2) ?? "No analysis";
                    }
                    
                    return new Response(userprofile + "<br/>" + bodyContent + "<br/> Analyse image, descibe it's form and size: width and height in pixels; [x px] and [y px] and what it contains. <br/>" + res, {
                        headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" },
                    });
                }
            },
            "/testform": {
                GET: () => new Response(String(testformPage), { headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/newclient": {
                GET: () => new Response(String(newclientForm), { headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/profilepage": {
                GET: () => new Response(String(profilePage), { headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/glow": {
                GET: () => new Response(String(glowPage), { headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/glowspot": {
                GET: () => new Response(String(glowspotPage), { headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/api/data": {
                // serves user data to profile -page!
                // TODO: Bake session_token data into UserProfile!
                
                GET: (req) => 
                {
                    try {
                        const googleuserprofile = getGoogleUserProfileFromCookie(req, "session_token")
                        if (!googleuserprofile) {
                            return Response.json({ error: "Unauthorized" }, { status: 401 });
                        }
                        return Response.json(googleuserprofile); 

                    } catch (error) {
                        console.error("Failed to parse session token:", error);
                        return Response.json({ error: "Invalid token" }, { status: 400 });
                    }
                }
            },

           "/api/users/:id": {

                GET: (req: BunRequest) => {
                  //return Response.json({ message: `Fetching user ${req.params.id}` });
                          
                    // Mock Database
                    const users = [
                        { id: '1', name: "Alice" },
                        { id: '2', name: "Bob" }
                    ];

                    const userIdStr = req.params.id; 
                    // const userId = Number(userIdStr); 
                    const user = users.find(u => u.id === userIdStr);
                    if (!user) {
                        return Response.json({ error: "User not found" }, { status: 404 });
                    }

                    return Response.json({ success: true, data: user }); 
                    },
            },
            "/googletoken": {
                GET: () => {
                    const clientID = Bun.env.GOOGLE_CLIENT_ID || "";
                    const sport = String(port) || "";
                    const renderedHtml = googleTokenPageText.replace("__GOOGLE_CLIENT_ID__", clientID).replace("__PORT__", sport);
                    return new Response(renderedHtml, { headers: { "Content-Type": "text/html" } });
                }
            },
            "/testupload": {
                GET: async () => {
                    const fileData = Bun.file(RECT2_PNG);
                    const blob = new Blob([await fileData.arrayBuffer()], { type: fileData.type });
                    const formData = new FormData();
                    formData.append("image", blob, "test.jpg");

                    const uri = `http://${Bun.env.APP_HOST}:${port}`;
                    const reqMock = new Request("http://localhost/upload", {
                        method: "POST",
                        body: formData,
                    });

                    const response = await handleUpload(reqMock);
                    return new Response(response.body, {
                        headers: { "Content-Type": response.headers.get("content-type") ?? "text/html" },
                    });
                }
            }
        },
        // fetch() {
        //     return new Response('Not Found'); //, { status: 404 }
        // },
    });

    console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});