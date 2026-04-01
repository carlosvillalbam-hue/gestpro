const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const { estado, cliente_id } = req.query;
  let query = `
    SELECT p.*, c.nombre as cliente_nombre, u.nombre as responsable_nombre
    FROM proyectos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    LEFT JOIN usuarios u ON p.responsable_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { query += ' AND p.estado = ?'; params.push(estado); }
  if (cliente_id) { query += ' AND p.cliente_id = ?'; params.push(cliente_id); }
  query += ' ORDER BY p.created_at DESC';
  const proyectos = db.prepare(query).all(...params);
  res.json(proyectos);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const proyecto = db.prepare(`
    SELECT p.*, c.nombre as cliente_nombre, u.nombre as responsable_nombre, ct.numero as contrato_numero
    FROM proyectos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    LEFT JOIN usuarios u ON p.responsable_id = u.id
    LEFT JOIN contratos ct ON p.contrato_id = ct.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(proyecto);
});

router.post('/', (req, res) => {
  const { folio, nombre, serie, descripcion, cliente_id, contrato_id, responsable_id, fecha_inicio, fecha_fin_estimada } = req.body;
  if (!folio || !nombre) return res.status(400).json({ error: 'Folio y nombre requeridos' });
  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO proyectos (folio, nombre, serie, descripcion, cliente_id, contrato_id, responsable_id, fecha_inicio, fecha_fin_estimada)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(folio, nombre, serie, descripcion, cliente_id, contrato_id, responsable_id, fecha_inicio, fecha_fin_estimada);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'El folio ya existe' });
  }
});

router.put('/:id', (req, res) => {
  const { folio, nombre, serie, descripcion, cliente_id, contrato_id, responsable_id, fecha_inicio, fecha_fin_estimada, estado, presupuesto_total } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE proyectos SET folio=?, nombre=?, serie=?, descripcion=?, cliente_id=?, contrato_id=?,
    responsable_id=?, fecha_inicio=?, fecha_fin_estimada=?, estado=?, presupuesto_total=? WHERE id=?
  `).run(folio, nombre, serie, descripcion, cliente_id, contrato_id, responsable_id, fecha_inicio, fecha_fin_estimada, estado, presupuesto_total, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare("UPDATE proyectos SET estado = 'archivado' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Resumen del proyecto
router.get('/:id/resumen', (req, res) => {
  const db = getDb();
  const presupuestos = db.prepare('SELECT estado, COUNT(*) as count, SUM(total) as total FROM presupuestos WHERE proyecto_id = ? GROUP BY estado').all(req.params.id);
  const oc = db.prepare('SELECT estado, COUNT(*) as count, SUM(total) as total FROM ordenes_compra WHERE proyecto_id = ? GROUP BY estado').all(req.params.id);
  const facturas = db.prepare('SELECT estado, COUNT(*) as count, SUM(total) as total FROM facturas WHERE proyecto_id = ? GROUP BY estado').all(req.params.id);
  res.json({ presupuestos, oc, facturas });
});

module.exports = router;
