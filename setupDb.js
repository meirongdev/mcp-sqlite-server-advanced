import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
// ESM: __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlite = sqlite3.verbose();
// This ensures the database is created inside the 'src' folder
const dbPath = path.join(__dirname, 'src', 'database.db');
const db = new sqlite.Database(dbPath);
db.serialize(() => {
    console.log("Creating tables...");
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE)");
    db.run("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, price REAL)");
    console.log("Populating 'users' table...");
    const userStmt = db.prepare("INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)");
    userStmt.run("Alice", "alice@example.com");
    userStmt.run("Bob", "bob@example.com");
    userStmt.finalize();
    console.log("Populating 'products' table...");
    const productStmt = db.prepare("INSERT OR IGNORE INTO products (name, price) VALUES (?, ?)");
    productStmt.run("Laptop Pro", 1200.50);
    productStmt.run("Wireless Mouse", 25.00);
    productStmt.finalize();
});
db.close((err) => {
    if (err)
        console.error(err.message);
    else
        console.log(`Database is set up inside ${dbPath}`);
});
//# sourceMappingURL=setupDb.js.map