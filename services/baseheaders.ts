import bun, { connect } from "bun";

const TARGET_HOST = bun.env.APP_HOST || "localhost";
const TARGET_PORT = parseInt(bun.env.APP_PORT || "3000", 10); 

const REQUESTS_PER_SECOND = 50; 
const REQUEST_INTERVAL_MS = Math.floor(1000 / REQUESTS_PER_SECOND);
// Helper function to handle delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const baseRequestLine: string = "GET / HTTP/1.1";

// Define types for the header structure
type HeaderMap = Record<string, string>;
type HeaderPools = Record<string, string[]>;

// Base Headers Configuration
const baseHeaders: HeaderMap = {
    // Host & Forwarding / Proxy headers
    "Host": `${TARGET_HOST}:${TARGET_PORT}`,
    "X-Forwarded-For": "203.0.113.195",
    "X-Real-IP": "203.0.113.195",
    "X-Forwarded-Proto": "http",
    "X-Forwarded-Scheme": "http",

    // Identity & Metadata
    "User-Agent": "Bun-TCP-Stress-Tester",
    "Server": "nginx",
    "X-Powered-By": "Express",

    // State, Routing & CORS Base
    "Cookie": "session_token=stress-test-dummy-token-abc123",
    "Origin": "https://trusted-origin.com",
    "Access-Control-Allow-Origin": "*",
    "Referer": "https://trusted-origin.com",

    // Protocol Routing / Overrides & Slicing
    "X-HTTP-Method-Override": "GET",
    "Range": "bytes=0-1023",

    // Request Sizing / Body Routing
    "Content-Length": "0",
    "Transfer-Encoding": "chunked",
    
    // Standard utility
    "Accept": "*/*",
    "Connection": "keep-alive"
};

// Pools for Variations / Combos (Fuzzing / Edge-case stress testing)
const headerPools: HeaderPools = {
    "Transfer-Encoding": ["chunked", ""],
    "Content-Length": ["0", "10", ""],
    "Origin": ["https://trusted-origin.com", "https://evil-origin.com", "null", ""],
    "Access-Control-Allow-Origin": ["*", "https://trusted-origin.com", "null"],
    "X-Forwarded-For": ["203.0.113.195", "127.0.0.1", "10.0.0.1, 192.168.1.1"],
    "X-Real-IP": ["203.0.113.195", "127.0.0.1"]
};


// MODULE-LEVEL ITERATION CALCULATOR
// Multiplies the lengths of all pool arrays together to find total combinations
const totalIterations: number = Object.values(headerPools).reduce(
    (accumulator, pool) => accumulator * pool.length,
    1
);

// Typed Generator Function for Cartesian Product Combinations
function* generateHeaderCombos(pools: HeaderPools): Generator<HeaderMap, void, unknown> {
    const keys: string[] = Object.keys(pools);
    const values: string[][] = Object.values(pools);

    function* cartesian(index: number, currentCombo: HeaderMap): Generator<HeaderMap, void, unknown> {
        if (index === keys.length) {
            yield currentCombo;
            return;
        }
        for (const val of values[index]) {
            yield* cartesian(index + 1, { ...currentCombo, [keys[index]]: val });
        }
    }

    yield* cartesian(0, {});
}

// Execution Loop
for (const comboHeaders of generateHeaderCombos(headerPools)) {
    // Merge base headers with current variation combo
    const mergedHeaders: HeaderMap = { ...baseHeaders, ...comboHeaders };

    const headerLines: string[] = Object.entries(mergedHeaders)
        .filter(([_, value]) => value !== "") // Omit empty strings
        .map(([key, value]) => `${key}: ${value}`);

    const rawRequest: string = [
        baseRequestLine,
        ...headerLines,
        "", 
        "" 
    ].join("\r\n");

    console.log(rawRequest);
    break; // Remove break to process all generated permutations
}

// Function to send a single rawRequest over TCP
async function sendRawRequest(rawRequest: string) {
    try {
        await connect({
            hostname: TARGET_HOST,
            port: TARGET_PORT,
            socket: {
                open(socket) {
                    socket.write(rawRequest);
                },
                data(socket, data) {
                    // Optional: log or handle response
                    socket.end();
                },
                error(socket, error) {
                    console.error("Socket error:", error);
                }
            }
        });
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

// Function to log a single rawRequest
async function DEBUG_sendRawRequest(rawRequest: string) {
    try {
        console.log(rawRequest);
    } catch (err) {
        console.error("Log rawRequest failed:", err);
    }
}


// Main Loop: Iterate through generator and fire requests
async function runStressTest() {
    console.log(`[Config] Total unique header combinations to test: ${totalIterations}`);
    console.log(`[Config] Target rate: ~${REQUESTS_PER_SECOND} req/sec (${REQUEST_INTERVAL_MS}ms delay)...`);
    console.log("--------------------------------------------------");

    let count = 0;

    for (const comboHeaders of generateHeaderCombos(headerPools)) {
        const mergedHeaders: HeaderMap = { ...baseHeaders, ...comboHeaders };

        const headerLines: string[] = Object.entries(mergedHeaders)
            .filter(([_, value]) => value !== "")
            .map(([key, value]) => `${key}: ${value}`);

        // Build the raw request string from the generator combo
        const rawRequest: string = [
            baseRequestLine,
            ...headerLines,
            "", 
            "" 
        ].join("\r\n");

        count++;
        console.log(`Sending request [${count}/${totalIterations}]...`);

        //console.log("Sending combination...");

        await sendRawRequest(rawRequest);
        
        //TODO: add a small delay between requests if needed
        // Apply module-level interval calculator delay
        if (REQUEST_INTERVAL_MS > 0) {
            await sleep(REQUEST_INTERVAL_MS);
        }
    }
}

// Main Loop: Iterate through generator and fire requests
async function DEBUG_runStressTest() {

    console.log(`[Config] Total unique header combinations to test: ${totalIterations}`);
    console.log(`[Config] Target rate: ~${REQUESTS_PER_SECOND} req/sec (${REQUEST_INTERVAL_MS}ms delay)...`);
    console.log("--------------------------------------------------");

    let count = 0;

    for (const comboHeaders of generateHeaderCombos(headerPools)) {
        const mergedHeaders: HeaderMap = { ...baseHeaders, ...comboHeaders };

        const headerLines: string[] = Object.entries(mergedHeaders)
            .filter(([_, value]) => value !== "")
            .map(([key, value]) => `${key}: ${value}`);

        // Build the raw request string from the generator combo
        const rawRequest: string = [
            baseRequestLine,
            ...headerLines,
            "", 
            "" 
        ].join("\r\n");

        
        count++;
        console.log(`Sending request [${count}/${totalIterations}]...`);

        await DEBUG_sendRawRequest(rawRequest);
        
        //TODO: add a small delay between requests if needed
    }
}

// runStressTest();
DEBUG_runStressTest();