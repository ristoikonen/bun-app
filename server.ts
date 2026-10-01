import { GoogleGenAI } from '@google/genai';
import { mkdir } from "node:fs/promises";
import { Glob,  BunRequest} from "bun";
import { Auth } from "./auth";
import { OAuth2Client } from 'google-auth-library';

import {IGlowData,IGoogleUserProfile} from './types';
import { mockGlowsDb } from './utils/mocks';
import { errorJSONResponseCORS, successJSONResponseCORS,errorJSONResponse, successJSONResponse } from "./utils/response";
import askGemini, { analyseGeminiBase64, askGeminiImageQuestion } from './services/ask_gemini';
import {getGoogleUserProfileFromCookie} from './services/cookie';
import { GeoService } from "./services/geoservice";
import { SecurityInspector } from "./services/security";
import { GoogleAuthService } from "./services/googleauth";

import handleGlowPost from "./handlers/glowdata";
import handleUpload from './handlers/upload';
import verifyUserWithBackend, { verifyIdToken } from './handlers/verify';
import newclientForm from "./pages/chattish.html" with { type: "text" };
import chattishPage from "./pages/chattish.html" with { type: "text" };
import testformPage from "./pages/testform.html" with { type: "text" };
import profilePage from "./pages/profile.html" with { type: "text" };
import baseimagePage from "./pages/baseimage.html" with { type: "text" };
import glowPage from "./pages/glow.html" with { type: "text" };
import glow2Page from "./pages/glow2.html" with { type: "text" };
import glowdarkPage from "./pages/glowdark.html" with { type: "text" };
//import googletokenPage from "./pages/googletoken.html" with { type: "text" };
import signinPage from "./pages/signin.html" with { type: "text" };


const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(CLIENT_ID);
const allowedOrigin = Bun.env.ALLOWED_ORIGIN || "http://127.0.0.1:5500";

const IMAGES_DIR = "./images";
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";
const RECT1_PNG = "./images/rect1.png";
const RECT2_PNG = "./images/rect2.png";

const googleTokenPageText = await Bun.file("./pages/googletoken.html").text();
const apiBaseUrl = process.env.services__apiservice__http__1;
const geoService = new GeoService();
const securityInspector = new SecurityInspector();
const googleAuth = new GoogleAuthService();

const floaterFile = await Bun.file("./uiservices/floater.html");
const floaterHtml = (await floaterFile.exists()) ? await floaterFile.text() : "";
const glowPageString = String(glowPage ?? '').replaceAll("__FLOATER__", floaterHtml);
const glow2PageString = String(glow2Page ?? '').replaceAll("__FLOATER__", floaterHtml);
const glowdarkPageString = String(glowdarkPage).replaceAll("__FLOATER__", floaterHtml);


//const floathtml = await Bun.file("./uiservices/floater.html").text();
//floathtml = floathtml.replaceAll("__FLOATER__", floaterHtml);
//const floaterFile = Bun.file("./uiservices/floater.html");
//glowPage = glowPage.replaceAll("__FLOATER__", floaterHtml);


export async function handleGlowUpload(req: Request, saveFile: boolean = false): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }
    try {
        let body: any = {};
        try {
            body = await req.json();
        } catch (e) {
            // Fallback if request body is empty or not JSON
            body = {};
        }

        //console.log("Received glow upload payload:", body);
        //console.log("saveFile flag:", saveFile);

        //TODO: remove in PROD -  If saveFile is true, save it to disk using Bun.write for debug
        if (saveFile && body.locale) {
            await Bun.write(`./data/${body.locale}.json`, JSON.stringify(body, null, 2));
        }

        //NOTE: CORS headers enabled
        return Response.json({
            success: true,
            received: body,
            saveFileApplied: saveFile,
            placeholder: `/upload/placeholder`,
            thumbnail: `/upload/thumbnail`,
        }, {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json"
            }
        });
    }
    catch (error) {
        console.error("Error handling upload:", error);
        return new Response("Internal Server Error", { 
            status: 500, 
            headers: { 
                "Access-Control-Allow-Origin": allowedOrigin,
                "Content-Type": "text/html" 
            } 
        });
    }
};


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
            "/api/glow": {
                //TODO: use handleGlowUpload file save feature before db? Perhaps a choice/optionally data goes to to db/file?
                POST: async (req) => await handleGlowPost(req)
                // POST: async (req) => await handleGlowUpload(req)
            },

