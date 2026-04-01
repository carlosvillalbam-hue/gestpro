const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

function calcularComision(vendedora, monto, unidades) {
  if (vendedora.tipo_comision === 'por_unidad') {
    return (unidades || 0) * (vendedora.comision_por_unidad || 0);
  }
  return (monto || 0) * ((vendedora.comision_por_venta || 0) / 100);
}

// Listar ventas
router.get('/', (req, res) => {
  const db = getDb();
  const { vendedora_id, cliente_id, periodo } = req.query;
  let query = `
    SELECT vt.*, c.nombre as cliente_nombre, p.nombre as proyecto_nombre,
           u.nombre as vendedora_nombre
    FROM ventas vt
    LEFT JOIN clientes c ON vt.cliente_id = c.id
    LEFT JOIN proyectos p ON vt.proyecto_id = p.id
    LEFT JOIN vendedoras v ON vt.vendedora_id = v.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (vendedora_id) { query += ' AND vt.vendedora_id = ?'; params.push(vendedora_id); }
  if (cliente_id) { query += ' AND vt.cliente_id = ?'; params.push(cliente_id); }
  if (periodo) { query += " AND strftime('%Y-%m', vt.fecha_venta) = ?"; params.push(periodo); }
  query += ' ORDER BY vt.fecha_venta DESC';
  res.json(db.prepare(query).all(...params));
});

// Resumen por vendedora
router.get('/resumen', (req, res) => {
  const db = getDb();
  const { periodo } = req.query;
  let query = `
    SELECT v.id as vendedora_id, u.nombre as vendedora_nombre,
           COUNT(vt.id) as num_ventas,
           SUM(vt.monto) as total_monto,
           SUM(vt.comision_monto) as total_comision,
           SUM(CASE WHEN vt.comision_pagada = 1 THEN vt.comision_monto ELSE 0 END) as comision_pagada
    FROM vendedoras v
    JOIN usuarios u ON v.usuario_id = u.id
    LEFT JOIN ventas vt ON vt.vendedora_id = v.id
  `;
  const params = [];
  if (periodo) { query += " AND strftime('%Y-%m', vt.fecha_venta) = ?"; params.push(periodo); }
  query += ' GROUP BY v.id, u.nombre ORDER BY total_monto DESC';
  res.json(db.prepare(query).all(...params));
});

// Obtener venta
router.get('/:id', (req, res) => {
  const db = getDb();
  const venta = db.prepare(`
    SELECT vt.*, c.nombre as cliente_nombre, p.nombre as proyecto_nombre,
           u.nombre as vendedora_nombre
    FROM ventas vt
    LEFT JOIN clientes c ON vt.cliente_id = c.id
    LEFT JOIN proyectos p ON vt.proyecto_id = p.id
    LEFT JOIN vendedoras v ON vt.vendedora_id = v.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE vt.id = ?
  `).get(req.params.id);
  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
  res.json(venta);
});

// Crear venta
router.post('/', (req, res) => {
  const { folio, cliente_id, proyecto_id, presupuesto_id, vendedora_id, monto, unidades, fecha_venta, notas } = req.body;
  if (!folio || !cliente_id || !vendedora_id) return res.status(400).json({ error: 'Datos incompletos' });
  const db = getDb();

  const vendedora = db.prepare('SELECT * FROM vendedoras WHERE id = ?').get(vendedora_id);
  if (!vendedora) return res.status(404).json({ error: 'Vendedora no encontrada' });

  const comision_monto = calcularComision(vendedora, monto, unidades);

  try {
    const result = db.prepare(`
      INSERT INTO ventas (folio, cliente_id, proyecto_id, presupuesto_id, vendedora_id, monto, unidades, comision_monto, fecha_venta, notas)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(folio, cliente_id, proyecto_id || null, presupuesto_id || null, vendedora_id,
      monto || 0, unidades || 0, comision_monto, fecha_venta || new Date().toISOString(), notas);

    // Update objetivo alcanzado
    const periodo = (fecha_venta || new Date().toISOString()).substring(0, 7);
    const objetivo = db.prepare(
      "SELECT id FROM objetivos_vendedoras WHERE vendedora_id = ? AND periodo = ? AND tipo = 'monto'"
    ).get(vendedora_id, periodo);
    if (objetivo) {
      const totalMes = db.prepare(
        "SELECT SUM(monto) as total FROM ventas WHERE vendedora_id = ? AND strftime('%Y-%m', fecha_venta) = ?"
      ).get(vendedora_id, periodo);
      db.prepare('UPDATE objetivos_vendedoras SET alcanzado = ? WHERE id = ?')
        .run(totalMes?.total || 0, objetivo.id);
    }

    res.json({ id: result.lastInsertRowid, comision_monto });
  } catch (err) {
    res.status(400).json({ error: 'El folio ya existe' });
  }
});

// Actualizar venta
router.put('/:id', (req, res) => {
  const { folio, cliente_id, proyecto_id, presupuesto_id, vendedora_id, monto, unidades, fecha_venta, notas } = req.body;
  const db = getDb();

  const vendedora = db.prepare('SELECT * FROM vendedoras WHERE id = ?').get(vendedora_id);
  if (!vendedora) return res.status(404).json({ error: 'Vendedora no encontrada' });
  const comision_monto = calcularComision(vendedora, monto, unidades);

  db.prepare(`
    UPDATE ventas SET folio=?, cliente_id=?, proyecto_id=?, presupuesto_id=?, vendedora_id=?,
    monto=?, unidades=?, comision_monto=?, fecha_venta=?, notas=? WHERE id=?
  `).run(folio, cliente_id, proyecto_id || null, presupuesto_id || null, vendedora_id,
    monto || 0, unidades || 0, comision_monto, fecha_venta, notas, req.params.id);
  res.json({ ok: true, comision_monto });
});

// Marcar comisión como pagada (solo admin)
router.patch('/:id/pagar-comision', (req, res) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const db = getDb();
  db.prepare('UPDATE ventas SET comision_pagada = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
