const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Dashboard general
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const proyectos_activos = db.prepare("SELECT COUNT(*) as count FROM proyectos WHERE estado = 'activo'").get();
  const proyectos_total = db.prepare('SELECT COUNT(*) as count FROM proyectos').get();
  const presupuestos_pendientes = db.prepare("SELECT COUNT(*) as count FROM presupuestos WHERE estado = 'borrador' OR estado = 'enviado'").get();
  const presupuestos_aprobados = db.prepare("SELECT COUNT(*) as count, SUM(total) as total FROM presupuestos WHERE estado = 'aprobado'").get();
  const oc_pendientes = db.prepare("SELECT COUNT(*) as count FROM ordenes_compra WHERE estado = 'enviada' OR estado = 'parcialmente_recibida'").get();
  const oc_total = db.prepare("SELECT SUM(total) as total FROM ordenes_compra WHERE estado != 'cancelada'").get();
  const facturas_mes = db.prepare(`
    SELECT COUNT(*) as count, SUM(total) as total
    FROM facturas
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get();
  const facturas_cobradas = db.prepare("SELECT SUM(total) as total FROM facturas WHERE estado = 'pagada'").get();

  res.json({
    proyectos: { activos: proyectos_activos.count, total: proyectos_total.count },
    presupuestos: { pendientes: presupuestos_pendientes.count, aprobados: presupuestos_aprobados },
    ordenes_compra: { pendientes: oc_pendientes.count, total_monto: oc_total.total || 0 },
    facturas: { mes: facturas_mes, cobradas: facturas_cobradas.total || 0 }
  });
});

// Reporte presupuestos
router.get('/presupuestos', (req, res) => {
  const db = getDb();
  const { estado, cliente_id, proyecto_id } = req.query;
  let query = `
    SELECT p.*, pr.nombre as proyecto_nombre, pr.folio as proyecto_folio, c.nombre as cliente_nombre
    FROM presupuestos p
    LEFT JOIN proyectos pr ON p.proyecto_id = pr.id
    LEFT JOIN clientes c ON pr.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { query += ' AND p.estado = ?'; params.push(estado); }
  if (cliente_id) { query += ' AND pr.cliente_id = ?'; params.push(cliente_id); }
  if (proyecto_id) { query += ' AND p.proyecto_id = ?'; params.push(proyecto_id); }
  query += ' ORDER BY p.created_at DESC';
  const datos = db.prepare(query).all(...params);
  const resumen = {
    total: datos.length,
    monto_total: datos.reduce((s, d) => s + (d.total || 0), 0),
    por_estado: {}
  };
  datos.forEach(d => {
    resumen.por_estado[d.estado] = (resumen.por_estado[d.estado] || 0) + 1;
  });
  res.json({ datos, resumen });
});

// Reporte inventario
router.get('/inventario', (req, res) => {
  const db = getDb();
  const { proyecto_id } = req.query;
  let query = `
    SELECT i.*, p.nombre as proyecto_nombre
    FROM inventario i
    LEFT JOIN proyectos p ON i.proyecto_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (proyecto_id) { query += ' AND i.proyecto_id = ?'; params.push(proyecto_id); }
  const datos = db.prepare(query).all(...params);
  const resumen = {
    total_articulos: datos.length,
    valor_total: datos.reduce((s, d) => s + (d.cantidad * d.costo_unitario), 0)
  };
  res.json({ datos, resumen });
});

// Reporte OC pendientes de recibir
router.get('/oc-pendientes', (req, res) => {
  const db = getDb();
  const datos = db.prepare(`
    SELECT oc.*, p.nombre as proyecto_nombre, pr.nombre as proveedor_nombre
    FROM ordenes_compra oc
    LEFT JOIN proyectos p ON oc.proyecto_id = p.id
    LEFT JOIN proveedores pr ON oc.proveedor_id = pr.id
    WHERE oc.estado IN ('enviada', 'parcialmente_recibida')
    ORDER BY oc.fecha_entrega_estimada ASC
  `).all();
  res.json(datos);
});

// Reporte facturación por mes
router.get('/facturacion-mensual', (req, res) => {
  const db = getDb();
  const datos = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as mes,
           COUNT(*) as cantidad,
           SUM(total) as total,
           SUM(CASE WHEN estado='pagada' THEN total ELSE 0 END) as cobrado
    FROM facturas
    GROUP BY mes
    ORDER BY mes DESC
    LIMIT 12
  `).all();
  res.json(datos);
});

// Resumen por proyecto
router.get('/proyectos-avance', (req, res) => {
  const db = getDb();
  const proyectos = db.prepare(`
    SELECT p.id, p.folio, p.nombre, p.estado, c.nombre as cliente_nombre
    FROM proyectos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.estado != 'archivado'
    ORDER BY p.created_at DESC
  `).all();

  const presRows = db.prepare(`
    SELECT proyecto_id, SUM(total) as total
    FROM presupuestos WHERE estado = 'aprobado'
    GROUP BY proyecto_id
  `).all();
  const ocRows = db.prepare(`
    SELECT proyecto_id, SUM(total) as total
    FROM ordenes_compra WHERE estado != 'cancelada'
    GROUP BY proyecto_id
  `).all();
  const facRows = db.prepare(`
    SELECT proyecto_id, SUM(total) as total
    FROM facturas GROUP BY proyecto_id
  `).all();
  const cobRows = db.prepare(`
    SELECT proyecto_id, SUM(total) as total
    FROM facturas WHERE estado = 'pagada'
    GROUP BY proyecto_id
  `).all();

  const toMap = rows => Object.fromEntries(rows.map(r => [r.proyecto_id, r.total]));
  const presMap = toMap(presRows);
  const ocMap = toMap(ocRows);
  const facMap = toMap(facRows);
  const cobMap = toMap(cobRows);

  const datos = proyectos.map(p => ({
    ...p,
    presupuesto_aprobado: presMap[p.id] || 0,
    total_compras: ocMap[p.id] || 0,
    total_facturado: facMap[p.id] || 0,
    total_cobrado: cobMap[p.id] || 0,
  }));

  res.json(datos);
});

module.exports = router;
