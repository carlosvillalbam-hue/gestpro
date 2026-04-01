const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/schema');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
});

// Obtener perfil
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// Listar usuarios
router.get('/usuarios', authMiddleware, (req, res) => {
  const db = getDb();
  const usuarios = db.prepare('SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY nombre').all();
  res.json(usuarios);
});

// Crear usuario
router.post('/usuarios', authMiddleware, (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Datos incompletos' });

  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)'
    ).run(nombre, email, hash, rol || 'proyectos');
    res.json({ id: result.lastInsertRowid, nombre, email, rol: rol || 'proyectos' });
  } catch (err) {
    res.status(400).json({ error: 'El email ya existe' });
  }
});

// Actualizar usuario
router.put('/usuarios/:id', authMiddleware, (req, res) => {
  const { nombre, email, rol, activo, password } = req.body;
  const db = getDb();
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE usuarios SET nombre=?, email=?, rol=?, activo=?, password=? WHERE id=?')
      .run(nombre, email, rol, activo, hash, req.params.id);
  } else {
    db.prepare('UPDATE usuarios SET nombre=?, email=?, rol=?, activo=? WHERE id=?')
      .run(nombre, email, rol, activo, req.params.id);
  }
  res.json({ ok: true });
});

module.exports = router;
