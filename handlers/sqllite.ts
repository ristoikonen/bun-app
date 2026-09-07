import { Database } from "bun:sqlite";
import calculateUserId from '../handlers/hash'

// Initialize the database file
const db = new Database("users.sqlite");

// 1. Optimize for concurrent API access (WAL mode and busy timeout)
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA busy_timeout = 5000;");

// 2. Initialize the users table - Note: Minimalistic schema; No first name, last name columns
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    is_moderator INTEGER DEFAULT 0
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Interface for user objects
export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  is_moderator: number ;
  created_at: string;
  updated_at: string;
}

/**
 * Inserts a new user into the database securely.
 * Uses Bun's native password hashing and prepared statements.
 */
export async function createUser(email: string, passwordPlain: string, displayName: string | null, isModerator: number | null): Promise<void> {
  
  //TODO: VALIDATE!
  // SHA-256 hex string is 64 characters long
  const idHash = calculateUserId(email); 
  //new Bun.CryptoHasher("sha256")
  //.update(email.toLowerCase().trim())
  //.digest("hex");
  
  //const id = crypto.randomUUID();
  //const idHash = Bun.hash(email.toLowerCase().trim()).toString(16); 
  const passwordHash = await Bun.password.hash(passwordPlain);

  const query = db.query(`
    INSERT INTO users (id, email, password_hash, display_name, is_moderator)
    VALUES ($idHash, $email, $password_hash, $display_name, $display_name,$is_moderator)
  `);

  // Parameters are automatically sanitized to prevent SQL injection
  query.run({
    $id: idHash,
    $email: email.toLowerCase().trim(),
    $password_hash: passwordHash,
    $display_name: displayName,
    $is_moderator: isModerator,
  });
}



/**
 * Retrieves a user by their email address.
 * Returns the User object or null if not found.
 */
export function getUserByEmail(email: string): User | null {
  const query = db.query("SELECT * FROM users WHERE email = $email");
  
  return query.get({ $email: email.toLowerCase().trim() }) as User | null;
}

export function getUserByIdUsingEmail(email: string) {

  const targetId = calculateUserId(email);

  // Uses LIMIT 
  const query = db.query("SELECT * FROM users WHERE id = $id LIMIT 1");
  
  // Execute and return a single object (or null if not found)
  return query.get({ $id: targetId });
}

/**
 * Retrieves a user by their unique ID.
 */
export function getUserById(id: string): User | null {
  const query = db.query("SELECT * FROM users WHERE id = $id");
  
  return query.get({ $id: id }) as User | null;
}

/**
 * Retrieves user if user is a moderator .
 */
export function getModeratorUser(id: string): User | null {
  const query = db.query("SELECT * FROM users WHERE id = $id AND is_moderator = 1");

  return query.get({ $id: id }) as User | null;
}


/**
 * Updates a user's optional display name and sets the updated_at timestamp.
 */
export function updateUserProfile(id: string, displayName: string): void {
  const query = db.query(`
    UPDATE users 
    SET display_name = $display_name, updated_at = CURRENT_TIMESTAMP
    WHERE id = $id
  `);

  query.run({
    $id: id,
    $display_name: displayName,
  });
}

/**
 * Retrieves a list of all users. 
 * Perfect for admin panels or debugging (omit sensitive fields in real API responses).
 */
export function getAllUsers(): User[] {
  const query = db.query("SELECT * FROM users ORDER BY created_at DESC");
  
  return query.all() as User[];
}


