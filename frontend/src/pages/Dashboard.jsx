import { useEffect, useState } from 'react'
import api from '../services/api'
import { FolderKanban, Calculator, ShoppingCart, Receipt, TrendingUp, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [avance, setAvance] = useState([])
  const [facturacionMes, setFacturacionMes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/reportes/dashboard'),
      api.get('/reportes/proyectos-avance'),
      api.get('/reportes/facturacion-mensual'),
    ]).then(([dash, av, fac]) => {
      setData(dash.data)
      setAvance(av.data.slice(0, 5))
      setFacturacionMes(fac.data.reverse())
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Cargando...</div></div>

  const fmt = n => n ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}` : '$0'

  const pieData = [
    { name: 'Activos', value: data?.proyectos?.activos || 0 },
    { name: 'Total', value: (data?.proyectos?.total || 0) - (data?.proyectos?.activos || 0) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Proyectos Activos" value={data?.proyectos?.activos || 0}
          sub={`${data?.proyectos?.total || 0} total`} color="blue" />
        <StatCard icon={Calculator} label="Presupuestos Aprobados" value={data?.presupuestos?.aprobados?.count || 0}
          sub={fmt(data?.presupuestos?.aprobados?.total)} color="green" />
        <StatCard icon={ShoppingCart} label="OC Pendientes" value={data?.ordenes_compra?.pendientes || 0}
          sub={fmt(data?.ordenes_compra?.total_monto)} color="yellow" />
        <StatCard icon={Receipt} label="Facturado este mes" value={fmt(data?.facturas?.mes?.total)}
          sub={`${data?.facturas?.mes?.count || 0} facturas`} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" /> Facturación Mensual
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={facturacionMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="cobrado" fill="#10b981" radius={[4, 4, 0, 0]} name="Cobrado" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" /> Avance de Proyectos
          </h2>
          <div className="space-y-3">
            {avance.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sin proyectos registrados</p>}
            {avance.map(p => {
              const pct = p.presupuesto_aprobado > 0
                ? Math.min(100, ((p.total_facturado || 0) / p.presupuesto_aprobado) * 100)
                : 0
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate">{p.nombre}</span>
                    <span className="text-gray-500 ml-2">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Resumen de Proyectos</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Proyecto</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Presupuesto</th>
                <th className="table-header text-right">Facturado</th>
                <th className="table-header text-right">Cobrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {avance.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{p.nombre}</td>
                  <td className="table-cell text-gray-500">{p.cliente_nombre || '—'}</td>
                  <td className="table-cell">
                    <span className={`badge ${p.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="table-cell text-right">{fmt(p.presupuesto_aprobado)}</td>
                  <td className="table-cell text-right">{fmt(p.total_facturado)}</td>
                  <td className="table-cell text-right">{fmt(p.total_cobrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
