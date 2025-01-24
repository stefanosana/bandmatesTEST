const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const port = 3000;

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);

app.set('view engine', 'hbs');

app.use(session({
    secret: 'session', // Cambia questo con una stringa segreta robusta
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production", // Usa HTTPS in produzione
      maxAge: 1000 * 60 * 60 * 24 // 24 ore
    }
}));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Si è verificato un errore interno del server' });
});

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BandMates API',
            version: '1.0.0',
            description: 'API per la piattaforma BandMates, un social per musicisti e band',
        },
        servers: [
            {
                url: 'http://localhost:3000', // Cambia con l'URL del tuo server
            },
        ],
    },
    apis: ['./routes/*.js'], // Modifica per includere tutti i file di route
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});