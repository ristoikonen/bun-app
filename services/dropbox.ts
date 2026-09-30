// services/dropbox.ts
const APP_KEY = Bun.env.DROPBOX_APP_KEY;
const APP_SECRET = Bun.env.DROPBOX_APP_SECRET;
const REFRESH_TOKEN = Bun.env.DROPBOX_REFRESH_TOKEN;

async function getValidAccessToken(): Promise<string> {
  // 1. Diagnostic Visibility Check
  console.log("🔍 [DIAGNOSTIC CHECKSUM]:", {
    APP_KEY_LEN: APP_KEY ? APP_KEY.trim().length : 0,
    APP_SECRET_LEN: APP_SECRET ? APP_SECRET.trim().length : 0,
    REFRESH_TOKEN_PREFIX: REFRESH_TOKEN ? REFRESH_TOKEN.trim().substring(0, 5) : "NONE",
    REFRESH_TOKEN_LEN: REFRESH_TOKEN ? REFRESH_TOKEN.trim().length : 0
  });

  if (!APP_KEY || !APP_SECRET || !REFRESH_TOKEN) {
    throw new Error("CRITICAL: Missing environment variables in your .env file!");
  }

  const tokenUrl = "https://dropboxapi.com";
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", REFRESH_TOKEN.trim());
  params.append("client_id", APP_KEY.trim());
  params.append("client_secret", APP_SECRET.trim());

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: params
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(`[STAGE 1A - DROPBOX REJECTED CREDENTIALS]: ${rawBody}`);
  }

  try {
    const data = JSON.parse(rawBody);
    return data.access_token;
  } catch (jsonErr) {
    throw new Error(`[STAGE 1B - PARSE FAILURE]: Could not parse response as JSON. Body snippet: "${rawBody.substring(0, 150)}"`);
  }
}

export default async function uploadToDropbox(fileName: string, fileContent: string) {
  try {
    console.log("🔄 Fetching active access token...");
    const activeToken = await getValidAccessToken();
    
    console.log("📤 Sending file payload to Dropbox content servers...");
    const uploadUrl = "https://dropboxapi.com";
    
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeToken.trim()}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: `/${fileName.trim().replace(/^\/+/, "")}`,
          mode: "overwrite",
          mute: false
        }),
        "Content-Type": "application/octet-stream"
      },
      body: fileContent
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[STAGE 2 - UPLOAD REJECTED]: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Upload successful:", data);

  } catch (error: any) {
    console.error("❌ Process halted:", error.message || error);
  }
}

// Run test immediately
uploadToDropbox("test.txt", "Automated debugging run");
