import { useEffect, useState } from 'react'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart3, FileText, Package, ShoppingCart } from 'lucide-react'

const fmt = n => n ? `$${Number(n).toLocaleString('es-MX')}` : '$0'

function Tab({ label, active, onClick, icon: Icon }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Icon size={16} /> {label}
    </button>
  )
}

export default function Reportes() {
  const [tab, setTab] = useState('presupuestos')
  const [presupuestos, setPresupuestos] = useState({ datos: [], resumen: {} })
  const [inventario, setInventario] = useState({ datos: [], resumen: {} })
  const [ocPendientes, setOcPendientes] = useState([])
  const [facturacion, setFacturacion] = useState([])
  const [filters, setFilters] = useState({ estado: '', cliente_id: '', proyecto_id: '' })
  const [clientes, setClientes] = useState([])
  const [proyectos, setProyectos] = useState([])

  useEffect(() => {
    Promise.all([api.get('/clientes'), api.get('/proyectos')]).then(([c, p]) => {
      setClientes(c.data); setProyectos(p.data)
    })
    loadAll()
  }, [])

  const loadAll = () => {
    api.get('/reportes/presupuestos').then(r => setPresupuestos(r.data))
    api.get('/reportes/inventario').then(r => setInventario(r.data))
    api.get('/reportes/oc-pendientes').then(r => setOcPendientes(r.data))
    api.get('/reportes/facturacion-mensual').then(r => setFacturacion(r.data.reverse()))
  }

  const loadPresupuestos = () => {
    const q = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    api.get(`/reportes/presupuestos${q ? '?' + q : ''}`).then(r => setPresupuestos(r.data))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 text-sm">Análisis y estadísticas del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Tab label="Presupuestos" active={tab === 'presupuestos'} onClick={() => setTab('presupuestos')} icon={FileText} />
        <Tab label="Inventario" active={tab === 'inventario'} onClick={() => setTab('inventario')} icon={Package} />
        <Tab label="OC Pendientes" active={tab === 'oc'} onClick={() => setTab('oc')} icon={ShoppingCart} />
        <Tab label="Facturación Mensual" active={tab === 'facturacion'} onClick={() => setTab('facturacion')} icon={BarChart3} />
      </div>

      {/* Tab: Presupuestos */}
      {tab === 'presupuestos' && (
        <div className="space-y-4">
          <div className="card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <select className="input" value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })}>
                <option value="">Todos los estados</option>
                {['borrador', 'enviado', 'aprobado', 'no_aprobado'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="input" value={filters.cliente_id} onChange={e => setFilters({ ...filters, cliente_id: e.target.value })}>
                <option value="">Todos los clientes</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select className="input" value={filters.proyecto_id} onChange={e => setFilters({ ...filters, proyecto_id: e.target.value })}>
                <option value="">Todos los proyectos</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <button onClick={loadPresupuestos} className="btn-primary justify-center">Filtrar</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{presupuestos.resumen.total || 0}</p>
              </div>
              {Object.entries(presupuestos.resumen.por_estado || {}).map(([estado, count]) => (
                <div key={estado} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 capitalize">{estado}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              ))}
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">Monto Total</p>
                <p className="text-lg font-bold text-blue-900">{fmt(presupuestos.resumen.monto_total)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="table-header">Folio</th>
                    <th className="table-header">Nombre</th>
                    <th className="table-header">Proyecto</th>
                    <th className="table-header">Cliente</th>
                    <th className="table-header text-right">Total</th>
                    <th className="table-header">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {presupuestos.datos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-blue-700">{p.folio}</td>
                      <td className="table-cell">{p.nombre}</td>
                      <td className="table-cell text-gray-500">{p.proyecto_nombre || '—'}</td>
                      <td className="table-cell text-gray-500">{p.cliente_nombre || '—'}</td>
                      <td className="table-cell text-right font-semibold">{fmt(p.total)}</td>
                      <td className="table-cell"><StatusBadge status={p.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Inventario */}
      {tab === 'inventario' && (
        <div className="card">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-600">Total Artículos</p>
              <p className="text-3xl font-bold text-blue-900">{inventario.resumen.total_articulos || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600">Valor Total Inventario</p>
              <p className="text-3xl font-bold text-green-900">{fmt(inventario.resumen.valor_total)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-header">Código</th>
                  <th className="table-header">Descripción</th>
                  <th className="table-header">Proyecto</th>
                  <th className="table-header text-right">Cantidad</th>
                  <th className="table-header text-right">Costo Unit.</th>
                  <th className="table-header text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventario.datos.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs">{i.codigo || '—'}</td>
                    <td className="table-cell font-medium">{i.descripcion}</td>
                    <td className="table-cell text-gray-500">{i.proyecto_nombre || 'General'}</td>
                    <td className="table-cell text-right">{i.cantidad} {i.unidad}</td>
                    <td className="table-cell text-right">{fmt(i.costo_unitario)}</td>
                    <td className="table-cell text-right font-medium">{fmt(i.cantidad * i.costo_unitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: OC Pendientes */}
      {tab === 'oc' && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">OC Pendientes de Recibir ({ocPendientes.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-header">Folio</th>
                  <th className="table-header">Proyecto</th>
                  <th className="table-header">Proveedor</th>
                  <th className="table-header">Entrega Est.</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ocPendientes.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-blue-700">{o.folio}</td>
                    <td className="table-cell">{o.proyecto_nombre || '—'}</td>
                    <td className="table-cell text-gray-500">{o.proveedor_nombre || '—'}</td>
                    <td className="table-cell text-gray-500">{o.fecha_entrega_estimada || '—'}</td>
                    <td className="table-cell text-right font-semibold">{fmt(o.total)}</td>
                    <td className="table-cell"><StatusBadge status={o.estado} /></td>
                  </tr>
                ))}
                {ocPendientes.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">Sin OC pendientes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Facturación mensual */}
      {tab === 'facturacion' && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Facturación por Mes (últimos 12 meses)</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={facturacion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total facturado" />
              <Bar dataKey="cobrado" fill="#10b981" radius={[4, 4, 0, 0]} name="Cobrado" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-header">Mes</th>
                  <th className="table-header text-right">Facturas</th>
                  <th className="table-header text-right">Total Facturado</th>
                  <th className="table-header text-right">Cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {facturacion.map(f => (
                  <tr key={f.mes} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{f.mes}</td>
                    <td className="table-cell text-right">{f.cantidad}</td>
                    <td className="table-cell text-right">{fmt(f.total)}</td>
                    <td className="table-cell text-right font-semibold text-green-700">{fmt(f.cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
