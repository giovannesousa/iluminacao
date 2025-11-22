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

// === Endpoints de administração com JWT e persistência ===
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'mudar_para_seguro';

// Criar tabela de admins se não existir
db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)`);

// Seed do admin padrão se não existir
const defaultAdminUser = process.env.ADMIN_USER || 'admin';
const defaultAdminPass = process.env.ADMIN_PASS || 'admin123';
const defaultHashed = bcrypt.hashSync(defaultAdminPass, 8);
db.get('SELECT * FROM admins WHERE username = ?', [defaultAdminUser], (err, row) => {
    if (err) return console.error('Erro verificando admin:', err.message);
    if (!row) {
        db.run('INSERT INTO admins (username, password) VALUES (?, ?)', [defaultAdminUser, defaultHashed], (err2) => {
            if (err2) return console.error('Erro seed admin:', err2.message);
            console.log(`Admin padrão criado: ${defaultAdminUser}`);
        });
    }
});

function adminAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Authorization Bearer token required' });
    const token = parts[1];
    jwt.verify(token, ADMIN_JWT_SECRET, (err, payload) => {
        if (err) return res.status(401).json({ error: 'Token inválido ou expirado' });
        req.admin = payload;
        next();
    });
}

// Login admin (retorna JWT)
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username e password são necessários' });

    db.get('SELECT * FROM admins WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Credenciais inválidas' });
        const match = bcrypt.compareSync(password, row.password);
        if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });
        const token = jwt.sign({ id: row.id, username: row.username }, ADMIN_JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token, expiresInSeconds: 3600 });
    });
});

// Listar ocorrências (admin) com filtro por status (ex: ?status=pendente ou ?status=resolvido)
app.get('/admin/occurrences', adminAuth, (req, res) => {
    const { status } = req.query;
    let sql = 'SELECT * FROM reports';
    const params = [];
    if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
    }
    sql += ' ORDER BY data_criacao DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Buscar ocorrência por id (admin)
app.get('/admin/occurrences/:id', adminAuth, (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM reports WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Ocorrência não encontrada' });
        res.json(row);
    });
});

// Marcar ocorrência como resolvida
app.put('/admin/occurrences/:id/resolve', adminAuth, (req, res) => {
    const id = req.params.id;
    db.run("UPDATE reports SET status = 'resolvido' WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Ocorrência não encontrada' });
        db.get('SELECT * FROM reports WHERE id = ?', [id], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'Ocorrência marcada como resolvida', occurrence: row });
        });
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