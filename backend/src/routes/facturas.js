const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const { proyecto_id, cliente_id, estado } = req.query;
  let query = `
    SELECT f.*, p.nombre as proyecto_nombre, p.folio as proyecto_folio,
           c.nombre as cliente_nombre, pres.folio as presupuesto_folio
    FROM facturas f
    LEFT JOIN proyectos p ON f.proyecto_id = p.id
    LEFT JOIN clientes c ON f.cliente_id = c.id
    LEFT JOIN presupuestos pres ON f.presupuesto_id = pres.id
    WHERE 1=1
  `;
  const params = [];
  if (proyecto_id) { query += ' AND f.proyecto_id = ?'; params.push(proyecto_id); }
  if (cliente_id) { query += ' AND f.cliente_id = ?'; params.push(cliente_id); }
  if (estado) { query += ' AND f.estado = ?'; params.push(estado); }
  query += ' ORDER BY f.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const factura = db.prepare(`
    SELECT f.*, p.nombre as proyecto_nombre, p.folio as proyecto_folio,
           c.nombre as cliente_nombre, pres.folio as presupuesto_folio
    FROM facturas f
    LEFT JOIN proyectos p ON f.proyecto_id = p.id
    LEFT JOIN clientes c ON f.cliente_id = c.id
    LEFT JOIN presupuestos pres ON f.presupuesto_id = pres.id
    WHERE f.id = ?
  `).get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  const cxc = db.prepare('SELECT * FROM cuentas_cobrar WHERE factura_id = ?').get(factura.id);
  res.json({ ...factura, cxc });
});

router.post('/', (req, res) => {
  const { folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total,
    fecha_emision, fecha_vencimiento, porcentaje_avance, cfdi_uuid, notas } = req.body;
  if (!folio || !proyecto_id) return res.status(400).json({ error: 'Datos incompletos' });
  const db = getDb();

  try {
    const txn = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO facturas (folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total,
          fecha_emision, fecha_vencimiento, porcentaje_avance, cfdi_uuid, notas)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(folio, proyecto_id, presupuesto_id || null, cliente_id || null, descripcion,
        subtotal || 0, iva || 0, total || 0, fecha_emision, fecha_vencimiento, porcentaje_avance || 0, cfdi_uuid, notas);

      const facturaId = result.lastInsertRowid;

      // Auto-create CxC
      if ((total || 0) > 0) {
        db.prepare(`
          INSERT INTO cuentas_cobrar (factura_id, monto, saldo, fecha_vencimiento)
          VALUES (?,?,?,?)
        `).run(facturaId, total, total, fecha_vencimiento || null);
      }
      return facturaId;
    });
    const id = txn();
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: 'El folio ya existe' });
  }
});

router.put('/:id', (req, res) => {
  const { folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total,
    fecha_emision, fecha_vencimiento, porcentaje_avance, cfdi_uuid, notas } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT estado FROM facturas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Factura no encontrada' });

  db.prepare(`
    UPDATE facturas SET folio=?, proyecto_id=?, presupuesto_id=?, cliente_id=?, descripcion=?,
    subtotal=?, iva=?, total=?, fecha_emision=?, fecha_vencimiento=?, porcentaje_avance=?, cfdi_uuid=?, notas=? WHERE id=?
  `).run(folio, proyecto_id, presupuesto_id || null, cliente_id || null, descripcion,
    subtotal || 0, iva || 0, total || 0, fecha_emision, fecha_vencimiento, porcentaje_avance || 0, cfdi_uuid, notas, req.params.id);

  // Update CxC monto if changed
  if (total) {
    const cxc = db.prepare('SELECT * FROM cuentas_cobrar WHERE factura_id = ?').get(req.params.id);
    if (cxc && cxc.estado === 'pendiente') {
      db.prepare('UPDATE cuentas_cobrar SET monto=?, saldo=?, fecha_vencimiento=? WHERE id=?')
        .run(total, total, fecha_vencimiento || cxc.fecha_vencimiento, cxc.id);
    }
  }

  res.json({ ok: true });
});

// Cambiar estado
router.patch('/:id/estado', (req, res) => {
  const { estado, fecha_pago } = req.body;
  const VALID = ['pendiente', 'enviada', 'pagada', 'vencida', 'cancelada'];
  if (!VALID.includes(estado)) return res.status(422).json({ error: 'Estado inválido' });
  const db = getDb();
  db.prepare('UPDATE facturas SET estado=?, fecha_pago=COALESCE(?,fecha_pago) WHERE id=?')
    .run(estado, fecha_pago || null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT estado FROM facturas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrada' });
  if (existing.estado !== 'pendiente') {
    return res.status(422).json({ error: 'Solo se pueden eliminar facturas pendientes' });
  }
  db.prepare('DELETE FROM cuentas_cobrar WHERE factura_id = ?').run(req.params.id);
  db.prepare('DELETE FROM facturas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
