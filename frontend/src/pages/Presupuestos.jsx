import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react'

const emptyForm = {
  folio: '', proyecto_id: '', nombre: '', descripcion: '',
  mano_obra: 0, materiales: 0, equipos: 0, costos_indirectos: 0,
  estado: 'borrador', notas: '', partidas: []
}

const emptyPartida = { categoria: 'materiales', descripcion: '', unidad: 'pza', cantidad: 1, precio_unitario: 0 }

export default function Presupuestos() {
  const [presupuestos, setPresupuestos] = useState([])
  const [filtered, setFiltered] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPartidas, setShowPartidas] = useState(false)

  const load = () => Promise.all([
    api.get('/presupuestos'), api.get('/proyectos'), api.get('/clientes')
  ]).then(([p, pr, c]) => {
    setPresupuestos(p.data); setFiltered(p.data)
    setProyectos(pr.data); setClientes(c.data)
  })

  useEffect(() => { load() }, [])

  useEffect(() => {
    let f = presupuestos
    if (estadoFilter) f = f.filter(p => p.estado === estadoFilter)
    const q = search.toLowerCase()
    if (q) f = f.filter(p => p.folio.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || (p.proyecto_nombre || '').toLowerCase().includes(q))
    setFiltered(f)
  }, [search, estadoFilter, presupuestos])

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowPartidas(false); setModal(true) }
  const openEdit = async p => {
    const res = await api.get(`/presupuestos/${p.id}`)
    setForm({ ...res.data, partidas: res.data.partidas || [] })
    setEditId(p.id); setShowPartidas(false); setModal(true)
  }

  const addPartida = () => setForm(f => ({ ...f, partidas: [...f.partidas, { ...emptyPartida }] }))
  const updatePartida = (i, field, val) => setForm(f => {
    const partidas = [...f.partidas]
    partidas[i] = { ...partidas[i], [field]: val }
    return { ...f, partidas }
  })
  const removePartida = i => setForm(f => ({ ...f, partidas: f.partidas.filter((_, idx) => idx !== i) }))

  const total = (Number(form.mano_obra) || 0) + (Number(form.materiales) || 0) + (Number(form.equipos) || 0) + (Number(form.costos_indirectos) || 0)

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      if (editId) await api.put(`/presupuestos/${editId}`, form)
      else await api.post('/presupuestos', form)
      setModal(false); load()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally { setLoading(false) }
  }

  const handleDelete = async id => {
    if (!confirm('¿Eliminar presupuesto?')) return
    await api.delete(`/presupuestos/${id}`); load()
  }

  const fmt = n => n ? `$${Number(n).toLocaleString('es-MX')}` : '$0'
  const estados = ['borrador', 'enviado', 'aprobado', 'no_aprobado']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-500 text-sm">{presupuestos.length} registros</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nuevo Presupuesto</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar..." />
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
                <th className="table-header">Nombre</th>
                <th className="table-header">Proyecto</th>
                <th className="table-header">Cliente</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-blue-700">{p.folio}</td>
                  <td className="table-cell font-medium">{p.nombre}</td>
                  <td className="table-cell text-gray-500">{p.proyecto_nombre || '—'}</td>
                  <td className="table-cell text-gray-500">{p.cliente_nombre || '—'}</td>
                  <td className="table-cell text-right font-semibold text-gray-900">{fmt(p.total)}</td>
                  <td className="table-cell"><StatusBadge status={p.estado} /></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">Sin presupuestos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} size="xl">
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
            <div className="col-span-2">
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {estados.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Costos */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-3">Desglose de Costos</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['mano_obra', 'Mano de Obra'], ['materiales', 'Materiales'], ['equipos', 'Equipos / Herramientas'], ['costos_indirectos', 'Costos Indirectos']].map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" className="input" value={form[key]} onChange={e => setForm({ ...form, [key]: Number(e.target.value) })} min={0} step={0.01} />
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-blue-700">{fmt(total)}</span>
            </div>
          </div>

          {/* Partidas */}
          <div>
            <button type="button" onClick={() => setShowPartidas(!showPartidas)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
              {showPartidas ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Partidas detalladas ({form.partidas.length})
            </button>
            {showPartidas && (
              <div className="mt-3 space-y-2">
                {form.partidas.map((p, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 items-end bg-gray-50 p-2 rounded">
                    <div>
                      <label className="label text-xs">Categoría</label>
                      <select className="input text-xs py-1" value={p.categoria} onChange={e => updatePartida(i, 'categoria', e.target.value)}>
                        {['materiales', 'mano_obra', 'equipos', 'indirectos'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">Descripción</label>
                      <input className="input text-xs py-1" value={p.descripcion} onChange={e => updatePartida(i, 'descripcion', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Cantidad</label>
                      <input type="number" className="input text-xs py-1" value={p.cantidad} onChange={e => updatePartida(i, 'cantidad', Number(e.target.value))} min={0} />
                    </div>
                    <div>
                      <label className="label text-xs">P. Unitario</label>
                      <input type="number" className="input text-xs py-1" value={p.precio_unitario} onChange={e => updatePartida(i, 'precio_unitario', Number(e.target.value))} min={0} />
                    </div>
                    <button type="button" onClick={() => removePartida(i)} className="text-red-500 hover:text-red-700 mb-1">✕</button>
                  </div>
                ))}
                <button type="button" onClick={addPartida} className="btn-secondary text-sm py-1">+ Agregar partida</button>
              </div>
            )}
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
