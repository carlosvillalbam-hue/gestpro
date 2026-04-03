const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Configurar multer para archivos PO
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `po_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

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
  const { folio, nombre, serie, descripcion, cliente_id, contrato_id, responsable_id,
          fecha_inicio, fecha_fin_estimada, po_numero, presupuesto_origen_id } = req.body;
  if (!folio || !nombre) return res.status(400).json({ error: 'Folio y nombre requeridos' });
  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO proyectos (folio, nombre, serie, descripcion, cliente_id, contrato_id,
        responsable_id, fecha_inicio, fecha_fin_estimada, po_numero, presupuesto_origen_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      folio, nombre, serie || null, descripcion || null,
      cliente_id || null, contrato_id || null, responsable_id || null,
      fecha_inicio || null, fecha_fin_estimada || null,
      po_numero || null, presupuesto_origen_id || null
    );
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('Error creando proyecto:', err.message);
    res.status(400).json({ error: err.message || 'El folio ya existe' });
  }
});

router.put('/:id', (req, res) => {
  const { folio, nombre, serie, descripcion, cliente_id, contrato_id, responsable_id,
          fecha_inicio, fecha_fin_estimada, estado, presupuesto_total, po_numero } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE proyectos SET folio=?, nombre=?, serie=?, descripcion=?, cliente_id=?, contrato_id=?,
    responsable_id=?, fecha_inicio=?, fecha_fin_estimada=?, estado=?, presupuesto_total=?, po_numero=?
    WHERE id=?
  `).run(folio, nombre, serie || null, descripcion || null,
         cliente_id || null, contrato_id || null, responsable_id || null,
         fecha_inicio || null, fecha_fin_estimada || null,
         estado, presupuesto_total || null, po_numero || null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare("UPDATE proyectos SET estado = 'archivado' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Subir documento PO
router.post('/:id/po-documento', upload.single('documento'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  const db = getDb();
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  db.prepare('UPDATE proyectos SET po_documento=? WHERE id=?')
    .run(JSON.stringify({ filename, originalName }), req.params.id);
  res.json({ ok: true, filename, originalName });
});

// Descargar documento PO
router.get('/:id/po-documento', (req, res) => {
  const db = getDb();
  const proyecto = db.prepare('SELECT po_documento FROM proyectos WHERE id=?').get(req.params.id);
  if (!proyecto?.po_documento) return res.status(404).json({ error: 'Sin documento' });
  try {
    const { filename, originalName } = JSON.parse(proyecto.po_documento);
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.download(filePath, originalName);
  } catch {
    res.status(500).json({ error: 'Error al leer documento' });
  }
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
