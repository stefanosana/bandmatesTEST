const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const db = require('../config/database');

router.get('/chat', (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    res.render('chat', {
        full_name: req.session.full_name,
        userType: req.session.userType,
        role: req.session.role,
    });
});

router.get('/users/list', (req, res) => {
    // Verifica che l'utente sia loggato
    if (!req.session.userId) {
        return res.status(401).send('Non autorizzato');
    }
    
    // Recupera tutti gli utenti tranne l'utente corrente
    db.all('SELECT user_id, full_name, email FROM USERS WHERE user_id != ?', 
        [req.session.userId], 
        (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero utenti');
            }
            res.json(rows);
        });
});

router.post('/chat/start', async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.session.userId; // Assumiamo che l'ID dell'utente corrente sia memorizzato nella sessione

    try {
        // Verifichiamo che l'utente corrente non stia cercando di chattare con se stesso
        if (userId === currentUserId) {
            return res.status(400).json({ error: 'Non puoi avviare una chat con te stesso' });
        }

        // Verifichiamo se esiste già una chat room tra questi due utenti
        const existingRoom = await db.get(
            'SELECT * FROM CHAT_ROOMS WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
            [currentUserId, userId, userId, currentUserId]
        );

        if (existingRoom) {
            // Se esiste già una chat room, restituiamo il suo ID
            return res.json({ chatRoomId: existingRoom.chat_room_id });
        }

        // Se non esiste, creiamo una nuova chat room
        const result = await db.run(
            'INSERT INTO CHAT_ROOMS (sender_id, receiver_id, created_at) VALUES (?, ?, ?)',
            [currentUserId, userId, new Date().toISOString()]
        );

        // Recupera l'ID della chat room appena creata
        const newRoom = await db.get(
            'SELECT chat_room_id FROM CHAT_ROOMS WHERE sender_id = ? AND receiver_id = ?',
            [currentUserId, userId]
        );

        if (newRoom) {
            console.log(newRoom.chat_room_id)
            return res.json({ chatRoomId: newRoom.chat_room_id });
        } else {
            return res.status(500).json({ error: 'Errore durante la creazione della chat room' });
        }
    } catch (error) {
        console.error('Errore durante la gestione della chat:', error.message);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

module.exports = router;
app.use(express.static('public'));
// Avvio del server
app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}: ${"http://localhost:" + port}`);
});