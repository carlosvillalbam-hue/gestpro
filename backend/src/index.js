const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registrar rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/contratos', require('./routes/contratos'));
app.use('/api/proyectos', require('./routes/proyectos'));
app.use('/api/presupuestos', require('./routes/presupuestos'));
app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/ordenes-compra', require('./routes/ordenesCompra'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/facturas', require('./routes/facturas'));
app.use('/api/reportes', require('./routes/reportes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/seed', require('./routes/seed'));

// Servir frontend compilado en producción
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// Iniciar servidor solo después de que la DB esté lista
initializeDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error iniciando base de datos:', err);
  process.exit(1);
});
