const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const contratos = db.prepare(`
    SELECT c.*, cl.nombre as cliente_nombre
    FROM contratos c
    LEFT JOIN clientes cl ON c.cliente_id = cl.id
    ORDER BY c.created_at DESC
  `).all();
  res.json(contratos);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const contrato = db.prepare(`
    SELECT c.*, cl.nombre as cliente_nombre
    FROM contratos c
    LEFT JOIN clientes cl ON c.cliente_id = cl.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.json(contrato);
});

router.post('/', (req, res) => {
  const { numero, cliente_id, nombre, descripcion, monto, fecha_inicio, fecha_fin, vigencia, alcance, condiciones } = req.body;
  if (!numero || !cliente_id || !nombre) return res.status(400).json({ error: 'Datos incompletos' });
  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO contratos (numero, cliente_id, nombre, descripcion, monto, fecha_inicio, fecha_fin, vigencia, alcance, condiciones)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(numero, cliente_id, nombre, descripcion, monto || 0, fecha_inicio, fecha_fin, vigencia, alcance, condiciones);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'El número de contrato ya existe' });
  }
});

router.put('/:id', (req, res) => {
  const { numero, cliente_id, nombre, descripcion, monto, fecha_inicio, fecha_fin, vigencia, alcance, condiciones, estado } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE contratos SET numero=?, cliente_id=?, nombre=?, descripcion=?, monto=?,
    fecha_inicio=?, fecha_fin=?, vigencia=?, alcance=?, condiciones=?, estado=? WHERE id=?
  `).run(numero, cliente_id, nombre, descripcion, monto, fecha_inicio, fecha_fin, vigencia, alcance, condiciones, estado, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM contratos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
