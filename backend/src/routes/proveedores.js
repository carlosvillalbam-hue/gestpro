const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const proveedores = db.prepare('SELECT * FROM proveedores ORDER BY nombre').all();
  res.json(proveedores);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const proveedor = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(req.params.id);
  if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(proveedor);
});

router.post('/', (req, res) => {
  const { nombre, rfc, direccion, telefono, email, contacto, categoria } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO proveedores (nombre, rfc, direccion, telefono, email, contacto, categoria) VALUES (?,?,?,?,?,?,?)'
  ).run(nombre, rfc, direccion, telefono, email, contacto, categoria);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { nombre, rfc, direccion, telefono, email, contacto, categoria, activo } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE proveedores SET nombre=?, rfc=?, direccion=?, telefono=?, email=?, contacto=?, categoria=?, activo=? WHERE id=?'
  ).run(nombre, rfc, direccion, telefono, email, contacto, categoria, activo ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE proveedores SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
