const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const { proyecto_id, estado, proveedor_id } = req.query;
  let query = `
    SELECT oc.*, p.nombre as proyecto_nombre, p.folio as proyecto_folio,
           pr.nombre as proveedor_nombre, pres.folio as presupuesto_folio
    FROM ordenes_compra oc
    LEFT JOIN proyectos p ON oc.proyecto_id = p.id
    LEFT JOIN proveedores pr ON oc.proveedor_id = pr.id
    LEFT JOIN presupuestos pres ON oc.presupuesto_id = pres.id
    WHERE 1=1
  `;
  const params = [];
  if (proyecto_id) { query += ' AND oc.proyecto_id = ?'; params.push(proyecto_id); }
  if (estado) { query += ' AND oc.estado = ?'; params.push(estado); }
  if (proveedor_id) { query += ' AND oc.proveedor_id = ?'; params.push(proveedor_id); }
  query += ' ORDER BY oc.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const oc = db.prepare(`
    SELECT oc.*, p.nombre as proyecto_nombre, p.folio as proyecto_folio,
           pr.nombre as proveedor_nombre, pres.folio as presupuesto_folio
    FROM ordenes_compra oc
    LEFT JOIN proyectos p ON oc.proyecto_id = p.id
    LEFT JOIN proveedores pr ON oc.proveedor_id = pr.id
    LEFT JOIN presupuestos pres ON oc.presupuesto_id = pres.id
    WHERE oc.id = ?
  `).get(req.params.id);
  if (!oc) return res.status(404).json({ error: 'OC no encontrada' });
  const partidas = db.prepare('SELECT * FROM oc_partidas WHERE oc_id = ?').all(req.params.id);
  res.json({ ...oc, partidas });
});

router.post('/', (req, res) => {
  const { folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total, fecha_envio, fecha_entrega_estimada, notas, partidas } = req.body;
  if (!folio || !proyecto_id) return res.status(400).json({ error: 'Datos incompletos' });
  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO ordenes_compra (folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total, fecha_envio, fecha_entrega_estimada, notas)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal || 0, iva || 0, total || 0, fecha_envio, fecha_entrega_estimada, notas);

    const id = result.lastInsertRowid;
    if (partidas && partidas.length) {
      const ins = db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, precio_unitario, total) VALUES (?,?,?,?,?,?)');
      for (const p of partidas) {
        ins.run(id, p.descripcion, p.unidad, p.cantidad_pedida, p.precio_unitario, p.cantidad_pedida * p.precio_unitario);
      }
    }
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: 'El folio ya existe' });
  }
});

router.put('/:id', (req, res) => {
  const { folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total,
    estado, fecha_envio, fecha_entrega_estimada, fecha_recepcion, notas, partidas } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE ordenes_compra SET folio=?, proyecto_id=?, presupuesto_id=?, proveedor_id=?, descripcion=?,
    subtotal=?, iva=?, total=?, estado=?, fecha_envio=?, fecha_entrega_estimada=?, fecha_recepcion=?, notas=? WHERE id=?
  `).run(folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total,
    estado, fecha_envio, fecha_entrega_estimada, fecha_recepcion, notas, req.params.id);

  if (partidas) {
    db.prepare('DELETE FROM oc_partidas WHERE oc_id = ?').run(req.params.id);
    const ins = db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)');
    for (const p of partidas) {
      ins.run(req.params.id, p.descripcion, p.unidad, p.cantidad_pedida, p.cantidad_recibida || 0, p.precio_unitario, p.cantidad_pedida * p.precio_unitario);
    }
  }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare("UPDATE ordenes_compra SET estado = 'cancelada' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