// glows route handler block

// GET /api/glows -> Handles list lookups and optional parameters

    "/api/glows": {
      async GET(req) {
        const url = new URL(req.url);
        const localeFilter = url.searchParams.get("locale");
        const emailFilter = url.searchParams.get("email");

        let results = [...mockGlowsDb];

        if (localeFilter) {
          results = results.filter(g => g.locale.toLowerCase() === localeFilter.toLowerCase());
        }
        if (emailFilter) {
          results = results.filter(g => g.user_email.toLowerCase() === emailFilter.toLowerCase());
        }

        return successJSONResponse(results);
      },

      // POST /api/glows -> Creates a new localized data object
      async POST(req) {
        try {
          const body = await req.json();
          if (!body.message || !body.locale || !body.user_email) {
            return errorJSONResponse("Missing required payload attributes", 400);
          }

          const newGlow: IGlowData = {
            //id: crypto.randomUUID(),
            message: body.message,
            locale: body.locale,
            user_email: body.user_email,
            timestamp: new Date().toISOString() // Server-enforced timestamp
          };

          mockGlowsDb.push(newGlow);
          return successJSONResponse(newGlow, 201);
        } catch {
          return errorJSONResponse("Malformed payload body syntax", 400);
        }
      }
    },

    // glow  - Dynamic route handler targeting an item resource by explicit identifier

    "/api/glows/:user_email": {
      // GET /api/glows/:user_email -> Retrieves a specific record
      async GET(req) {
        const id = req.params.user_email; // Natively extracted from path key signature
        const glow = mockGlowsDb.find(g => g.user_email === id);
        if (!glow) return errorJSONResponse("Resource item not located" , 404);
        return successJSONResponse(glow);
      },

      // PATCH /api/glows/:id -> Mutates specific parameters on the object
      async PATCH(req) {
        try {
          const user_email = req.params.user_email;
          const body = await req.json();
          const targetIndex = mockGlowsDb.findIndex(g => g.user_email === user_email);
          
          if (targetIndex === -1) return errorJSONResponse("Resource item not located", 404);

          mockGlowsDb[targetIndex] = {
            ...mockGlowsDb[targetIndex],
            ...body
          };

          return successJSONResponse(mockGlowsDb[targetIndex]);
        } catch {
          return errorJSONResponse("Malformed payload body syntax" , 400);
        }
      },

      // DELETE /api/glows/:id -> Removes the resource item
      async DELETE(req) {
        const user_email = req.params.user_email;
        const targetIndex = mockGlowsDb.findIndex(g => g.user_email === user_email);
        
        if (targetIndex === -1) return errorJSONResponse("Resource item not located" , 404);

        mockGlowsDb.splice(targetIndex, 1);
        return successJSONResponse(`Glow user email ${user_email} unlinked successfully.`);
      }
    },


