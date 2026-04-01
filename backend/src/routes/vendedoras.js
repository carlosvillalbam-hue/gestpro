const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Listar vendedoras
router.get('/', (req, res) => {
  const db = getDb();
  const vendedoras = db.prepare(`
    SELECT v.*, u.nombre, u.email, u.foto, u.activo as usuario_activo
    FROM vendedoras v
    JOIN usuarios u ON v.usuario_id = u.id
    ORDER BY u.nombre
  `).all();
  res.json(vendedoras);
});

// Obtener vendedora
router.get('/:id', (req, res) => {
  const db = getDb();
  const vendedora = db.prepare(`
    SELECT v.*, u.nombre, u.email, u.foto
    FROM vendedoras v
    JOIN usuarios u ON v.usuario_id = u.id
    WHERE v.id = ?
  `).get(req.params.id);
  if (!vendedora) return res.status(404).json({ error: 'Vendedora no encontrada' });

  const ventas = db.prepare(`
    SELECT vt.*, c.nombre as cliente_nombre, p.nombre as proyecto_nombre
    FROM ventas vt
    LEFT JOIN clientes c ON vt.cliente_id = c.id
    LEFT JOIN proyectos p ON vt.proyecto_id = p.id
    WHERE vt.vendedora_id = ?
    ORDER BY vt.fecha_venta DESC
    LIMIT 20
  `).all(req.params.id);

  const objetivos = db.prepare(
    'SELECT * FROM objetivos_vendedoras WHERE vendedora_id = ? ORDER BY periodo DESC'
  ).all(req.params.id);

  res.json({ ...vendedora, ventas, objetivos });
});

// Crear vendedora (asociar usuario existente o crear usuario)
router.post('/', (req, res) => {
  const { usuario_id, tipo_comision, comision_por_venta, comision_por_unidad } = req.body;
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id requerido' });
  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO vendedoras (usuario_id, tipo_comision, comision_por_venta, comision_por_unidad) VALUES (?,?,?,?)'
    ).run(usuario_id, tipo_comision || 'por_venta', comision_por_venta || 0, comision_por_unidad || 0);
    // Update user role to vendedora if not admin
    const user = db.prepare('SELECT rol FROM usuarios WHERE id = ?').get(usuario_id);
    if (user && user.rol !== 'admin') {
      db.prepare("UPDATE usuarios SET rol = 'vendedora' WHERE id = ?").run(usuario_id);
    }
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Este usuario ya es vendedora' });
  }
});

// Actualizar vendedora
router.put('/:id', (req, res) => {
  const { tipo_comision, comision_por_venta, comision_por_unidad, activo } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE vendedoras SET tipo_comision=?, comision_por_venta=?, comision_por_unidad=?, activo=? WHERE id=?'
  ).run(tipo_comision, comision_por_venta || 0, comision_por_unidad || 0, activo ?? 1, req.params.id);
  res.json({ ok: true });
});

// Comisiones de una vendedora
router.get('/:id/comisiones', (req, res) => {
  const db = getDb();
  const { periodo } = req.query;
  let query = `
    SELECT vt.*, c.nombre as cliente_nombre, p.nombre as proyecto_nombre
    FROM ventas vt
    LEFT JOIN clientes c ON vt.cliente_id = c.id
    LEFT JOIN proyectos p ON vt.proyecto_id = p.id
    WHERE vt.vendedora_id = ?
  `;
  const params = [req.params.id];
  if (periodo) { query += " AND strftime('%Y-%m', vt.fecha_venta) = ?"; params.push(periodo); }
  query += ' ORDER BY vt.fecha_venta DESC';

  const ventas = db.prepare(query).all(...params);
  const totales = ventas.reduce((acc, v) => ({
    monto: acc.monto + (v.monto || 0),
    comision: acc.comision + (v.comision_monto || 0),
    comision_pagada: acc.comision_pagada + (v.comision_pagada ? v.comision_monto || 0 : 0),
  }), { monto: 0, comision: 0, comision_pagada: 0 });

  res.json({ ventas, totales });
});

// Objetivos
router.get('/:id/objetivos', (req, res) => {
  const db = getDb();
  const objetivos = db.prepare(
    'SELECT * FROM objetivos_vendedoras WHERE vendedora_id = ? ORDER BY periodo DESC'
  ).all(req.params.id);
  res.json(objetivos);
});

router.post('/:id/objetivos', (req, res) => {
  const { periodo, tipo, objetivo } = req.body;
  if (!periodo || !objetivo) return res.status(400).json({ error: 'Datos incompletos' });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO objetivos_vendedoras (vendedora_id, periodo, tipo, objetivo) VALUES (?,?,?,?)'
  ).run(req.params.id, periodo, tipo || 'monto', objetivo);

  // Calculate current alcanzado
  const ventas = db.prepare(
    "SELECT SUM(monto) as total FROM ventas WHERE vendedora_id = ? AND strftime('%Y-%m', fecha_venta) = ?"
  ).get(req.params.id, periodo);
  db.prepare('UPDATE objetivos_vendedoras SET alcanzado = ? WHERE id = ?')
    .run(ventas?.total || 0, result.lastInsertRowid);

  res.json({ id: result.lastInsertRowid });
});

router.put('/:id/objetivos/:oid', (req, res) => {
  const { periodo, tipo, objetivo } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE objetivos_vendedoras SET periodo=?, tipo=?, objetivo=? WHERE id=? AND vendedora_id=?'
  ).run(periodo, tipo, objetivo, req.params.oid, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
