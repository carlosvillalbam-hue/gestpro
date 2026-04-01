import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge'
import { ArrowLeft, Calculator, ShoppingCart, Receipt, Building2, User, Calendar } from 'lucide-react'

export default function ProyectoDetalle() {
  const { id } = useParams()
  const [proyecto, setProyecto] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [presupuestos, setPresupuestos] = useState([])
  const [oc, setOc] = useState([])
  const [facturas, setFacturas] = useState([])

  useEffect(() => {
    Promise.all([
      api.get(`/proyectos/${id}`),
      api.get(`/proyectos/${id}/resumen`),
      api.get(`/presupuestos?proyecto_id=${id}`),
      api.get(`/ordenes-compra?proyecto_id=${id}`),
      api.get(`/facturas?proyecto_id=${id}`),
    ]).then(([p, r, pres, o, f]) => {
      setProyecto(p.data)
      setResumen(r.data)
      setPresupuestos(pres.data)
      setOc(o.data)
      setFacturas(f.data)
    })
  }, [id])

  if (!proyecto) return <div className="text-gray-400 text-center py-12">Cargando...</div>

  const fmt = n => n ? `$${Number(n).toLocaleString('es-MX')}` : '$0'
  const presAprobado = presupuestos.find(p => p.estado === 'aprobado')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/proyectos" className="btn-secondary py-1.5 px-3">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{proyecto.nombre}</h1>
            <StatusBadge status={proyecto.estado} />
          </div>
          <p className="text-gray-500 text-sm">Folio: {proyecto.folio} {proyecto.serie && `| Serie: ${proyecto.serie}`}</p>
        </div>
      </div>

      {/* Info general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <Building2 size={20} className="text-blue-500" />
          <div><p className="text-xs text-gray-500">Cliente</p><p className="font-medium">{proyecto.cliente_nombre || '—'}</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <User size={20} className="text-green-500" />
          <div><p className="text-xs text-gray-500">Responsable</p><p className="font-medium">{proyecto.responsable_nombre || '—'}</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <Calendar size={20} className="text-purple-500" />
          <div><p className="text-xs text-gray-500">Fecha inicio</p><p className="font-medium">{proyecto.fecha_inicio || '—'}</p></div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-green-400">
          <div className="flex items-center gap-2 mb-2"><Calculator size={18} className="text-green-600" /><span className="font-semibold text-gray-700">Presupuesto Aprobado</span></div>
          <p className="text-2xl font-bold text-green-700">{fmt(presAprobado?.total)}</p>
          <p className="text-xs text-gray-400 mt-1">{presupuestos.length} presupuesto(s) total</p>
        </div>
        <div className="card border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-2"><ShoppingCart size={18} className="text-blue-600" /><span className="font-semibold text-gray-700">Total Compras</span></div>
          <p className="text-2xl font-bold text-blue-700">{fmt(oc.reduce((s, o) => s + (o.total || 0), 0))}</p>
          <p className="text-xs text-gray-400 mt-1">{oc.length} OC generada(s)</p>
        </div>
        <div className="card border-l-4 border-purple-400">
          <div className="flex items-center gap-2 mb-2"><Receipt size={18} className="text-purple-600" /><span className="font-semibold text-gray-700">Facturado</span></div>
          <p className="text-2xl font-bold text-purple-700">{fmt(facturas.reduce((s, f) => s + (f.total || 0), 0))}</p>
          <p className="text-xs text-gray-400 mt-1">{facturas.length} factura(s)</p>
        </div>
      </div>

      {/* Presupuestos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Calculator size={18} className="text-blue-500" /> Presupuestos</h2>
          <Link to={`/presupuestos`} className="text-sm text-blue-600 hover:underline">Ver todos</Link>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-header">Folio</th>
              <th className="table-header">Nombre</th>
              <th className="table-header text-right">Total</th>
              <th className="table-header">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {presupuestos.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-blue-700">{p.folio}</td>
                <td className="table-cell">{p.nombre}</td>
                <td className="table-cell text-right font-medium">{fmt(p.total)}</td>
                <td className="table-cell"><StatusBadge status={p.estado} /></td>
              </tr>
            ))}
            {presupuestos.length === 0 && <tr><td colSpan={4} className="table-cell text-center text-gray-400 py-4">Sin presupuestos</td></tr>}
          </tbody>
        </table>
      </div>

      {/* OC */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ShoppingCart size={18} className="text-blue-500" /> Órdenes de Compra</h2>
          <Link to="/ordenes-compra" className="text-sm text-blue-600 hover:underline">Ver todas</Link>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-header">Folio</th>
              <th className="table-header">Proveedor</th>
              <th className="table-header text-right">Total</th>
              <th className="table-header">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {oc.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-blue-700">{o.folio}</td>
                <td className="table-cell">{o.proveedor_nombre || '—'}</td>
                <td className="table-cell text-right font-medium">{fmt(o.total)}</td>
                <td className="table-cell"><StatusBadge status={o.estado} /></td>
              </tr>
            ))}
            {oc.length === 0 && <tr><td colSpan={4} className="table-cell text-center text-gray-400 py-4">Sin órdenes de compra</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Facturas */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Receipt size={18} className="text-blue-500" /> Facturas</h2>
          <Link to="/facturas" className="text-sm text-blue-600 hover:underline">Ver todas</Link>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-header">Folio</th>
              <th className="table-header">Descripción</th>
              <th className="table-header text-right">Total</th>
              <th className="table-header">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {facturas.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-blue-700">{f.folio}</td>
                <td className="table-cell">{f.descripcion || '—'}</td>
                <td className="table-cell text-right font-medium">{fmt(f.total)}</td>
                <td className="table-cell"><StatusBadge status={f.estado} /></td>
              </tr>
            ))}
            {facturas.length === 0 && <tr><td colSpan={4} className="table-cell text-center text-gray-400 py-4">Sin facturas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
