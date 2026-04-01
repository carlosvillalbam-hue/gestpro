import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

const emptyForm = {
  folio: '', proyecto_id: '', presupuesto_id: '', cliente_id: '',
  descripcion: '', subtotal: 0, iva: 0, total: 0,
  estado: 'pendiente', fecha_emision: '', fecha_pago: '', porcentaje_avance: 0, notas: ''
}

export default function Facturas() {
  const [facturas, setFacturas] = useState([])
  const [filtered, setFiltered] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => Promise.all([
    api.get('/facturas'), api.get('/proyectos'), api.get('/clientes')
  ]).then(([f, p, c]) => { setFacturas(f.data); setFiltered(f.data); setProyectos(p.data); setClientes(c.data) })

  useEffect(() => { load() }, [])

  useEffect(() => {
    let f = facturas
    if (estadoFilter) f = f.filter(x => x.estado === estadoFilter)
    const q = search.toLowerCase()
    if (q) f = f.filter(x => x.folio.toLowerCase().includes(q) || (x.proyecto_nombre || '').toLowerCase().includes(q) || (x.cliente_nombre || '').toLowerCase().includes(q))
    setFiltered(f)
  }, [search, estadoFilter, facturas])

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true) }
  const openEdit = async f => {
    const res = await api.get(`/facturas/${f.id}`)
    setForm(res.data); setEditId(f.id); setModal(true)
  }

  const calcTotal = (sub, iva) => (Number(sub) || 0) * (1 + (Number(iva) || 0) / 100)

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    const payload = { ...form, total: calcTotal(form.subtotal, form.iva) }
    try {
      if (editId) await api.put(`/facturas/${editId}`, payload)
      else await api.post('/facturas', payload)
      setModal(false); load()
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar') }
    finally { setLoading(false) }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar factura?')) return
    await api.delete(`/facturas/${id}`); load()
  }

  const fmt = n => n ? `$${Number(n).toLocaleString('es-MX')}` : '$0'
  const estados = ['pendiente', 'emitida', 'pagada']

  const totalFacturado = filtered.reduce((s, f) => s + (f.total || 0), 0)
  const totalCobrado = filtered.filter(f => f.estado === 'pagada').reduce((s, f) => s + (f.total || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-500 text-sm">{facturas.length} facturas | Facturado: {fmt(totalFacturado)} | Cobrado: {fmt(totalCobrado)}</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nueva Factura</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar factura..." />
          </div>
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className="input w-auto">
            <option value="">Todos</option>
            {estados.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Folio</th>
                <th className="table-header">Proyecto</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Emisión</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-blue-700">{f.folio}</td>
                  <td className="table-cell">{f.proyecto_nombre || '—'}</td>
                  <td className="table-cell text-gray-500">{f.cliente_nombre || '—'}</td>
                  <td className="table-cell text-gray-500">{f.fecha_emision || '—'}</td>
                  <td className="table-cell text-right font-bold">{fmt(f.total)}</td>
                  <td className="table-cell"><StatusBadge status={f.estado} /></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(f)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">Sin facturas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Factura' : 'Nueva Factura'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Folio *</label>
              <input className="input" value={form.folio} onChange={e => setForm({ ...form, folio: e.target.value })} required />
            </div>
            <div>
              <label className="label">Proyecto *</label>
              <select className="input" value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })} required>
                <option value="">Seleccionar...</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.folio} - {p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <select className="input" value={form.cliente_id || ''} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {clientes.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {estados.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha Emisión</label>
              <input type="date" className="input" value={form.fecha_emision || ''} onChange={e => setForm({ ...form, fecha_emision: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha Pago</label>
              <input type="date" className="input" value={form.fecha_pago || ''} onChange={e => setForm({ ...form, fecha_pago: e.target.value })} />
            </div>
            <div>
              <label className="label">Subtotal</label>
              <input type="number" className="input" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: Number(e.target.value) })} min={0} step={0.01} />
            </div>
            <div>
              <label className="label">IVA (%)</label>
              <input type="number" className="input" value={form.iva} onChange={e => setForm({ ...form, iva: Number(e.target.value) })} min={0} max={100} />
            </div>
            <div className="col-span-2 bg-blue-50 rounded-lg p-3 flex justify-between">
              <span className="font-medium text-blue-800">Total</span>
              <span className="font-bold text-blue-900 text-lg">{fmt(calcTotal(form.subtotal, form.iva))}</span>
            </div>
            <div>
              <label className="label">% Avance</label>
              <input type="number" className="input" value={form.porcentaje_avance} onChange={e => setForm({ ...form, porcentaje_avance: Number(e.target.value) })} min={0} max={100} />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción / Concepto</label>
              <textarea className="input" rows={2} value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Notas</label>
              <textarea className="input" rows={2} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
