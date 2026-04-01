const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

const VALID_TRANSITIONS = {
  borrador: ['enviado'],
  enviado: ['aprobado', 'no_aprobado'],
  no_aprobado: [], // use /revision to create new version
  aprobado: [],
};

function calcTotales(partidas, descuento) {
  const subtotal = partidas.reduce((s, p) => {
    const baseItem = (p.cantidad || 0) * (p.precio_unitario || 0);
    const descItem = baseItem * ((p.descuento || 0) / 100);
    return s + (baseItem - descItem);
  }, 0);
  const monto_descuento = subtotal * ((descuento || 0) / 100);
  const base = subtotal - monto_descuento;
  const iva = base * 0.16;
  const total = base + iva;
  return { subtotal, monto_descuento, iva, total };
}

// Listar presupuestos
router.get('/', (req, res) => {
  const db = getDb();
  const { proyecto_id, cliente_id, estado, vendedora_id } = req.query;
  let query = `
    SELECT p.*, pr.nombre as proyecto_nombre, pr.folio as proyecto_folio,
           c.nombre as cliente_nombre, u.nombre as vendedora_nombre
    FROM presupuestos p
    LEFT JOIN proyectos pr ON p.proyecto_id = pr.id
    LEFT JOIN clientes c ON p.cliente_id = c.id
    LEFT JOIN vendedoras v ON p.vendedora_id = v.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (proyecto_id) { query += ' AND p.proyecto_id = ?'; params.push(proyecto_id); }
  if (cliente_id) { query += ' AND p.cliente_id = ?'; params.push(cliente_id); }
  if (estado) { query += ' AND p.estado = ?'; params.push(estado); }
  if (vendedora_id) { query += ' AND p.vendedora_id = ?'; params.push(vendedora_id); }
  query += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// Obtener presupuesto
router.get('/:id', (req, res) => {
  const db = getDb();
  const presupuesto = db.prepare(`
    SELECT p.*, pr.nombre as proyecto_nombre, pr.folio as proyecto_folio,
           c.nombre as cliente_nombre, u.nombre as vendedora_nombre
    FROM presupuestos p
    LEFT JOIN proyectos pr ON p.proyecto_id = pr.id
    LEFT JOIN clientes c ON p.cliente_id = c.id
    LEFT JOIN vendedoras v ON p.vendedora_id = v.id
    LEFT JOIN usuarios u ON v.usuario_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  const partidas = db.prepare('SELECT * FROM presupuesto_partidas WHERE presupuesto_id = ?').all(req.params.id);
  res.json({ ...presupuesto, partidas });
});