// EO glows route handler block

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
                            
                            const payload: IGlowData = {
                                message: 'Estim round 10',
                                locale: 'Palm',
                                timestamp: new Date().toLocaleTimeString('en-AU'),
                                user_email: '',
                                /*
                                nodes: {
                                    nodeA: { status: states[Math.floor(Math.random() * states.length)] },
                                    nodeB: { status: states[Math.floor(Math.random() * states.length)] }
                                }
                                */
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
                        headers: { "Content-Type": "text/html" } ,
                        //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" },
                    });
                }
            },
            "/testform": {
                GET: () => new Response(String(testformPage), { headers: { "Content-Type": "text/html" } }) //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/newclient": {
                GET: () => new Response(String(newclientForm), { headers: { "Content-Type": "text/html" } }) //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },

            //"/profilepage": {
            //    GET: () => new Response(String(profilePage), { headers: { "Content-Type": "text/html" } }) //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            //},

            "/profile": {
                GET: () => new Response(String(profilePage), { headers: { "Content-Type": "text/html" } }) //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/chattish": {
                //GET: () => new Response(chattishPageString ?? '', { headers: { "Content-Type": "text/html" } }) 
                GET: () => new Response(String(chattishPage), { headers: { "Content-Type": "text/html" } })
            },            
            "/glow": {
                
                GET: () => new Response(glowPageString ?? '', { headers: { "Content-Type": "text/html" } }) 
                //GET: () => new Response(String(glowPage), { headers: { "Content-Type": "text/html" } }) //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/glow2": {
                GET: () => new Response(glow2PageString ?? '', { headers: { "Content-Type": "text/html" } }) 
                // GET: () => new Response(String(glow2Page), { headers: { "Content-Type": "text/html" } })  //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/glowdark": {
                GET: () => new Response(glowdarkPageString, { headers: { "Content-Type": "text/html" } })  //headers: { "Content-Type": "text/html", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" } })
            },
            "/api/data": {
                // Serves user data to profile -page
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
                        return errorJSONResponse("Invalid token", 400);
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
                        //return Response.json({ error: "User not found" }, { status: 404 });
                        return errorJSONResponse("User not found" , 404);

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
                    //TODO: All file data to init  - move up!
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
            },
            "/api/client-geocontext": {
            GET: async (req) => {
                const clientGeo = await geoService.getGeoProfile(req);

                return Response.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    clientContext: clientGeo
                });
            }
            },
            "/api/client-securitycontext": {
                GET: async (req) => {

                    const clientGeo = await geoService.getGeoProfile(req);
                    const securityContext = securityInspector.inspect(req);

                    return Response.json({
                        success: true,
                        timestamp: new Date().toISOString(),
                        security: {
                            authenticated: securityContext.isAuthenticated,
                            type: securityContext.tokenType,
                            hasCsrf: Boolean(securityContext.csrfToken),
                        },
                        clientContext: clientGeo,
                    });
                },
                POST: async (req) => {
                    const securityContext = securityInspector.inspect(req);

                    // Optional: Validate Anti-CSRF token for state-changing POST requests
                    const csrfHeader = req.headers.get("x-csrf-token");
                    if (securityContext.csrfToken && csrfHeader !== securityContext.csrfToken) {
                        return Response.json({ error: "Invalid CSRF Token" }, { status: 403 });
                    }

                    const body = await req.json().catch(() => ({}));

                    return Response.json({
                        success: true,
                        message: "POST action processed securely",
                        receivedData: body,
                    });
                }
            },"/api/user-session": {
                POST: async (req) => {
                    
                    const body = await req.json().catch(() => ({}));
                    const { idToken, anonymousId } = body;

                    const clientGeo = await geoService.getGeoProfile(req);

                    // Verify Google Login Token if provided
                    let googleUser = null;
                    if (idToken) {
                        googleUser = await googleAuth.verifyIdToken(idToken);
                    }

                    /*
                    try {
                        const stmt = db.prepare(`
                            INSERT INTO audit_logs (anonymous_id, google_email, ip_address, city, region, timestamp)
                            VALUES (?, ?, ?, ?, ?, datetime('now'))
                        `);
                        stmt.run(
                            anonymousId || "anonymous",
                            googleUser ? googleUser.email : "unauthenticated",
                            clientGeo.ip,
                            clientGeo.city,
                            clientGeo.region
                        );
                    } catch (dbErr) {
                        console.error("Failed to write audit log:", dbErr);
                    }
                    */
                    return Response.json({
                        success: true,
                        authenticated: Boolean(googleUser),
                        user: googleUser ? {
                            email: googleUser.email,
                            name: googleUser.name,
                            picture: googleUser.picture,
                            domain: googleUser.hd
                        } : null,
                        clientGeo
                    });
                }
            }
    
        },
        // ultimate fallback
        //fetch() {
        //     return new Response('Not Found'); 
                        //Response("Not Found", { status: 404 });
        //},
    });

    console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});