
const apiBaseUrl = process.env.services__apiservice__http__1;

export async function verifyUserWithBackend(googleSub: string) {

    console.log(`API Base URL: ${apiBaseUrl}`);
    
    const response = await fetch(`${apiBaseUrl}/api/auth/verify-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleSub: googleSub })
    });

    const data = await response.json();

    console.log(`response.json(): ${data}`);

    return data;
}