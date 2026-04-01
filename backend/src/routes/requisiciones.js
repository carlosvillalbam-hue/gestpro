const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Listar requisiciones
router.get('/', (req, res) => {
  const db = getDb();
  const { proyecto_id, estado } = req.query;
  let query = `
    SELECT r.*, p.nombre as proyecto_nombre, p.folio as proyecto_folio,
           pre.folio as presupuesto_folio, pre.nombre as presupuesto_nombre
    FROM requisiciones r
    JOIN proyectos p ON r.proyecto_id = p.id
    JOIN presupuestos pre ON r.presupuesto_id = pre.id
    WHERE 1=1
  `;
  const params = [];
  if (proyecto_id) { query += ' AND r.proyecto_id = ?'; params.push(proyecto_id); }
  if (estado) { query += ' AND r.estado = ?'; params.push(estado); }
  query += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// Obtener requisicion con partidas y OC vinculadas
router.get('/:id', (req, res) => {
  const db = getDb();
  const req_ = db.prepare(`
    SELECT r.*, p.nombre as proyecto_nombre, p.folio as proyecto_folio,
           pre.folio as presupuesto_folio, pre.nombre as presupuesto_nombre, pre.total as presupuesto_total
    FROM requisiciones r
    JOIN proyectos p ON r.proyecto_id = p.id
    JOIN presupuestos pre ON r.presupuesto_id = pre.id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!req_) return res.status(404).json({ error: 'Requisición no encontrada' });

  const partidas = db.prepare('SELECT * FROM requisicion_partidas WHERE requisicion_id = ?').all(req.params.id);
  const ocs = db.prepare(`
    SELECT oc.*, prov.nombre as proveedor_nombre
    FROM ordenes_compra oc
    LEFT JOIN proveedores prov ON oc.proveedor_id = prov.id
    WHERE oc.requisicion_id = ?
    ORDER BY oc.created_at DESC
  `).all(req.params.id);

  res.json({ ...req_, partidas, ocs });
});

// Actualizar estado/notas
router.put('/:id', (req, res) => {
  const { estado, notas } = req.body;
  const db = getDb();
  const VALID_STATES = ['pendiente', 'en_proceso', 'completa'];
  if (estado && !VALID_STATES.includes(estado)) {
    return res.status(422).json({ error: 'Estado inválido' });
  }
  db.prepare('UPDATE requisiciones SET estado=COALESCE(?,estado), notas=COALESCE(?,notas) WHERE id=?')
    .run(estado || null, notas !== undefined ? notas : null, req.params.id);
  res.json({ ok: true });
});

// Actualizar partida (fuente de abasto, cantidades)
router.patch('/:id/partidas/:pid', (req, res) => {
  const { fuente_abasto, cantidad_oc, cantidad_inventario } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE requisicion_partidas
    SET fuente_abasto=COALESCE(?,fuente_abasto),
        cantidad_oc=COALESCE(?,cantidad_oc),
        cantidad_inventario=COALESCE(?,cantidad_inventario)
    WHERE id=? AND requisicion_id=?
  `).run(fuente_abasto || null, cantidad_oc ?? null, cantidad_inventario ?? null, req.params.pid, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
