const initSqlJs = require('sql.js');
const path = require('path');
const SQLiteWrapper = require('./sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');

let db = null;

function getDb() {
  if (!db) throw new Error('Base de datos no inicializada. Llama initializeDb() primero.');
  return db;
}

async function initializeDb() {
  const SQL = await initSqlJs();
  db = new SQLiteWrapper(SQL, DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'proyectos',
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      rfc TEXT,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      contacto TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contratos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      cliente_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      monto REAL DEFAULT 0,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      vigencia TEXT,
      alcance TEXT,
      condiciones TEXT,
      estado TEXT NOT NULL DEFAULT 'activo',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );

    CREATE TABLE IF NOT EXISTS proyectos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      serie TEXT,
      descripcion TEXT,
      cliente_id INTEGER,
      contrato_id INTEGER,
      responsable_id INTEGER,
      fecha_inicio TEXT,
      fecha_fin_estimada TEXT,
      estado TEXT NOT NULL DEFAULT 'activo',
      presupuesto_total REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS presupuestos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      proyecto_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      mano_obra REAL DEFAULT 0,
      materiales REAL DEFAULT 0,
      equipos REAL DEFAULT 0,
      costos_indirectos REAL DEFAULT 0,
      total REAL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'borrador',
      fecha_envio TEXT,
      fecha_aprobacion TEXT,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
    );

    CREATE TABLE IF NOT EXISTS presupuesto_partidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presupuesto_id INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      unidad TEXT,
      cantidad REAL DEFAULT 1,
      precio_unitario REAL DEFAULT 0,
      total REAL DEFAULT 0,
      FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id)
    );

    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      rfc TEXT,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      contacto TEXT,
      categoria TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ordenes_compra (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      proyecto_id INTEGER NOT NULL,
      presupuesto_id INTEGER,
      proveedor_id INTEGER,
      descripcion TEXT,
      subtotal REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      total REAL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'enviada',
      fecha_envio TEXT,
      fecha_entrega_estimada TEXT,
      fecha_recepcion TEXT,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
      FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
    );

    CREATE TABLE IF NOT EXISTS oc_partidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oc_id INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      unidad TEXT,
      cantidad_pedida REAL DEFAULT 0,
      cantidad_recibida REAL DEFAULT 0,
      precio_unitario REAL DEFAULT 0,
      total REAL DEFAULT 0,
      FOREIGN KEY (oc_id) REFERENCES ordenes_compra(id)
    );

    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      descripcion TEXT NOT NULL,
      unidad TEXT,
      cantidad REAL DEFAULT 0,
      stock_minimo REAL DEFAULT 0,
      costo_unitario REAL DEFAULT 0,
      proyecto_id INTEGER,
      ubicacion TEXT DEFAULT 'almacen',
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
    );

    CREATE TABLE IF NOT EXISTS inventario_movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventario_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad REAL NOT NULL,
      referencia TEXT,
      oc_id INTEGER,
      proyecto_id INTEGER,
      notas TEXT,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      usuario_id INTEGER,
      FOREIGN KEY (inventario_id) REFERENCES inventario(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      proyecto_id INTEGER NOT NULL,
      presupuesto_id INTEGER,
      cliente_id INTEGER,
      descripcion TEXT,
      subtotal REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      total REAL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      fecha_emision TEXT,
      fecha_pago TEXT,
      porcentaje_avance REAL DEFAULT 0,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );
  `);

  // Usuario admin por defecto
  const adminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@empresa.com');
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)'
    ).run('Administrador', 'admin@empresa.com', hash, 'admin');
    console.log('Usuario admin creado: admin@empresa.com / admin123');
  }

  // Migraciones: agregar columnas si no existen
  const cols = db.prepare("PRAGMA table_info(proyectos)").all().map(c => c.name);
  if (!cols.includes('po_numero')) {
    db.exec("ALTER TABLE proyectos ADD COLUMN po_numero TEXT");
  }
  if (!cols.includes('po_documento')) {
    db.exec("ALTER TABLE proyectos ADD COLUMN po_documento TEXT");
  }
  if (!cols.includes('presupuesto_origen_id')) {
    db.exec("ALTER TABLE proyectos ADD COLUMN presupuesto_origen_id INTEGER");
  }

  console.log('Base de datos lista en:', DB_PATH);
  return db;
}

module.exports = { getDb, initializeDb };
