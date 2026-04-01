const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const { proyecto_id, bajo_stock } = req.query;
  let query = `
    SELECT i.*, p.nombre as proyecto_nombre
    FROM inventario i
    LEFT JOIN proyectos p ON i.proyecto_id = p.id
    WHERE i.activo = 1
  `;
  const params = [];
  if (proyecto_id) { query += ' AND i.proyecto_id = ?'; params.push(proyecto_id); }
  if (bajo_stock === 'true') { query += ' AND i.cantidad <= i.stock_minimo'; }
  query += ' ORDER BY i.descripcion';
  res.json(db.prepare(query).all(...params));
});

// Alertas de stock mínimo
router.get('/alertas', (req, res) => {
  const db = getDb();
  const alertas = db.prepare(`
    SELECT i.*, p.nombre as proyecto_nombre
    FROM inventario i
    LEFT JOIN proyectos p ON i.proyecto_id = p.id
    WHERE i.activo = 1 AND i.cantidad <= i.stock_minimo AND i.stock_minimo > 0
    ORDER BY (i.cantidad - i.stock_minimo) ASC
  `).all();
  res.json(alertas);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });
  const movimientos = db.prepare(`
    SELECT m.*, u.nombre as usuario_nombre
    FROM inventario_movimientos m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.inventario_id = ?
    ORDER BY m.fecha DESC
  `).all(req.params.id);
  res.json({ ...item, movimientos });
});

router.post('/', (req, res) => {
  const { codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, proyecto_id, ubicacion } = req.body;
  if (!descripcion) return res.status(400).json({ error: 'Descripción requerida' });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, proyecto_id, ubicacion) VALUES (?,?,?,?,?,?,?,?)'
  ).run(codigo, descripcion, unidad, cantidad || 0, stock_minimo || 0, costo_unitario || 0, proyecto_id || null, ubicacion || 'almacen');

  if ((cantidad || 0) > 0) {
    db.prepare('INSERT INTO inventario_movimientos (inventario_id, tipo, cantidad, referencia, usuario_id) VALUES (?,?,?,?,?)')
      .run(result.lastInsertRowid, 'entrada', cantidad, 'Inventario inicial', req.user.id);
  }
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { codigo, descripcion, unidad, stock_minimo, costo_unitario, proyecto_id, ubicacion, activo } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE inventario SET codigo=?, descripcion=?, unidad=?, stock_minimo=?, costo_unitario=?, proyecto_id=?, ubicacion=?, activo=? WHERE id=?'
  ).run(codigo, descripcion, unidad, stock_minimo || 0, costo_unitario || 0, proyecto_id || null, ubicacion, activo ?? 1, req.params.id);
  res.json({ ok: true });
});

// Registrar movimiento
router.post('/:id/movimiento', (req, res) => {
  const { tipo, cantidad, referencia, oc_id, proyecto_id, notas } = req.body;
  if (!tipo || !cantidad) return res.status(400).json({ error: 'Tipo y cantidad requeridos' });
  const db = getDb();
  const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });

  const nuevaCantidad = tipo === 'entrada'
    ? item.cantidad + cantidad
    : tipo === 'ajuste'
      ? cantidad
      : item.cantidad - cantidad;

  if (nuevaCantidad < 0) return res.status(400).json({ error: 'Stock insuficiente' });

  db.prepare('UPDATE inventario SET cantidad = ? WHERE id = ?').run(nuevaCantidad, req.params.id);
  db.prepare(
    'INSERT INTO inventario_movimientos (inventario_id, tipo, cantidad, referencia, oc_id, proyecto_id, notas, usuario_id) VALUES (?,?,?,?,?,?,?,?)'
  ).run(req.params.id, tipo, cantidad, referencia, oc_id || null, proyecto_id || null, notas, req.user.id);

  const alerta = item.stock_minimo > 0 && nuevaCantidad <= item.stock_minimo;
  res.json({ ok: true, cantidad_actual: nuevaCantidad, alerta_stock: alerta });
});

// Kardex
router.get('/:id/kardex', (req, res) => {
  const db = getDb();
  const movimientos = db.prepare(`
    SELECT m.*, u.nombre as usuario_nombre
    FROM inventario_movimientos m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.inventario_id = ?
    ORDER BY m.fecha ASC
  `).all(req.params.id);
  res.json(movimientos);
});

module.exports = router;
