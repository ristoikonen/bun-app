//import { serve } from "bun";
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { readdir } from "node:fs/promises";
import { Glob } from "bun";
import { Auth } from "./auth";
import { S3Client,s3 } from "bun";// "@aws-sdk/client-s3";
import handleUpload from './handlers/upload';
import askGemini, { analyseGeminiBase64,askGeminiImageQuestion } from './services/ask_gemini';
import testHashAndVerifyUserWithBackend from './services/security';
import verifyUserWithBackend from './handlers/verify'
import registrationForm from "./pages/form.html" with { type: "text" };
import newclientForm from "./pages/newclient.html" with { type: "text" };
import testformPage from "./pages/testform.html" with { type: "text" };
import googletokenPage from "./pages/googletoken.html" with { type: "text" };
const IMAGES_DIR = "./images";
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";
const RECT1_PNG = "./images/rect1.png";

const apiBaseUrl = process.env.services__apiservice__http__1;
const googleTokenPageText = await Bun.file("./pages/googletoken.html").text();

(async function main() {
    const theArgs = Bun.argv.slice(1);
    console.log("Mains params:", theArgs);

    // Testing hashing with sub key
    const hashrunArg = theArgs.find(arg => arg.startsWith("--hashtest="));
    
    let isHashrun: boolean = false;
    if (hashrunArg) {
        const runHashTest = hashrunArg.split("=")[1];  
        isHashrun = runHashTest === "true"; 
    }
    if(isHashrun)
    {
        
        testHashAndVerifyUserWithBackend('abc');
        process.exitCode = 0;
        return;
    }

    const port = Number(Bun.env.PORT ?? 3000);

    const files = await readdir(IMAGES_DIR);
    //console.log(`API Base URL: ${apiBaseUrl}`);
    const apiKey = Bun.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable.");
    }

    const ai = new GoogleGenAI();//{ apiKey: apiKey });

    //const prompt = "which model are you?";
    //const myHeaders = new Headers();
    //myHeaders.append("Content-Type", "application/json");
    //myHeaders.append("x-goog-api-key", apiKey); 


    //WORKS WHEN S3 CREADENTIALS ARE INJECT PLACE IN ENVIRONMENT VARIABLES:ACCESS_KEY_ID, SECRET_ACCESS_KEY, S3_ENDPOINT, S3_BUCKET
    /*
    const files3 = s3.file("readme.txt");
    console.log(files3.name);
    const textdata = await files3.text();
    console.log(textdata || "No text data"); 
    */

    /*
    const readmelink = client.presign("my-file", {
        expiresIn: 3600, // 1 hour
        method: "PUT",
        type: "application/json", // Sets response-content-type in the presigned URL
    });
    */

    /*
    if (await Bun.s3.exists("readme.txt")) {
        console.log("File already exists!");
    } else {
        console.log("File does not exist. Creating it now...");
        await Bun.s3.write("readme.txt", "It works! Connected successfully.");
    }
    
    console.log("✅ Upload complete!");

    // Verify by downloading it back
    const fileContent = await Bun.s3.file("readme.txt").text();
    console.log("📄 Content inside S3 file:", fileContent);
    */
    

    // EO S3 ---------

    const imagesfilenames: Array<string> = [];

    const glob = new Glob("*");
    for (const file of glob.scanSync(IMAGES_DIR)) {
        console.log(file);
        console.log('glob');
        imagesfilenames.push(IMAGES_DIR + "/" + file);
    }
    
    //const color1 = Bun.color([255, 99, 71, 255])
    //const { width, height, format } = await new Bun.Image(imageFile).metadata();

    const bunimages: Array<Bun.Image> = [];
    const fileArrayData = Bun.file(RECT1_PNG);
    const image1 = new Bun.Image(await fileArrayData.arrayBuffer());
    const base64String = await image1.toBase64();

    //const yn_answer =  await analyseGeminiBase64(ai, "Is this image a rectagle? Answer with just one word: Yes/No..", image1);
    //console.log("Gemini answer server.ts:" + yn_answer);

    let images = "";
    const imageHTML = `<img src="data:image/png;base64,${base64String}" alt="Inlined Image" />`;

    // Avoid putting GoogleGenAI initialization 
    // or direct API calls directly inside your route handlers.
    // If you change frameworks later(e.g., moving from Bun's native server to Hono or Express), keeping services isolated means you won't have to rewrite your Gemini logic.

    for (const file of imagesfilenames) {

        const fileData = Bun.file(file);
        const ima = new Bun.Image(await fileData.arrayBuffer());
        bunimages.push(ima);
        //const lqip = await Bun.file("hero.jpg").image().placeholder();
        //const constb64 = await ima?.toBase64();
        //images += `<img src=${lqip} />`;
        //images += `<img src="data:image/png;base64,${constb64}" alt="${file}" />`;
    }

    const countimages = bunimages.length;

    if (bunimages.length > 0) {

        for (const image of bunimages) {

            //const du = image.webp;
            //images += du;
            const lqip = await image.placeholder();
            images += `<img src="${lqip}" />`;
        }
    }

    const body = countimages.toString() + " images found in the images folder."
        + imageHTML + images;

    const server = Bun.serve({
        port,
        async fetch(req) {
                        
            const url = new URL(req.url);
            //console.log(`Request URL:${url.toString()}`);


            // Parse existing cookies from the request headers
            const cookieHeader = req.headers.get("Cookie") || "";
            const cookies = Object.fromEntries(
                cookieHeader.split("; ").map(c => c.split("="))
            );
            const jwtCookie = cookies["auth_token"];

            //TODO: TEST THIS!
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

            //TODO: Profile page
            if (url.pathname === "/profile") {

                console.error('profile handling');

                if (!jwtCookie) {
                    return new Response("Unauthorized: No session found", { status: 401 });
                }

                // Cryptographically verify that the user didn't modify their identity
                const session = await Auth.verifyToken(jwtCookie);

                if (!session) {
                    return new Response("Unauthorized: Invalid or expired token", { status: 401 });
                }

                // The signature is verified. It is now 100% safe to read the Google sub ID.
                return new Response(
                    JSON.stringify({
                        message: "Welcome to your secure profile!",
                        verifiedGoogleSub: session.googleSub,
                        userEmail: session.email
                    }, null, 2),
                    { headers: { "Content-Type": "application/json" } }
                );
            }

            switch (req.method) {
                case 'POST':
                    switch (url.pathname) {

                        case '/uploadnew':
                            return await handleUpload(req);
                        case '/submit_form':
                            return new Response("submit_form", {
                                headers: { "Content-Type": "text/html" },
                            });
                        case '/submit_form':
                            return new Response("submit_newclient", {
                                headers: { "Content-Type": "text/html" },
                            });
                        case '/api/auth/google':
                            const body = await req.json();
                            const { credential } = body; // This is the Google token from the front
                            console.log("Received Google credential:", credential);
                            return Response.json({ success: true, message: "Authenticated successfully" });

                            //return new Response("submit_newclient", {
                            //    headers: { "Content-Type": "text/html" },
                            //});
                    }
                     return new Response('Not Found', { status: 404  })
                case 'GET':
                    switch (url.pathname) {

                        case '/':

                            //await askGemini(ai, "Explain what is in this HTML page:" + body);
                            
                            const fileArrayData2 = Bun.file("rect2.png");
                            const image2 = new Bun.Image(await fileArrayData2.arrayBuffer());
                            var res = await askGeminiImageQuestion(ai,"Analyse image, descibe it's form and size: width and height in pixels; [x px] and [y px] and what it contains",image2) ?? "No analysis";
                            //TODO: clean up!
                            return new Response(body  + "<br/> Analyse image, descibe it's form and size: width and height in pixels; [x px] and [y px] and what it contains. <br/>" 
                                + res, {
                                headers: { "Content-Type": "text/html" },
                            });
                            /* 
                            return new Response(body, {
                                headers: { "Content-Type": "text/html" },
                            });
                            */

                            case '/testform':
                                return new Response(String(testformPage), {
                                    headers: { "Content-Type": "text/html" },
                                });

                            case '/submit_form':
                                return new Response(String(registrationForm), {
                                    headers: { "Content-Type": "text/html" },
                                });
                            
                            case '/newclient':
                                return new Response(String(newclientForm), {
                                    headers: { "Content-Type": "text/html" },
                                });
                            case '/googletoken':
                                //set replacement variabes
                                const clientID = Bun.env.GOOGLE_CLIENT_ID || "";
                                const sport = Bun.env.port || "";
                                const renderedHtml = googleTokenPageText.replace("__GOOGLE_CLIENT_ID__", clientID).replace("__PORT__", sport);
                                return new Response(renderedHtml, {
                                    headers: { "Content-Type": "text/html" },
                                });
                            case '/testupload':

                                const fileData = Bun.file("rect2.png");
                                const blob = new Blob([await fileData.arrayBuffer()], { type: fileData.type });
                                const formData = new FormData();
                                formData.append("image", blob, "test.jpg");

                                const req = new Request("http://localhost/upload", {
                                    method: "POST",
                                    body: formData,
                                });

                                const response = await handleUpload(req);
                                return new Response(response.body, {
                                    headers: { "Content-Type": response.headers.get("content-type") ?? "text/html" },
                                });
                    }
                    return new Response('Not Found', { status: 404  })
                default:
                    return new Response('Not Found', {
                        status: 404
                    })
            }
        },
    });
    console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
})().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

