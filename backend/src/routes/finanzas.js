const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// ─── CUENTAS POR COBRAR ───────────────────────────────────────────────────────

router.get('/cuentas-cobrar', (req, res) => {
  const db = getDb();
  const { estado, cliente_id } = req.query;
  let query = `
    SELECT cc.*, f.folio as factura_folio, f.fecha_emision, f.cliente_id,
           c.nombre as cliente_nombre, p.nombre as proyecto_nombre
    FROM cuentas_cobrar cc
    JOIN facturas f ON cc.factura_id = f.id
    LEFT JOIN clientes c ON f.cliente_id = c.id
    LEFT JOIN proyectos p ON f.proyecto_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { query += ' AND cc.estado = ?'; params.push(estado); }
  if (cliente_id) { query += ' AND f.cliente_id = ?'; params.push(cliente_id); }
  query += ' ORDER BY cc.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/cuentas-cobrar/:id', (req, res) => {
  const db = getDb();
  const cuenta = db.prepare(`
    SELECT cc.*, f.folio as factura_folio, f.fecha_emision,
           c.nombre as cliente_nombre, p.nombre as proyecto_nombre
    FROM cuentas_cobrar cc
    JOIN facturas f ON cc.factura_id = f.id
    LEFT JOIN clientes c ON f.cliente_id = c.id
    LEFT JOIN proyectos p ON f.proyecto_id = p.id
    WHERE cc.id = ?
  `).get(req.params.id);
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const pagos = db.prepare('SELECT * FROM pagos_cobro WHERE cuenta_cobrar_id = ? ORDER BY fecha DESC').all(req.params.id);
  res.json({ ...cuenta, pagos });
});

router.post('/cuentas-cobrar/:id/pago', (req, res) => {
  const { monto, forma_pago, referencia, fecha, notas } = req.body;
  if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' });
  const db = getDb();

  const cuenta = db.prepare('SELECT * FROM cuentas_cobrar WHERE id = ?').get(req.params.id);
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (cuenta.estado === 'pagado') return res.status(400).json({ error: 'Cuenta ya pagada' });

  const nuevoMontoCobrado = (cuenta.monto_cobrado || 0) + monto;
  const nuevoSaldo = cuenta.monto - nuevoMontoCobrado;
  const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : nuevoMontoCobrado > 0 ? 'parcial' : 'pendiente';

  const txn = db.transaction(() => {
    db.prepare(
      'INSERT INTO pagos_cobro (cuenta_cobrar_id, monto, forma_pago, referencia, fecha, notas) VALUES (?,?,?,?,?,?)'
    ).run(req.params.id, monto, forma_pago, referencia, fecha || new Date().toISOString(), notas);

    db.prepare(
      "UPDATE cuentas_cobrar SET monto_cobrado=?, saldo=?, estado=?, updated_at=datetime('now') WHERE id=?"
    ).run(nuevoMontoCobrado, Math.max(0, nuevoSaldo), nuevoEstado, req.params.id);

    // Sync factura estado
    if (nuevoEstado === 'pagado') {
      db.prepare("UPDATE facturas SET estado='pagada', fecha_pago=? WHERE id=?")
        .run(fecha || new Date().toISOString(), cuenta.factura_id);
    }
  });
  txn();
  res.json({ ok: true, saldo: Math.max(0, nuevoSaldo), estado: nuevoEstado });
});

// ─── CUENTAS POR PAGAR ────────────────────────────────────────────────────────

router.get('/cuentas-pagar', (req, res) => {
  const db = getDb();
  const { estado, proveedor_id } = req.query;
  let query = `
    SELECT cp.*, oc.folio as oc_folio, oc.proveedor_id,
           prov.nombre as proveedor_nombre, p.nombre as proyecto_nombre
    FROM cuentas_pagar cp
    JOIN ordenes_compra oc ON cp.oc_id = oc.id
    LEFT JOIN proveedores prov ON oc.proveedor_id = prov.id
    LEFT JOIN proyectos p ON oc.proyecto_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { query += ' AND cp.estado = ?'; params.push(estado); }
  if (proveedor_id) { query += ' AND oc.proveedor_id = ?'; params.push(proveedor_id); }
  query += ' ORDER BY cp.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/cuentas-pagar/:id', (req, res) => {
  const db = getDb();
  const cuenta = db.prepare(`
    SELECT cp.*, oc.folio as oc_folio,
           prov.nombre as proveedor_nombre, p.nombre as proyecto_nombre
    FROM cuentas_pagar cp
    JOIN ordenes_compra oc ON cp.oc_id = oc.id
    LEFT JOIN proveedores prov ON oc.proveedor_id = prov.id
    LEFT JOIN proyectos p ON oc.proyecto_id = p.id
    WHERE cp.id = ?
  `).get(req.params.id);
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const pagos = db.prepare('SELECT * FROM pagos_pago WHERE cuenta_pagar_id = ? ORDER BY fecha DESC').all(req.params.id);
  res.json({ ...cuenta, pagos });
});

router.post('/cuentas-pagar/:id/pago', (req, res) => {
  const { monto, forma_pago, referencia, fecha, notas } = req.body;
  if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' });
  const db = getDb();

  const cuenta = db.prepare('SELECT * FROM cuentas_pagar WHERE id = ?').get(req.params.id);
  if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (cuenta.estado === 'pagado') return res.status(400).json({ error: 'Cuenta ya pagada' });

  const nuevoMontoPagado = (cuenta.monto_pagado || 0) + monto;
  const nuevoSaldo = cuenta.monto - nuevoMontoPagado;
  const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : nuevoMontoPagado > 0 ? 'parcial' : 'pendiente';

  const txn = db.transaction(() => {
    db.prepare(
      'INSERT INTO pagos_pago (cuenta_pagar_id, monto, forma_pago, referencia, fecha, notas) VALUES (?,?,?,?,?,?)'
    ).run(req.params.id, monto, forma_pago, referencia, fecha || new Date().toISOString(), notas);

    db.prepare(
      "UPDATE cuentas_pagar SET monto_pagado=?, saldo=?, estado=?, updated_at=datetime('now') WHERE id=?"
    ).run(nuevoMontoPagado, Math.max(0, nuevoSaldo), nuevoEstado, req.params.id);
  });
  txn();
  res.json({ ok: true, saldo: Math.max(0, nuevoSaldo), estado: nuevoEstado });
});

// ─── RESUMEN FINANCIERO ───────────────────────────────────────────────────────

router.get('/resumen', (req, res) => {
  const db = getDb();
  const cxc = db.prepare("SELECT SUM(saldo) as total, COUNT(*) as count FROM cuentas_cobrar WHERE estado != 'pagado'").get();
  const cxp = db.prepare("SELECT SUM(saldo) as total, COUNT(*) as count FROM cuentas_pagar WHERE estado != 'pagado'").get();
  const cxc_vencidas = db.prepare(
    "SELECT SUM(saldo) as total FROM cuentas_cobrar WHERE estado != 'pagado' AND fecha_vencimiento < datetime('now')"
  ).get();
  const cxp_vencidas = db.prepare(
    "SELECT SUM(saldo) as total FROM cuentas_pagar WHERE estado != 'pagado' AND fecha_vencimiento < datetime('now')"
  ).get();
  res.json({
    cxc: { total: cxc?.total || 0, count: cxc?.count || 0 },
    cxp: { total: cxp?.total || 0, count: cxp?.count || 0 },
    cxc_vencidas: cxc_vencidas?.total || 0,
    cxp_vencidas: cxp_vencidas?.total || 0,
    balance: (cxc?.total || 0) - (cxp?.total || 0),
  });
});

module.exports = router;
