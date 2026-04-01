# GestPro — Sistema de Gestión de Proyectos

Software de gestión empresarial que cubre el ciclo completo:
Clientes → Contratos → Proyectos → Presupuestos → Órdenes de Compra → Inventario → Facturación → Reportes

---

## Requisito previo

Instalar **Node.js v18 o superior**: https://nodejs.org

Para verificar que está instalado, abre una terminal y ejecuta:
```
node --version
```
Debe mostrar algo como `v18.x.x` o superior.

---

## Instalación (solo la primera vez)

Abre una terminal en la carpeta del proyecto y ejecuta:

**1. Instalar dependencias del backend:**
```
cd backend
npm install
cd ..
```

**2. Instalar dependencias del frontend:**
```
cd frontend
npm install
cd ..
```

**3. Cargar datos de ejemplo (opcional):**
```
node ../seed-demo-direct.js
```

> Si ejecutaste el proyecto desde la carpeta raíz (`gestion-proyectos`), el archivo `seed-demo-direct.js` está un nivel arriba. Si lo moviste junto con esta carpeta, ajusta la ruta.

---

## Ejecutar el sistema

Necesitas **dos terminales abiertas al mismo tiempo**.

**Terminal 1 — Backend (API):**
```
node ../start-backend.js
```
Debe mostrar: `Servidor corriendo en http://localhost:3001`

**Terminal 2 — Frontend:**
```
node ../start-frontend.js
```
Debe mostrar una URL como `http://localhost:3000`

Luego abre tu navegador en: **http://localhost:3000**

---

## Credenciales de acceso

| Usuario | Contraseña |
|---------|------------|
| admin@empresa.com | admin123 |

Usuarios demo (si cargaste los datos de ejemplo):

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| carlos@empresa.com | demo123 | Proyectos |
| laura@empresa.com | demo123 | Compras |
| miguel@empresa.com | demo123 | Almacén |

---

## Módulos disponibles

- **Dashboard** — Resumen general con KPIs y gráficas
- **Proyectos** — Gestión de proyectos con folio y seguimiento
- **Clientes** — Directorio de clientes
- **Contratos** — Contratos vinculados a clientes
- **Presupuestos** — Elaboración y aprobación de presupuestos
- **Órdenes de Compra** — Compras a proveedores con partidas
- **Inventario** — Control de materiales y herramientas
- **Proveedores** — Directorio de proveedores
- **Facturación** — Emisión y seguimiento de facturas
- **Reportes** — Reportes por proyecto, presupuesto y facturación
- **Usuarios** — Administración de usuarios y roles

---

## Solución de problemas

**El backend no inicia:**
Verifica que el puerto 3001 no esté en uso. Si lo está, cierra la aplicación que lo ocupa y vuelve a intentarlo.

**El frontend no inicia:**
Verifica que el puerto 3000 no esté en uso.

**Error al instalar dependencias:**
Asegúrate de tener Node.js v18+ instalado correctamente.

**La base de datos no tiene datos:**
Ejecuta el script de datos de ejemplo: `node ../seed-demo-direct.js`
