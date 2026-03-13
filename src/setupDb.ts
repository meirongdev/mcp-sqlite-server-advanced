import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  const dbPath = path.join(__dirname, 'database.db');
  console.log(`Setting up database at ${dbPath}...`);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  try {
    console.log("Creating tables...");
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL
      );
    `);

    console.log("Populating tables...");
    await Promise.all([
      db.run("INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)", ["Alice", "alice@example.com"]),
      db.run("INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)", ["Bob", "bob@example.com"]),
      db.run("INSERT OR IGNORE INTO products (name, price) VALUES (?, ?)", ["Laptop Pro", 1200.50]),
      db.run("INSERT OR IGNORE INTO products (name, price) VALUES (?, ?)", ["Wireless Mouse", 25.00]),
    ]);

    console.log("Database setup complete.");
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

setup();
