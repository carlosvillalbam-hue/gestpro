const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const { q, activo } = req.query;
  let query = 'SELECT * FROM clientes WHERE 1=1';
  const params = [];
  if (q) { query += ' AND nombre LIKE ?'; params.push(`%${q}%`); }
  if (activo !== undefined) { query += ' AND activo = ?'; params.push(activo === 'true' ? 1 : 0); }
  else { query += ' AND activo = 1'; }
  query += ' ORDER BY nombre';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  const proyectos = db.prepare('SELECT * FROM proyectos WHERE cliente_id = ? ORDER BY created_at DESC').all(req.params.id);
  const ventas = db.prepare(`
    SELECT vt.*, u.nombre as vendedora_nombre
    FROM ventas vt
    LEFT JOIN vendedoras v ON vt.vendedora_id = v.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE vt.cliente_id = ?
    ORDER BY vt.fecha_venta DESC LIMIT 10
  `).all(req.params.id);
  res.json({ ...cliente, proyectos, ventas });
});

router.post('/', (req, res) => {
  const { nombre, rfc, direccion, telefono, email, contacto, descuento } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO clientes (nombre, rfc, direccion, telefono, email, contacto, descuento) VALUES (?,?,?,?,?,?,?)'
  ).run(nombre, rfc, direccion, telefono, email, contacto, descuento || 0);
  res.json({ id: result.lastInsertRowid, ...req.body });
});

router.put('/:id', (req, res) => {
  const { nombre, rfc, direccion, telefono, email, contacto, descuento, activo } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE clientes SET nombre=?, rfc=?, direccion=?, telefono=?, email=?, contacto=?, descuento=?, activo=? WHERE id=?'
  ).run(nombre, rfc, direccion, telefono, email, contacto, descuento || 0, activo ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE clientes SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
