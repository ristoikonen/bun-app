import { GoogleGenAI } from '@google/genai';
import { ai } from '../geminiClient';
import { readdir } from "node:fs/promises";
import { Glob, env } from "bun";
const UPLOAD_DIR = "./upload_files";
const THUMB_DIR = "./thumbnails";

//import handleHash from './handlers/hashGoogleSub';
import hashGoogleSub from '../handlers/hash'
import verifyUserWithBackend from '../handlers/verify'


export default async function testHashAndVerifyUserWithBackend(hashMe: string): Promise<string> {
    try {
        console.log("About to hash: " + hashMe);

        let subhash = hashGoogleSub('abc');
        console.log(subhash);

        //const hashbytes: Uint8Array = new TextEncoder().encode('abc');
        
        const hmac = new Bun.CryptoHasher("sha256", Bun.env.GOOGLE_SUB_PEPPER);
        let hexhash = hmac.update(hashMe).digest().toHex();

        const eq = subhash === hexhash;
        
        console.log(`${subhash} === ${hexhash} = ${eq}`);

        //const data = verifyUserWithBackend(Bun.env.GOOGLE_SUB_PEPPER || '')

        return subhash || "";

    } catch (error) {
        console.error("Error in testHash:", error);
        return "";
    }
}
