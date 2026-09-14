// Bun resolves this runtime module, but TypeScript may not have Bun's ambient types configured.
// @ts-expect-error -- bun:sqlite is provided by the Bun runtime.

import { Database } from "bun:sqlite";
import { createClient } from "@libsql/client";
import {getUserByEmail} from "../handlers/turso_sqllite";

// Access Bun globals without requiring Bun's ambient TypeScript definitions.
const bun = (globalThis as any).Bun;

const db = createClient({
  url: bun.env.TURSO_DATABASE_URL!,
  authToken: bun.env.TURSO_AUTH_TOKEN!,
})

import { userSchema } from '../handlers/sqllite'


//NOTE: Ment to run by itself
// bun run services\test_db_ops.ts
//TODO: Add more db ops and method calls at the end of code

/*
// Initialize Bun's native SQLite database (creates local.db if it doesn't exist)
//const db = new Database("local.db", { create: true });
//const db = new Database("mydb.sqlite", { create: true });

// Ensure table exists for testing
db.run(`
  CREATE TABLE IF NOT EXISTS user (
    id text PRIMARY KEY NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    display_name text,
    is_moderator integer NOT NULL DEFAULT 0,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
`);
*/

async function runTestInsert() {
  const handFedData = {
    email: "useri@gmx.com",
    plainPassword: "SuperSecurePassword123",
    display_name: "Test User",
    is_moderator: 0,
  };

  console.log("Processing hand-fed data for:", handFedData.email);

  // 1. Hash the password using Bun's native utility
  const password_hash = await bun.password.hash(handFedData.plainPassword, {
    algorithm: "argon2id",
    cost: 4,
  });

  // 2. Build the row payload
  const candidateUser = {
    id: crypto.randomUUID(),
    email: handFedData.email,
    password_hash,
    display_name: handFedData.display_name,
    is_moderator: handFedData.is_moderator,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 3. Validate data using Zod's safeParse
  const validationResult = userSchema.safeParse(candidateUser);

  if (!validationResult.success) {
    console.error("❌ Zod Validation Failed:");
    console.error(validationResult.error.format());
    return;
  }

  const validUser = validationResult.data;

  // 4. Insert using Bun's native sqlite driver (`bun:sqlite`)
try {
    await db.execute({
      sql: `
        INSERT INTO user (id, email, password_hash, display_name, is_moderator, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        validUser.id,
        validUser.email,
        validUser.password_hash,
        validUser.display_name,
        validUser.is_moderator,
        validUser.created_at!,
        validUser.updated_at!,
      ],
    });

    console.log("✅ Successfully inserted row with ID:", validUser.id);
  } catch (error) {
    console.error("❌ Bun SQLite database error during insert:", error);
  }
}

async function runTestSelect() {
  const testEmail = "useri@gmx.com";
  
  const user = await getUserByEmail(testEmail);
  
  console.log("Retrieved user:", user);
  return user;
}


// ADD TESTS HERE
//await runTestInsert();
await runTestSelect();






//import verifyUserWithBackend from '../handlers/verify'



/*
const userSchema = z.object({
  id: z.string().min(1, { message: "ID is required" }),
  email: z.string().email({ message: "Invalid email format" }).max(254, { message: "Email must not exceed 254 characters" }),
  password_hash: z.string().min(1, { message: "Password hash is required" }),
  display_name: z.string().nullable(),
  is_moderator: z.number().int().min(0).max(1).default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const db = createClient({
  url: Bun.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: Bun.env.TURSO_AUTH_TOKEN,
});


export default async function testUserInsert(emailaddress: string) {
    // --- HAND-FED TEST DATA ---
  const handFedData = {
    email: emailaddress,
    plainPassword: "SuperSecurePassword123",
    display_name: "Test User",
    is_moderator: 0,
  };

  console.log("Processing hand-fed data for:", handFedData.email);

  // 1. Hash the password using Bun's native utility
  const password_hash = await Bun.password.hash(handFedData.plainPassword, {
    algorithm: "argon2id",
    cost: 4,
  });

  // 2. Build the row payload
  const candidateUser = {
    id: crypto.randomUUID(),
    email: handFedData.email,
    password_hash,
    display_name: handFedData.display_name,
    is_moderator: handFedData.is_moderator,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 3. Validate data using Zod's safeParse
  const validationResult = userSchema.safeParse(candidateUser);

  if (!validationResult.success) {
    console.error("❌ Zod Validation Failed:");
    console.error(validationResult.error.format());
    return;
  }

  const validUser = validationResult.data;

  // 4. Insert into Turso / SQLite
  try {
    await db.execute({
      sql: `
        INSERT INTO user (id, email, password_hash, display_name, is_moderator, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        validUser.id,
        validUser.email,
        validUser.password_hash,
        validUser.display_name,
        validUser.is_moderator,
        validUser.created_at!,
        validUser.updated_at!,
      ],
    });

    console.log("✅ Successfully inserted row with ID:", validUser.id);
  } catch (error) {
    console.error("❌ Turso database error during insert:", error);
  }
}

await testUserInsert('testi@gmx.com');
*/