const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Listar presupuestos
router.get('/', (req, res) => {
  const db = getDb();
  const { proyecto_id, estado } = req.query;
  let query = `
    SELECT p.*,
           pr.nombre as proyecto_nombre, pr.folio as proyecto_folio, pr.cliente_id,
           c.nombre as cliente_nombre
    FROM presupuestos p
    LEFT JOIN proyectos pr ON p.proyecto_id = pr.id
    LEFT JOIN clientes c ON pr.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (proyecto_id) { query += ' AND p.proyecto_id = ?'; params.push(proyecto_id); }
  if (estado) { query += ' AND p.estado = ?'; params.push(estado); }
  query += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// Obtener presupuesto por ID con partidas
router.get('/:id', (req, res) => {
  const db = getDb();
  const presupuesto = db.prepare(`
    SELECT p.*,
           pr.nombre as proyecto_nombre, pr.folio as proyecto_folio, pr.cliente_id,
           c.nombre as cliente_nombre
    FROM presupuestos p
    LEFT JOIN proyectos pr ON p.proyecto_id = pr.id
    LEFT JOIN clientes c ON pr.cliente_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  const partidas = db.prepare('SELECT * FROM presupuesto_partidas WHERE presupuesto_id = ?').all(req.params.id);
  res.json({ ...presupuesto, partidas });
});

// Crear presupuesto
router.post('/', (req, res) => {
  const { folio, proyecto_id, nombre, descripcion, mano_obra, materiales, equipos, costos_indirectos, notas, partidas } = req.body;
  if (!folio || !proyecto_id || !nombre) return res.status(400).json({ error: 'Folio, proyecto y nombre son requeridos' });
  const db = getDb();
  const total = (Number(mano_obra) || 0) + (Number(materiales) || 0) + (Number(equipos) || 0) + (Number(costos_indirectos) || 0);
  try {
    const result = db.prepare(`
      INSERT INTO presupuestos (folio, proyecto_id, nombre, descripcion, mano_obra, materiales, equipos, costos_indirectos, total, notas)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(folio, proyecto_id, nombre, descripcion, mano_obra || 0, materiales || 0, equipos || 0, costos_indirectos || 0, total, notas);
    const id = result.lastInsertRowid;
    if (partidas && partidas.length) {
      const ins = db.prepare('INSERT INTO presupuesto_partidas (presupuesto_id, categoria, descripcion, unidad, cantidad, precio_unitario, total) VALUES (?,?,?,?,?,?,?)');
      for (const p of partidas) {
        ins.run(id, p.categoria, p.descripcion, p.unidad, p.cantidad || 1, p.precio_unitario || 0, (p.cantidad || 1) * (p.precio_unitario || 0));
      }
    }
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: 'El folio ya existe' });
  }
});

// Actualizar presupuesto
router.put('/:id', (req, res) => {
  const { folio, proyecto_id, nombre, descripcion, mano_obra, materiales, equipos, costos_indirectos, estado, notas, partidas } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  const total = (Number(mano_obra) || 0) + (Number(materiales) || 0) + (Number(equipos) || 0) + (Number(costos_indirectos) || 0);
  db.prepare(`
    UPDATE presupuestos SET folio=?, proyecto_id=?, nombre=?, descripcion=?,
    mano_obra=?, materiales=?, equipos=?, costos_indirectos=?, total=?, estado=?, notas=?
    WHERE id=?
  `).run(folio, proyecto_id, nombre, descripcion, mano_obra || 0, materiales || 0, equipos || 0, costos_indirectos || 0, total || existing.total, estado || existing.estado, notas, req.params.id);

  if (partidas) {
    db.prepare('DELETE FROM presupuesto_partidas WHERE presupuesto_id = ?').run(req.params.id);
    const ins = db.prepare('INSERT INTO presupuesto_partidas (presupuesto_id, categoria, descripcion, unidad, cantidad, precio_unitario, total) VALUES (?,?,?,?,?,?,?)');
    for (const p of partidas) {
      ins.run(req.params.id, p.categoria, p.descripcion, p.unidad, p.cantidad || 1, p.precio_unitario || 0, (p.cantidad || 1) * (p.precio_unitario || 0));
    }
  }
  res.json({ ok: true });
});

// Cambiar solo el estado
router.patch('/:id/estado', (req, res) => {
  const { estado } = req.body;
  const db = getDb();
  const presupuesto = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'No encontrado' });
  const updates = {};
  if (estado === 'enviado') updates.fecha_envio = new Date().toISOString();
  if (estado === 'aprobado') updates.fecha_aprobacion = new Date().toISOString();
  db.prepare('UPDATE presupuestos SET estado=?, fecha_envio=COALESCE(?,fecha_envio), fecha_aprobacion=COALESCE(?,fecha_aprobacion) WHERE id=?')
    .run(estado, updates.fecha_envio || null, updates.fecha_aprobacion || null, req.params.id);
  res.json({ ok: true });
});

// Vincular proyecto (usado al convertir presupuesto a proyecto)
router.patch('/:id/vincular-proyecto', (req, res) => {
  const { proyecto_id } = req.body;
  const db = getDb();
  db.prepare('UPDATE presupuestos SET proyecto_id=?, estado=? WHERE id=?')
    .run(proyecto_id, 'aprobado', req.params.id);
  res.json({ ok: true });
});

// Eliminar (solo borrador)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT estado FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM presupuesto_partidas WHERE presupuesto_id = ?').run(req.params.id);
  db.prepare('DELETE FROM presupuestos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
