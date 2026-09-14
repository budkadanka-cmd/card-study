const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Проверяем: если мы на сервере Render, сохраняем базу на специальный постоянный диск /var/data
// Если мы дома на ПК, сохраняем локально в папку проекта
const isProduction = process.env.RENDER === 'true';
const dbDir = isProduction ? '/var/data' : __dirname;
const dbPath = path.resolve(dbDir, 'cards.db');

// На сервере Render создаем папку для диска, если её вдруг нет
if (isProduction && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Ошибка подключения к SQLite:', err.message);
    else console.log(`Успешное подключение к SQLite. Путь: ${dbPath}`);
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            frontText TEXT,
            frontImg TEXT,
            backText TEXT,
            backImg TEXT,
            repetitions INTEGER DEFAULT 0,
            interval INTEGER DEFAULT 1,
            efactor REAL DEFAULT 2.5,
            nextReview INTEGER
        )
    `);
});

module.exports = db;
