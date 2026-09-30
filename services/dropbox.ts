const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";

// .trim() scrubs away hidden line breaks or white spaces from your .env file
const rawToken = Bun.env.DROPBOX_ACCESS_TOKEN;
const dropboxToken = rawToken ? rawToken.trim() : null;

if (!dropboxToken) {
  console.error("Error: DROPBOX_ACCESS_TOKEN is not set in your environment.");
  process.exit(1);
}

const APP_KEY = Bun.env.DROPBOX_APP_KEY;
const APP_SECRET = Bun.env.DROPBOX_APP_SECRET;
const REFRESH_TOKEN = Bun.env.DROPBOX_ACCESS_TOKEN;

// Helper function to dynamically grab a fresh, short-lived token
async function getValidAccessToken(): Promise<string> {
  if (!APP_KEY || !APP_SECRET || !REFRESH_TOKEN) {
    throw new Error("Missing Dropbox app credentials in environment variables.");
  }

  const response = await fetch("https://dropboxapi.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Alternative approach: some setups prefer parameters over Basic Auth headers
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN.trim(),
      client_id: APP_KEY.trim(),
      client_secret: APP_SECRET.trim()
    })
  });

  // CRITICAL SAFEGUARD: Catch why Dropbox is complaining before parsing JSON
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox API Authorization Rejected: ${errorText}`);
  }

  const data = await response.json();
  console.log(data);
  return data.access_token;
}


export default async function uploadToDropbox(fileName: string, fileContent: string) {
  try {
    const activeToken = await getValidAccessToken();
    const targetUrl = "https://dropboxapi.com";

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeToken}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: `/${fileName.trim()}`,
          mode: "overwrite",
          mute: false
        }),
        "Content-Type": "application/octet-stream"
      },
      body: fileContent
    });

    // 1. CRITICAL PROTECTION: Catch server rejections BEFORE parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dropbox API Upload Rejected: ${errorText}`);
    }

    // 2. Only parse JSON once we know the server returned a 200 OK success
    const data = await response.json();
    console.log("✅ Upload successful:", data);
  } catch (error: any) {
    console.error("❌ Process halted:", error.message || error);
  }
}




export  async function uploadToDropbox2(fileName: string, fileContent: string) {
  try {
    // Dynamically fetch a valid token right before the upload
    const activeToken = await getValidAccessToken();
    const targetUrl = "https://dropboxapi.com";

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeToken}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: `/${fileName.trim()}`,
          mode: "overwrite",
          mute: false
        }),
        "Content-Type": "application/octet-stream"
      },
      body: fileContent
    });

    // Safeguard: Check if Dropbox returned an error before trying to parse JSON
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dropbox API Server returned error: ${errorText}`);
    }

    const data = await response.json();
    console.log(" Upload successful:", data);
  } catch (error: any) {
    console.error(" Process halted:", error.message || error);
  }
}

// Run test
uploadToDropbox("test.txt", "ok");




export  async function uploadToDropboxOld(fileName: string, fileContent: string) {
  try {
    // Explicitly assigning a clean string literal to ensure zero parsing conflicts
    const targetUrl = "https://dropboxapi.com";

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${dropboxToken}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: `/${fileName.trim()}`,
          mode: "overwrite",
          mute: false
        }),
        "Content-Type": "application/octet-stream"
      },
      body: fileContent
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dropbox API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log("Upload successful:", data);
  } catch (error: any) {
    // Enhanced error reporting to see exactly what failed
    console.error("Upload failed details:", error.message || error);
  }
}


//uploadToDropboxOld("test.txt", "some text");