// Crear presupuesto
router.post('/', (req, res) => {
  const { folio, proyecto_id, cliente_id, vendedora_id, nombre, descripcion, descuento, partidas, notas } = req.body;
  if (!folio || !proyecto_id || !nombre) return res.status(400).json({ error: 'Datos incompletos' });

  const db = getDb();
  const totales = calcTotales(partidas || [], descuento || 0);

  try {
    const result = db.prepare(`
      INSERT INTO presupuestos (folio, proyecto_id, cliente_id, vendedora_id, nombre, descripcion,
        subtotal, descuento, monto_descuento, iva, total, notas)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(folio, proyecto_id, cliente_id || null, vendedora_id || null, nombre, descripcion,
      totales.subtotal, descuento || 0, totales.monto_descuento, totales.iva, totales.total, notas);

    const id = result.lastInsertRowid;
    if (partidas && partidas.length) {
      const insertPartida = db.prepare(
        'INSERT INTO presupuesto_partidas (presupuesto_id, tipo, categoria, descripcion, unidad, cantidad, precio_unitario, descuento, total, inventario_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
      );
      for (const p of partidas) {
        const base = (p.cantidad || 1) * (p.precio_unitario || 0);
        const total = base - base * ((p.descuento || 0) / 100);
        insertPartida.run(id, p.tipo || 'servicio', p.categoria, p.descripcion, p.unidad,
          p.cantidad || 1, p.precio_unitario || 0, p.descuento || 0, total, p.inventario_id || null);
      }
    }
    res.json({ id, ...totales });
  } catch (err) {
    res.status(400).json({ error: 'El folio ya existe' });
  }
});

// Actualizar presupuesto (solo borrador o enviado)
router.put('/:id', (req, res) => {
  const { folio, proyecto_id, cliente_id, vendedora_id, nombre, descripcion, descuento, notas, partidas } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT estado FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  if (!['borrador', 'enviado'].includes(existing.estado)) {
    return res.status(422).json({ error: 'Solo se pueden editar presupuestos en borrador o enviado' });
  }

  const allPartidas = partidas || db.prepare('SELECT * FROM presupuesto_partidas WHERE presupuesto_id = ?').all(req.params.id);
  const totales = calcTotales(allPartidas, descuento || 0);

  db.prepare(`
    UPDATE presupuestos SET folio=?, proyecto_id=?, cliente_id=?, vendedora_id=?, nombre=?, descripcion=?,
    subtotal=?, descuento=?, monto_descuento=?, iva=?, total=?, notas=? WHERE id=?
  `).run(folio, proyecto_id, cliente_id || null, vendedora_id || null, nombre, descripcion,
    totales.subtotal, descuento || 0, totales.monto_descuento, totales.iva, totales.total, notas, req.params.id);

  if (partidas) {
    db.prepare('DELETE FROM presupuesto_partidas WHERE presupuesto_id = ?').run(req.params.id);
    const insertPartida = db.prepare(
      'INSERT INTO presupuesto_partidas (presupuesto_id, tipo, categoria, descripcion, unidad, cantidad, precio_unitario, descuento, total, inventario_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
    );
    for (const p of partidas) {
      const base = (p.cantidad || 1) * (p.precio_unitario || 0);
      const total = base - base * ((p.descuento || 0) / 100);
      insertPartida.run(req.params.id, p.tipo || 'servicio', p.categoria, p.descripcion, p.unidad,
        p.cantidad || 1, p.precio_unitario || 0, p.descuento || 0, total, p.inventario_id || null);
    }
  }
  res.json({ ok: true, ...totales });
});

// Cambiar estado (máquina de estados)
router.patch('/:id/estado', (req, res) => {
  const { estado } = req.body;
  const db = getDb();

  const presupuesto = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const allowed = VALID_TRANSITIONS[presupuesto.estado] || [];
  if (!allowed.includes(estado)) {
    return res.status(422).json({ error: `Transición inválida: ${presupuesto.estado} → ${estado}` });
  }

  const txn = db.transaction(() => {
    const updates = { fecha_envio: null, fecha_aprobacion: null, fecha_rechazo: null };
    if (estado === 'enviado') updates.fecha_envio = new Date().toISOString();
    if (estado === 'aprobado') updates.fecha_aprobacion = new Date().toISOString();
    if (estado === 'no_aprobado') updates.fecha_rechazo = new Date().toISOString();

    db.prepare(`
      UPDATE presupuestos SET estado=?,
        fecha_envio=COALESCE(?,fecha_envio),
        fecha_aprobacion=COALESCE(?,fecha_aprobacion),
        fecha_rechazo=COALESCE(?,fecha_rechazo)
      WHERE id=?
    `).run(estado, updates.fecha_envio, updates.fecha_aprobacion, updates.fecha_rechazo, req.params.id);

    // Auto-create requisicion when approved
    if (estado === 'aprobado') {
      const existingReq = db.prepare('SELECT id FROM requisiciones WHERE presupuesto_id = ?').get(presupuesto.id);
      if (!existingReq) {
        const folio = `REQ-${Date.now()}`;
        const reqResult = db.prepare(
          'INSERT INTO requisiciones (folio, presupuesto_id, proyecto_id, estado) VALUES (?,?,?,?)'
        ).run(folio, presupuesto.id, presupuesto.proyecto_id, 'pendiente');

        // Copy partidas to requisicion
        const partidas = db.prepare('SELECT * FROM presupuesto_partidas WHERE presupuesto_id = ?').all(presupuesto.id);
        const insertPart = db.prepare(
          'INSERT INTO requisicion_partidas (requisicion_id, descripcion, unidad, cantidad_solicitada) VALUES (?,?,?,?)'
        );
        for (const p of partidas) {
          insertPart.run(reqResult.lastInsertRowid, p.descripcion, p.unidad, p.cantidad || 0);
        }
      }
    }
  });
  txn();
  res.json({ ok: true });
});

// Nueva revisión (incrementa versión, vuelve a borrador)
router.post('/:id/revision', (req, res) => {
  const db = getDb();
  const presupuesto = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  if (presupuesto.estado !== 'no_aprobado') {
    return res.status(422).json({ error: 'Solo se puede revisar un presupuesto no aprobado' });
  }

  const nuevaVersion = (presupuesto.version || 1) + 1;
  db.prepare(
    "UPDATE presupuestos SET estado='borrador', version=?, fecha_envio=NULL, fecha_rechazo=NULL WHERE id=?"
  ).run(nuevaVersion, req.params.id);
  res.json({ ok: true, version: nuevaVersion });
});

// Eliminar (solo borrador)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT estado FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  if (existing.estado !== 'borrador') {
    return res.status(422).json({ error: 'Solo se pueden eliminar presupuestos en borrador' });
  }
  db.prepare('DELETE FROM presupuestos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
