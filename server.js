const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Banco de dados SQLite
const db = new sqlite3.Database('./iluminacao.db', (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criar tabela se não existir
db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    problema TEXT NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'pendente',
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Servir arquivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API para criar report
app.post('/api/reports', (req, res) => {
    const { latitude, longitude, problema, descricao } = req.body;
    
    if (!latitude || !longitude || !problema) {
        return res.status(400).json({error: 'Dados incompletos'});
    }
    
    db.run(`INSERT INTO reports (latitude, longitude, problema, descricao) 
            VALUES (?, ?, ?, ?)`, 
            [latitude, longitude, problema, descricao], 
            function(err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json({
            id: this.lastID, 
            status: 'success',
            message: 'Problema reportado com sucesso!'
        });
    });
});

// API para listar todos os reports
app.get('/api/reports', (req, res) => {
    db.all("SELECT * FROM reports ORDER BY data_criacao DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json(rows);
    });
});

// API para buscar reports por proximidade
app.get('/api/reports/proximidade', (req, res) => {
    const { lat, lng, raio = 5 } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({error: 'Coordenadas necessárias'});
    }
    
    // Busca simplificada por proximidade
    const query = `
        SELECT *, 
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
        sin(radians(latitude)))) AS distancia 
        FROM reports 
        WHERE distancia < ? 
        ORDER BY distancia
    `;
    
    db.all(query, [lat, lng, lat, raio], (err, rows) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json(rows);
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Pressione Ctrl+C para parar o servidor');
});

// Fechar conexão com BD ao encerrar
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Conexão com o banco de dados fechada.');
        process.exit(0);
    });
});