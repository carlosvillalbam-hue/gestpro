const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const bcrypt = require('bcryptjs');

// POST /api/seed  — carga datos demo (solo si la DB está vacía o con ?force=true)
router.post('/', async (req, res) => {
  const secret = req.headers['x-seed-secret'];
  const validSecret = (process.env.SEED_SECRET || '').trim() || 'gestpro2024';
  if (secret !== validSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = getDb();
  const force = req.query.force === 'true';

  const clienteCount = db.prepare('SELECT COUNT(*) as n FROM clientes').get().n;
  if (clienteCount > 0 && !force) {
    return res.json({ ok: false, message: 'La DB ya tiene datos. Usa ?force=true para sobreescribir.' });
  }

  try {
    // Limpiar datos previos (excepto admin)
    db.exec(`
      DELETE FROM inventario_movimientos;
      DELETE FROM inventario;
      DELETE FROM oc_partidas;
      DELETE FROM ordenes_compra;
      DELETE FROM facturas;
      DELETE FROM presupuesto_partidas;
      DELETE FROM presupuestos;
      DELETE FROM proyectos;
      DELETE FROM contratos;
      DELETE FROM clientes;
      DELETE FROM proveedores;
      DELETE FROM usuarios WHERE email != 'admin@empresa.com';
    `);

    // Usuarios adicionales
    const hash = bcrypt.hashSync('demo123', 10);
    db.prepare('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)').run('Carlos Mendoza', 'carlos@empresa.com', hash, 'proyectos');
    db.prepare('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)').run('Laura Sánchez', 'laura@empresa.com', hash, 'compras');
    db.prepare('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?,?,?,?)').run('Miguel Torres', 'miguel@empresa.com', hash, 'almacen');

    // Clientes
    const c1 = db.prepare('INSERT INTO clientes (nombre, rfc, telefono, email, contacto) VALUES (?,?,?,?,?)').run('Constructora del Norte SA de CV', 'CNO850312', '667-123-4567', 'contacto@cnorte.mx', 'Ing. Roberto Flores').lastInsertRowid;
    const c2 = db.prepare('INSERT INTO clientes (nombre, rfc, telefono, email, contacto) VALUES (?,?,?,?,?)').run('Grupo Inmobiliario Pacífico', 'GIP920801', '669-456-7890', 'proyectos@gpacifico.com', 'Arq. Daniela Ruiz').lastInsertRowid;
    const c3 = db.prepare('INSERT INTO clientes (nombre, rfc, telefono, email, contacto) VALUES (?,?,?,?,?)').run('Municipio de Culiacán', 'MCU631115', '667-789-0123', 'obra@culiacan.gob.mx', 'Lic. Eduardo Leal').lastInsertRowid;

    // Contratos
    const ct1 = db.prepare('INSERT INTO contratos (numero, cliente_id, nombre, monto, fecha_inicio, fecha_fin, estado, alcance) VALUES (?,?,?,?,?,?,?,?)').run('CONT-2024-001', c1, 'Construcción Complejo Industrial Fase I', 8500000, '2024-01-15', '2024-12-31', 'activo', 'Construcción de nave industrial de 3,000 m2 con oficinas y almacén.').lastInsertRowid;
    const ct2 = db.prepare('INSERT INTO contratos (numero, cliente_id, nombre, monto, fecha_inicio, fecha_fin, estado, alcance) VALUES (?,?,?,?,?,?,?,?)').run('CONT-2024-002', c2, 'Desarrollo Residencial Los Pinos', 12000000, '2024-03-01', '2025-06-30', 'activo', 'Construcción de 24 viviendas unifamiliares.').lastInsertRowid;
    const ct3 = db.prepare('INSERT INTO contratos (numero, cliente_id, nombre, monto, fecha_inicio, fecha_fin, estado) VALUES (?,?,?,?,?,?,?)').run('CONT-2024-003', c3, 'Rehabilitación Av. Insurgentes Tramo 3', 3200000, '2024-06-01', '2024-11-30', 'activo').lastInsertRowid;

    // Proveedores
    const p1 = db.prepare('INSERT INTO proveedores (nombre, rfc, telefono, email, contacto, categoria) VALUES (?,?,?,?,?,?)').run('Materiales y Construcción MACO', 'MCM910423', '667-234-5678', 'ventas@maco.mx', 'Luis Herrera', 'Materiales').lastInsertRowid;
    const p2 = db.prepare('INSERT INTO proveedores (nombre, rfc, telefono, email, contacto, categoria) VALUES (?,?,?,?,?,?)').run('Ferretería Industrial del Pacífico', 'FIP880715', '667-345-6789', 'pedidos@fipac.mx', 'Ana González', 'Herramientas').lastInsertRowid;
    const p3 = db.prepare('INSERT INTO proveedores (nombre, rfc, telefono, email, contacto, categoria) VALUES (?,?,?,?,?,?)').run('Concretos Premezclados Sinaloa', 'CPS001201', '667-456-7891', 'ventas@cpsin.mx', 'Pedro Álvarez', 'Concreto').lastInsertRowid;
    const p4 = db.prepare('INSERT INTO proveedores (nombre, rfc, telefono, email, contacto, categoria) VALUES (?,?,?,?,?,?)').run('Electricidad Total SA', 'ETS951130', '669-567-8902', 'proyectos@etotal.mx', 'Rosa Medina', 'Electricidad').lastInsertRowid;

    // Proyectos
    const pr1 = db.prepare('INSERT INTO proyectos (folio, nombre, serie, cliente_id, contrato_id, fecha_inicio, fecha_fin_estimada, estado, descripcion) VALUES (?,?,?,?,?,?,?,?,?)').run('PRY-2024-001', 'Nave Industrial Constructora Norte', 'IND', c1, ct1, '2024-01-20', '2024-12-31', 'activo', 'Construcción de nave industrial 3,000 m2 con oficinas administrativas.').lastInsertRowid;
    const pr2 = db.prepare('INSERT INTO proyectos (folio, nombre, serie, cliente_id, contrato_id, fecha_inicio, fecha_fin_estimada, estado, descripcion) VALUES (?,?,?,?,?,?,?,?,?)').run('PRY-2024-002', 'Residencial Los Pinos - Etapa 1', 'RES', c2, ct2, '2024-03-10', '2024-12-15', 'activo', 'Primera etapa: 12 viviendas unifamiliares de 120 m2.').lastInsertRowid;
    const pr3 = db.prepare('INSERT INTO proyectos (folio, nombre, serie, cliente_id, contrato_id, fecha_inicio, fecha_fin_estimada, estado, descripcion) VALUES (?,?,?,?,?,?,?,?,?)').run('PRY-2024-003', 'Rehabilitación Av. Insurgentes T3', 'OBP', c3, ct3, '2024-06-05', '2024-11-30', 'activo', 'Rehabilitación de 2.3 km de avenida principal.').lastInsertRowid;
    const pr4 = db.prepare('INSERT INTO proyectos (folio, nombre, serie, cliente_id, fecha_inicio, fecha_fin_estimada, estado, descripcion) VALUES (?,?,?,?,?,?,?,?)').run('PRY-2023-018', 'Bodega Logística Aeropuerto', 'IND', c1, '2023-08-01', '2024-02-28', 'terminado', 'Bodega logística 1,500 m2.').lastInsertRowid;

    // Presupuestos
    const pres1 = db.prepare('INSERT INTO presupuestos (folio, proyecto_id, nombre, mano_obra, materiales, equipos, costos_indirectos, total, estado, notas) VALUES (?,?,?,?,?,?,?,?,?,?)').run('PRES-2024-001', pr1, 'Estructura y Cimentación Nave Industrial', 850000, 1200000, 320000, 180000, 2550000, 'aprobado', 'Incluye cimentación corrida, columnas metálicas y cubierta.').lastInsertRowid;
    const pres2 = db.prepare('INSERT INTO presupuestos (folio, proyecto_id, nombre, mano_obra, materiales, equipos, costos_indirectos, total, estado, notas) VALUES (?,?,?,?,?,?,?,?,?,?)').run('PRES-2024-002', pr1, 'Instalaciones Eléctricas e Hidráulicas', 280000, 450000, 95000, 65000, 890000, 'enviado', 'Instalaciones eléctricas, hidráulicas y sanitarias.').lastInsertRowid;
    const pres3 = db.prepare('INSERT INTO presupuestos (folio, proyecto_id, nombre, mano_obra, materiales, equipos, costos_indirectos, total, estado, notas) VALUES (?,?,?,?,?,?,?,?,?,?)').run('PRES-2024-003', pr2, 'Residencial Los Pinos Etapa 1 Completa', 1200000, 1800000, 420000, 280000, 3700000, 'aprobado', '12 viviendas unifamiliares tipo A de 120 m2.').lastInsertRowid;
    const pres4 = db.prepare('INSERT INTO presupuestos (folio, proyecto_id, nombre, mano_obra, materiales, equipos, costos_indirectos, total, estado) VALUES (?,?,?,?,?,?,?,?,?)').run('PRES-2024-004', pr3, 'Rehabilitación Insurgentes - Pavimento', 380000, 620000, 210000, 90000, 1300000, 'aprobado').lastInsertRowid;
    const pres5 = db.prepare('INSERT INTO presupuestos (folio, proyecto_id, nombre, mano_obra, materiales, equipos, costos_indirectos, total, estado) VALUES (?,?,?,?,?,?,?,?,?)').run('PRES-2024-005', pr1, 'Acabados Nave Industrial', 195000, 310000, 45000, 50000, 600000, 'borrador').lastInsertRowid;

    // Órdenes de Compra
    const oc1 = db.prepare('INSERT INTO ordenes_compra (folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total, estado, fecha_envio, fecha_entrega_estimada, fecha_recepcion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('OC-2024-001', pr1, pres1, p3, "Concreto premezclado f'c=250 kg/cm2", 380000, 0, 440800, 'completamente_recibida', '2024-02-01', '2024-02-15', '2024-02-14').lastInsertRowid;
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc1, "Concreto f'c=250 kg/cm2", 'm3', 280, 280, 1357, 380000);

    const oc2 = db.prepare('INSERT INTO ordenes_compra (folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total, estado, fecha_envio, fecha_entrega_estimada, fecha_recepcion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('OC-2024-002', pr1, pres1, p1, 'Varilla corrugada y malla electrosoldada', 420000, 0, 487200, 'completamente_recibida', '2024-02-05', '2024-02-20', '2024-02-19').lastInsertRowid;
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc2, 'Varilla 3/8" corrugada', 'ton', 18, 18, 15000, 270000);
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc2, 'Varilla 1/2" corrugada', 'ton', 12, 12, 15500, 186000);

    const oc3 = db.prepare('INSERT INTO ordenes_compra (folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total, estado, fecha_envio, fecha_entrega_estimada) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('OC-2024-003', pr2, pres3, p1, 'Materiales para cimentaciones residencial', 560000, 0, 649600, 'parcialmente_recibida', '2024-03-15', '2024-04-01').lastInsertRowid;
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc3, 'Block de concreto 15x20x40', 'pza', 45000, 22000, 8.5, 382500);
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc3, 'Cemento Portland 50kg', 'saco', 2400, 1200, 185, 444000);

    const oc4 = db.prepare('INSERT INTO ordenes_compra (folio, proyecto_id, presupuesto_id, proveedor_id, descripcion, subtotal, iva, total, estado, fecha_envio, fecha_entrega_estimada) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('OC-2024-004', pr3, pres4, p3, 'Concreto asfáltico para pavimentación', 290000, 0, 336400, 'enviada', '2024-07-01', '2024-07-20').lastInsertRowid;
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc4, 'Mezcla asfáltica en caliente', 'ton', 580, 0, 500, 290000);

    const oc5 = db.prepare('INSERT INTO ordenes_compra (folio, proyecto_id, proveedor_id, descripcion, subtotal, iva, total, estado, fecha_envio, fecha_entrega_estimada) VALUES (?,?,?,?,?,?,?,?,?,?)').run('OC-2024-005', pr1, p4, 'Materiales eléctricos nave industrial', 185000, 0, 214600, 'enviada', '2024-08-01', '2024-08-15').lastInsertRowid;
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc5, 'Cable THW calibre 10', 'm', 3000, 0, 28, 84000);
    db.prepare('INSERT INTO oc_partidas (oc_id, descripcion, unidad, cantidad_pedida, cantidad_recibida, precio_unitario, total) VALUES (?,?,?,?,?,?,?)').run(oc5, 'Tablero eléctrico 200A', 'pza', 4, 0, 12500, 50000);

    // Inventario
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, proyecto_id, ubicacion) VALUES (?,?,?,?,?,?,?,?)').run('MAT-001', 'Varilla 3/8" corrugada', 'kg', 2500, 500, 15, pr1, 'almacen');
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, proyecto_id, ubicacion) VALUES (?,?,?,?,?,?,?,?)').run('MAT-002', 'Varilla 1/2" corrugada', 'kg', 1800, 400, 17, pr1, 'almacen');
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, ubicacion) VALUES (?,?,?,?,?,?,?)').run('MAT-003', 'Cemento Portland 50kg', 'saco', 320, 100, 185, 'almacen');
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, proyecto_id, ubicacion) VALUES (?,?,?,?,?,?,?,?)').run('MAT-004', 'Block de concreto 15x20x40', 'pza', 18500, 5000, 8.5, pr2, 'proyecto');
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, proyecto_id, ubicacion) VALUES (?,?,?,?,?,?,?,?)').run('MAT-005', 'Cable THW calibre 10', 'm', 1200, 300, 28, pr1, 'almacen');
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, ubicacion) VALUES (?,?,?,?,?,?,?)').run('HER-001', 'Mezcladora de concreto 1 saco', 'pza', 3, 1, 8500, 'almacen');
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, ubicacion) VALUES (?,?,?,?,?,?,?)').run('HER-002', 'Andamio tubular 1.5m', 'pza', 48, 10, 1200, 'proyecto');
    db.prepare('INSERT INTO inventario (codigo, descripcion, unidad, cantidad, stock_minimo, costo_unitario, ubicacion) VALUES (?,?,?,?,?,?,?)').run('MAT-006', 'Pintura vinílica blanca cubeta 19L', 'cubeta', 24, 6, 680, 'almacen');

    // Facturas
    db.prepare('INSERT INTO facturas (folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total, estado, fecha_emision, fecha_pago, porcentaje_avance) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('FAC-2024-001', pr1, pres1, c1, 'Estimación 1 - Cimentación y trazo', 680000, 16, 788800, 'pagada', '2024-03-01', '2024-03-15', 28);
    db.prepare('INSERT INTO facturas (folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total, estado, fecha_emision, fecha_pago, porcentaje_avance) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('FAC-2024-002', pr1, pres1, c1, 'Estimación 2 - Estructura metálica', 920000, 16, 1067200, 'pagada', '2024-05-01', '2024-05-20', 55);
    db.prepare('INSERT INTO facturas (folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total, estado, fecha_emision, fecha_pago, porcentaje_avance) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('FAC-2024-003', pr2, pres3, c2, 'Anticipo Residencial Los Pinos Etapa 1', 900000, 16, 1044000, 'pagada', '2024-03-10', '2024-03-25', 25);
    db.prepare('INSERT INTO facturas (folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total, estado, fecha_emision, porcentaje_avance) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('FAC-2024-004', pr2, pres3, c2, 'Estimación 1 - Cimentaciones 12 viviendas', 780000, 16, 904800, 'emitida', '2024-06-01', 45);
    db.prepare('INSERT INTO facturas (folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total, estado, fecha_emision, porcentaje_avance) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('FAC-2024-005', pr3, pres4, c3, 'Estimación 1 - Demolición y subrasante', 420000, 16, 487200, 'emitida', '2024-07-15', 35);
    db.prepare('INSERT INTO facturas (folio, proyecto_id, presupuesto_id, cliente_id, descripcion, subtotal, iva, total, estado, porcentaje_avance) VALUES (?,?,?,?,?,?,?,?,?,?)').run('FAC-2024-006', pr1, pres1, c1, 'Estimación 3 - Cubierta y cerramiento', 540000, 16, 626400, 'pendiente', 72);

    const counts = {
      clientes: db.prepare('SELECT COUNT(*) as n FROM clientes').get().n,
      proyectos: db.prepare('SELECT COUNT(*) as n FROM proyectos').get().n,
      presupuestos: db.prepare('SELECT COUNT(*) as n FROM presupuestos').get().n,
      oc: db.prepare('SELECT COUNT(*) as n FROM ordenes_compra').get().n,
      inventario: db.prepare('SELECT COUNT(*) as n FROM inventario').get().n,
      facturas: db.prepare('SELECT COUNT(*) as n FROM facturas').get().n,
    };

    res.json({ ok: true, message: '¡Datos demo cargados!', counts });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
