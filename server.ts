//import { serve } from "bun";
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { readdir, mkdir } from "node:fs/promises";
import { Glob } from "bun";
import { Auth } from "./auth";
import { S3Client,s3 } from "bun";
import handleUpload from './handlers/upload';
import askGemini, { analyseGeminiBase64,askGeminiImageQuestion } from './services/ask_gemini';
import testHashAndVerifyUserWithBackend from './services/security';
import verifyUserWithBackend from './handlers/verify'
import registrationForm from "./pages/form.html" with { type: "text" };
import newclientForm from "./pages/newclient.html" with { type: "text" };
import testformPage from "./pages/testform.html" with { type: "text" };
import profilePage from "./pages/profile.html" with { type: "text" };
import googletokenPage from "./pages/googletoken.html" with { type: "text" };
import signinPage from "./pages/signin.html" with { type: "text" };
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(CLIENT_ID);

const IMAGES_DIR = "./images";
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";
const RECT1_PNG = "./images/rect1.png";

const apiBaseUrl = process.env.services__apiservice__http__1;
const googleTokenPageText = await Bun.file("./pages/googletoken.html").text();

(async function main() {
    // Ensure required directories exist on startup
    await mkdir(IMAGES_DIR, { recursive: true });
    await mkdir(UPLOAD_DIR, { recursive: true });
    await mkdir(THUMB_DIR, { recursive: true });

    const theArgs = Bun.argv.slice(1);
    console.log("Mains params:", theArgs);

    // 
    const hashrunArg = theArgs.find(arg => arg.startsWith("--hashtest="));
    let isHashrun: boolean = false;
    if (hashrunArg) {
        const runHashTest = hashrunArg.split("=")[1];  

        if (runHashTest === "true") {
            testHashAndVerifyUserWithBackend('abc');
            process.exitCode = 0;
            return;
        }
    }

    const port = Number(Bun.env.PORT ?? 3000);
    const apiKey = Bun.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable.");
    }

    const ai = new GoogleGenAI();

        const corsHeaders = {
        "Access-Control-Allow-Origin": "*", // Change to specific origin in production, e.g., "http://127.0.0.1:5500"
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };


    interface IUserProfile {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
}

    const UserProfile: IUserProfile = {
        firstName: "Mark",
        lastName: "Doe",
        email: "john.doe@mail.com",
        username: "johndoe99"
    };


    const server = Bun.serve({
        port,
        async fetch(req) {
            try {
                const url = new URL(req.url);
                const cookieHeader = req.headers.get("Cookie") || "";
                const cookies = Object.fromEntries(
                    cookieHeader.split("; ").map(c => c.split("="))
                );
                const jwtCookie = cookies["auth_token"];

                /*
                if (req.method === "OPTIONS") {
                   return new Response(null, { headers: corsHeaders });
                } */
                
                if (url.pathname === "/auth/callback") {
                    const code = url.searchParams.get("code");
                    const error = url.searchParams.get("error");
                    
                    verifyUserWithBackend(code || '');

                    if (error) {
                        return new Response(`Google Auth Error: ${error}`, { status: 400 });
                    }
                    if (!code) {
                        return new Response("Missing authorization code from Google.", { status: 400 });
                    }
                }

                if (url.pathname === "/profile") {
                    console.error('profile handling');
                     if (!jwtCookie) {
                        return new Response("Unauthorized: No session found", { status: 401 });
                    }
                    const session = await Auth.verifyToken(jwtCookie);
                    if (!session) {
                        return new Response("Unauthorized: Invalid or expired token", { status: 401 });
                    } 
                    return new Response(
                        JSON.stringify({
                            message: "Welcome to your secure profile!",
                            verifiedGoogleSub: session.googleSub,
                            userEmail: session.email
                        }, null, 2),
                        { headers: { "Content-Type": "application/json" } }
                    );
                }

                if (req.method === 'POST') {
                    switch (url.pathname) {
                        case '/uploadnew':
                            return await handleUpload(req);
                        case '/submit_form':
                            return new Response("submit_form", { headers: { "Content-Type": "text/html" } });
                        case '/submit_newclient':
                            return new Response("submit_newclient", { headers: { "Content-Type": "text/html" } });
                        case '/signin':
                            return new Response(String(signinPage), { headers: { "Content-Type": "text/html" } });
                        case '/api/auth/google':
                            try {
                                const body = await req.json();
                                const { credential } = body;

                                // Verify the token cryptographically
                                const ticket = await client.verifyIdToken({
                                    idToken: credential,
                                    audience: CLIENT_ID,  // Must match your app's client ID
                                });

                                const payload = ticket.getPayload();
                                if (!payload) {
                                    return Response.json({ error: "Invalid token payload" });
                                }
                                const userid = payload?.sub;
                                const email = payload?.email;
                                const name = payload?.name;
                                const picture = payload?.picture;

                                console.log(`Successfully verified user: ${email} (${name})`);

                                const cookieOptions = [
                                `session_token=${encodeURIComponent(JSON.stringify(payload))}`,
                                'HttpOnly',                                    // 🔒 Blocks JS XSS attacks
                                'Path=/',                                      // 🌐 Valid across entire site
                                'SameSite=Lax',                                // 🛡️ Mitigates CSRF requests
                                `Max-Age=${24 * 60 * 60}`,                      // ⏳ Lifespan: 24 hours (in seconds)
                                process.env.NODE_ENV === 'production' ? 'Secure' : '' // 🛰️ HTTPS only in prod
                                ].filter(Boolean).join('; ');
                                
                                // TODO: Create a session, set a secure HTTP-only cookie, or issue your own JWT here
                                return new Response(JSON.stringify({ message: "Login successful" }), {
                                status: 200,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Set-Cookie': cookieOptions // 👈 This is how Bun injects the cookie
                                }
                                });
                                
                            } catch (error) {
                                console.error("Token verification failed:", error);
                                return Response.json({ success: false, error: "Invalid Google token" }, { status: 401 });
                            }
                            /*
                            const body = await req.json();
                            const { credential } = body;
                            console.log("Received Google credential:", credential);
                            return Response.json({ success: true, message: "Authenticated successfully" });
                            */
                        default:
                            return new Response('Not Found', { status: 404 });
                    }
                } 
                
                if (req.method === 'GET') {
                    switch (url.pathname) {
                        case '/': {
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
                            const fileArrayData2 = Bun.file("rect2.png");
                            if (await fileArrayData2.exists()) {
                                const image2 = new Bun.Image(await fileArrayData2.arrayBuffer());
                                res = await askGeminiImageQuestion(ai, "Analyse image, descibe it's form and size: width and height in pixels; [x px] and [y px] and what it contains", image2) ?? "No analysis";
                            }
                            
                            return new Response(bodyContent + "<br/> Analyse image, descibe it's form and size: width and height in pixels; [x px] and [y px] and what it contains. <br/>" + res, {
                                headers: { "Content-Type": "text/html" },
                            });
                        }
                        case '/testform':
                            return new Response(String(testformPage), { headers: { "Content-Type": "text/html" } });
                        case '/newclient':
                            return new Response(String(newclientForm), { headers: { "Content-Type": "text/html" } });
                        case '/signin':
                            return new Response(String(signinPage), { headers: { "Content-Type": "text/html" } });
                        case '/profilepage':
                            return new Response(String(profilePage), { headers: { "Content-Type": "text/html" } });
                        case '/api/data':
                            return Response.json({ UserProfile
                                //message: "Data fetched dynamically from Bun API!",
                                //items: ["Item 1", "Item 2", "Item 3"]
                            });
                        case '/googletoken': {
                            const clientID = Bun.env.GOOGLE_CLIENT_ID || "";
                            const sport = Bun.env.PORT || "";
                            const renderedHtml = googleTokenPageText.replace("__GOOGLE_CLIENT_ID__", clientID).replace("__PORT__", sport);
                            return new Response(renderedHtml, { headers: { "Content-Type": "text/html" } });
                        }
                        case '/testupload': {
                            const fileData = Bun.file("rect2.png");
                            const blob = new Blob([await fileData.arrayBuffer()], { type: fileData.type });
                            const formData = new FormData();
                            formData.append("image", blob, "test.jpg");

                            const reqMock = new Request("http://localhost/upload", {
                                method: "POST",
                                body: formData,
                            });

                            const response = await handleUpload(reqMock);
                            return new Response(response.body, {
                                headers: { "Content-Type": response.headers.get("content-type") ?? "text/html" },
                            });
                        }
                        default:
                            return new Response('Not Found', { status: 404 });
                    }
                }

                return new Response('Not Found', { status: 404 });
            } catch (err) {
                console.error("Server error:", err);
                return new Response(`Internal Server Error: ${err}`, { status: 500 });
            }
        },
    });
    console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});