const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

// Настройка сервера для приема больших картинок Base64
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Запрос всех карт для облачной галереи-базы
app.get('/api/cards', (req, res) => {
    db.all('SELECT * FROM cards', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. Создание новой карточки (с текстом или фото)
app.post('/api/cards', (req, res) => {
    const { frontText, frontImg, backText, backImg } = req.body;
    const nextReview = Date.now(); // Сразу готова к первому показу

    const query = `INSERT INTO cards (frontText, frontImg, backText, backImg, nextReview) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [frontText, frontImg, backText, backImg, nextReview], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// 3. Удаление карточки из базы данных
app.delete('/api/cards/:id', (req, res) => {
    db.run('DELETE FROM cards WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 4. Получение карточки для тренировки по умным интервалам времени
app.get('/api/cards/review', (req, res) => {
    const now = Date.now();
    // Сначала ищем те, у которых подошло время повторения
    db.get('SELECT * FROM cards WHERE nextReview <= ? ORDER BY RANDOM() LIMIT 1', [now], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (!row) {
            // Если плановых карт нет, включаем бесконечный рандом и берем любую карту из базы!
            db.get('SELECT * FROM cards ORDER BY RANDOM() LIMIT 1', [], (err, randomRow) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ card: randomRow, isDue: false });
            });
        } else {
            res.json({ card: row, isDue: true });
        }
    });
});

// 5. Обработка ответа пользователя и расчет интервала по алгоритму SM-2
app.post('/api/cards/review/:id', (req, res) => {
    const id = req.params.id;
    const { quality } = req.body; // Оценка: 0 — забыл, 5 — помню

    db.get('SELECT * FROM cards WHERE id = ?', [id], (err, card) => {
        if (err || !card) return res.status(404).json({ error: 'Карточка не найдена' });

        let reps = card.repetitions;
        let interval = card.interval;
        let ef = card.efactor;

        // Математика оригинального алгоритма SM-2
        if (quality < 3) {
            reps = 0;
            interval = 1; // Сброс повторения на завтра при ошибке
        } else {
            if (reps === 0) interval = 1;
            else if (reps === 1) interval = 6;
            else interval = Math.round(interval * ef);
            reps++;
        }

        // Обновление коэффициента сложности (Ease Factor) карточки
        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (ef < 1.3) ef = 1.3;

        // Рассчитываем время следующего показа. 
        // Сейчас стоит экспресс-тест (interval * 10 секунд), чтобы вы сразу увидели, как карточки возвращаются!
        // Для реальной учебы потом заменим на: interval * 24 * 60 * 60 * 1000 (интервал в днях)
        const nextReview = Date.now() + (interval * 10 * 1000);

        db.run(
            `UPDATE cards SET repetitions = ?, interval = ?, efactor = ?, nextReview = ? WHERE id = ?`,
            [reps, interval, ef, nextReview, id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер успешно запущен: http://localhost:${PORT}`);
});
