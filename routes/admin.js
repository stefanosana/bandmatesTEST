const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const db = require('../config/database');


router.get('/admin/users', isAdmin, (req, res) => {
    db.all(`SELECT * FROM musicians UNION SELECT * FROM bands`, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore nel recupero degli utenti' });
        }
        res.json(rows);
    });
});

router.get('/admin/delete-user/:id', isAdmin, (req, res) => {
    const { id } = req.params;

    db.get(`SELECT * FROM users WHERE user_id = ?`, [id], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Errore durante il recupero delle informazioni dell\'utente' });
        }

        if (!row) {
            return res.status(404).json({ error: `Utente con ID ${id} non trovato.` });
        }

        res.json({ user: row });
    });
});

router.delete('/admin/delete-user/:id', isAdmin, (req, res) => {
    const id = parseInt(req.params.id); // Convertiamo l'ID in numero

    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID utente non valido' });
    }

    // Inizia una transazione
    db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
            console.error('Errore nell\'iniziare la transazione:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }

        /*
        // Prima elimina tutti i messaggi dell'utente
        db.run('DELETE FROM MESSAGES WHERE sender_id = ? OR receiver_id = ?', [id, id], (err) => {
            if (err) {
                console.error('Errore nell\'eliminazione dei messaggi:', err);
                return db.run('ROLLBACK', () => {
                    res.status(500).json({ error: 'Errore nell\'eliminazione dei messaggi' });
                });
            } */


        /*
                    // Poi elimina tutte le chat room dell'utente
                    db.run('DELETE FROM CHAT_ROOMS WHERE sender_id = ? OR receiver_id = ?', [id, id], (err) => {
                        if (err) {
                            console.error('Errore nell\'eliminazione delle chat room:', err);
                            return db.run('ROLLBACK', () => {
                                res.status(500).json({ error: 'Errore nell\'eliminazione delle chat room' });
                            });
                        } */

        // Infine elimina l'utente
        db.run('DELETE FROM USERS WHERE user_id = ?', [id], function (err) {
            if (err) {
                console.error('Errore nell\'eliminazione dell\'utente:', err);
                return db.run('ROLLBACK', () => {
                    res.status(500).json({ error: 'Errore nell\'eliminazione dell\'utente' });
                });
            }

            // Verifica se l'utente è stato effettivamente eliminato
            if (this.changes === 0) {
                return db.run('ROLLBACK', () => {
                    res.status(404).json({ error: `Utente con ID ${id} non trovato` });
                });
            }

            // Se tutto è andato bene, conferma la transazione
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Errore nel confermare la transazione:', err);
                    return db.run('ROLLBACK', () => {
                        res.status(500).json({ error: 'Errore nel confermare l\'eliminazione' });
                    });
                }
                res.json({
                    message: `Utente con ID ${id} eliminato con successo`,
                    deletedUserId: id
                });
            });
        });
    });
});

router.get('/admin/feedback', (req, res) => {
    if (req.session.role === 'admin') {
        // Recupera feedback dal database
        db.all('SELECT * FROM feedback', [], (err, rows) => {
            if (err) {
                return res.status(500).send('Errore nel recupero feedback');
            }
            res.render('admin/feedback', { feedbacks: rows });
        });
    } else {
        res.status(403).send('Accesso negato');
    }
});

router.get('/admin/users/edit/:id', (req, res) => {
    if (req.session.role === 'admin') {
        const { id } = req.params;

        db.get(
            `SELECT 'musician' AS userType, musician_id AS id, full_name, email FROM musicians WHERE musician_id = ?
             UNION
             SELECT 'band' AS userType, band_id AS id, full_name, email FROM bands WHERE band_id = ?`,
            [id, id],
            (err, row) => {
                if (err || !row) return res.status(404).send('Utente non trovato');
                res.render('admin/editUser', { user: row });
            }
        );
    } else {
        res.status(403).send('Accesso negato');
    }
});

router.post('/admin/users/edit/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, email, userType } = req.body;

    if (!fullName || !email) {
        return res.status(400).send('Tutti i campi sono obbligatori.');
    }

    const updateQuery = userType === 'musician'
        ? `UPDATE musicians SET full_name = ?, email = ? WHERE musician_id = ?`
        : `UPDATE bands SET full_name = ?, email = ? WHERE band_id = ?`;

    db.run(updateQuery, [fullName, email, id], (err) => {
        if (err) return res.status(500).send('Errore nella modifica');
        res.redirect('/admin/users');
    });
});

router.get('/admin/users/edit/:id', (req, res) => {
    const userId = req.params.id;

    db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Errore nel recupero dell\'utente:', err);
            return res.status(500).render('error', { message: 'Errore nel recupero dell\'utente' });
        }

        if (!user) {
            return res.status(404).render('error', { message: 'Utente non trovato' });
        }

        // Renderizza la pagina di modifica con i dati dell'utente
        res.render('admin/editUser', { user });
    });
});

router.post('/admin/users/edit/:id', (req, res) => {
    const userId = req.params.id;
    const { full_name, email, userType, location, description } = req.body;

    const updateQuery = `
        UPDATE users 
        SET full_name = ?, email = ?, userType = ?, location = ?, description = ? 
        WHERE user_id = ?
    `;

    db.run(updateQuery, [full_name, email, userType, location, description, userId], function (err) {
        if (err) {
            console.error('Errore nell\'aggiornamento dell\'utente:', err);
            return res.status(500).render('error', { message: 'Errore nell\'aggiornamento dell\'utente' });
        }

        // Reindirizza alla pagina di gestione utenti con un messaggio di successo
        res.redirect('/admin/users?message=Utente aggiornato con successo');
    });
});


module.exports = router;
router.use(express.static('public'));
// Avvio del server
router.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}: ${"http://localhost:" + port}`);
});