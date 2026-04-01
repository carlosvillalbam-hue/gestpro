import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

const emptyForm = {
  folio: '', proyecto_id: '', presupuesto_id: '', proveedor_id: '',
  descripcion: '', subtotal: 0, iva: 0, total: 0,
  estado: 'enviada', fecha_envio: '', fecha_entrega_estimada: '', notas: '', partidas: []
}

export default function OrdenesCompra() {
  const [ocs, setOcs] = useState([])
  const [filtered, setFiltered] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => Promise.all([
    api.get('/ordenes-compra'), api.get('/proyectos'), api.get('/proveedores')
  ]).then(([o, p, pr]) => {
    setOcs(o.data); setFiltered(o.data); setProyectos(p.data); setProveedores(pr.data)
  })

  useEffect(() => { load() }, [])

  useEffect(() => {
    let f = ocs
    if (estadoFilter) f = f.filter(o => o.estado === estadoFilter)
    const q = search.toLowerCase()
    if (q) f = f.filter(o => o.folio.toLowerCase().includes(q) || (o.proyecto_nombre || '').toLowerCase().includes(q) || (o.proveedor_nombre || '').toLowerCase().includes(q))
    setFiltered(f)
  }, [search, estadoFilter, ocs])

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true) }
  const openEdit = async o => {
    const res = await api.get(`/ordenes-compra/${o.id}`)
    setForm({ ...res.data, partidas: res.data.partidas || [] })
    setEditId(o.id); setModal(true)
  }

  const addPartida = () => setForm(f => ({ ...f, partidas: [...f.partidas, { descripcion: '', unidad: 'pza', cantidad_pedida: 1, precio_unitario: 0 }] }))
  const updatePartida = (i, field, val) => setForm(f => { const p = [...f.partidas]; p[i] = { ...p[i], [field]: val }; return { ...f, partidas: p } })
  const removePartida = i => setForm(f => ({ ...f, partidas: f.partidas.filter((_, idx) => idx !== i) }))

  const calcTotal = (sub, iva) => (Number(sub) || 0) + ((Number(sub) || 0) * ((Number(iva) || 0) / 100))

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    const payload = { ...form, total: calcTotal(form.subtotal, form.iva) }
    try {
      if (editId) await api.put(`/ordenes-compra/${editId}`, payload)
      else await api.post('/ordenes-compra', payload)
      setModal(false); load()
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar') }
    finally { setLoading(false) }
  }

  const handleCancel = async id => {
    if (!confirm('¿Cancelar esta OC?')) return
    await api.delete(`/ordenes-compra/${id}`); load()
  }

  const fmt = n => n ? `$${Number(n).toLocaleString('es-MX')}` : '$0'
  const estados = ['enviada', 'parcialmente_recibida', 'completamente_recibida', 'cerrada', 'cancelada']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
          <p className="text-gray-500 text-sm">{ocs.length} registros</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nueva OC</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar OC..." />
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
                <th className="table-header">Proveedor</th>
                <th className="table-header">Entrega Est.</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-blue-700">{o.folio}</td>
                  <td className="table-cell">{o.proyecto_nombre || '—'}</td>
                  <td className="table-cell text-gray-500">{o.proveedor_nombre || '—'}</td>
                  <td className="table-cell text-gray-500">{o.fecha_entrega_estimada || '—'}</td>
                  <td className="table-cell text-right font-semibold">{fmt(o.total)}</td>
                  <td className="table-cell"><StatusBadge status={o.estado} /></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(o)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                      <button onClick={() => handleCancel(o.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">Sin órdenes de compra</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar OC' : 'Nueva Orden de Compra'} size="xl">
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
              <label className="label">Proveedor</label>
              <select className="input" value={form.proveedor_id || ''} onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
                <option value="">Sin proveedor</option>
                {proveedores.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {estados.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha Envío</label>
              <input type="date" className="input" value={form.fecha_envio || ''} onChange={e => setForm({ ...form, fecha_envio: e.target.value })} />
            </div>
            <div>
              <label className="label">Entrega Estimada</label>
              <input type="date" className="input" value={form.fecha_entrega_estimada || ''} onChange={e => setForm({ ...form, fecha_entrega_estimada: e.target.value })} />
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
          </div>

          {/* Partidas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">Partidas</h3>
              <button type="button" onClick={addPartida} className="btn-secondary text-xs py-1">+ Agregar</button>
            </div>
            {form.partidas.map((p, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end bg-gray-50 p-2 rounded">
                <div className="col-span-2">
                  <label className="label text-xs">Descripción</label>
                  <input className="input text-xs py-1" value={p.descripcion} onChange={e => updatePartida(i, 'descripcion', e.target.value)} />
                </div>
                <div>
                  <label className="label text-xs">Cantidad</label>
                  <input type="number" className="input text-xs py-1" value={p.cantidad_pedida} onChange={e => updatePartida(i, 'cantidad_pedida', Number(e.target.value))} min={0} />
                </div>
                <div>
                  <label className="label text-xs">Precio Unit.</label>
                  <input type="number" className="input text-xs py-1" value={p.precio_unitario} onChange={e => updatePartida(i, 'precio_unitario', Number(e.target.value))} min={0} />
                </div>
                <button type="button" onClick={() => removePartida(i)} className="text-red-500 mb-1">✕</button>
              </div>
            ))}
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} />
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
