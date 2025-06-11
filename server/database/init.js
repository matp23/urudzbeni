const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'urudzbenik.db');

const db = new sqlite3.Database(dbPath);

// Kreiranje tablica
db.serialize(() => {
  // Tablica za dopise
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      sender TEXT,
      registry_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      pdf_filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tablica za brojače
  db.run(`
    CREATE TABLE IF NOT EXISTS counters (
      year INTEGER PRIMARY KEY,
      outgoing_count INTEGER DEFAULT 0,
      incoming_count INTEGER DEFAULT 0
    )
  `);

  console.log('Baza podataka kreirana!');
});

module.exports = db;