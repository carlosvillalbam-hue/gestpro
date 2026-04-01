import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import { Plus, Pencil, Package, Search, ArrowUp, ArrowDown } from 'lucide-react'

const emptyForm = { codigo: '', descripcion: '', unidad: 'pza', cantidad: 0, costo_unitario: 0, proyecto_id: '', ubicacion: 'almacen' }

export default function Inventario() {
  const [items, setItems] = useState([])
  const [filtered, setFiltered] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [movModal, setMovModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [movForm, setMovForm] = useState({ tipo: 'entrada', cantidad: 1, referencia: '', notas: '' })
  const [movItemId, setMovItemId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => Promise.all([
    api.get('/inventario'), api.get('/proyectos')
  ]).then(([i, p]) => { setItems(i.data); setFiltered(i.data); setProyectos(p.data) })

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(items.filter(i =>
      i.descripcion.toLowerCase().includes(q) || (i.codigo || '').toLowerCase().includes(q) || (i.proyecto_nombre || '').toLowerCase().includes(q)
    ))
  }, [search, items])

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true) }
  const openEdit = i => { setForm(i); setEditId(i.id); setModal(true) }
  const openMov = id => { setMovItemId(id); setMovForm({ tipo: 'entrada', cantidad: 1, referencia: '', notas: '' }); setMovModal(true) }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      if (editId) await api.put(`/inventario/${editId}`, form)
      else await api.post('/inventario', form)
      setModal(false); load()
    } finally { setLoading(false) }
  }

  const handleMovimiento = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await api.post(`/inventario/${movItemId}/movimiento`, movForm)
      setMovModal(false); load()
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    } finally { setLoading(false) }
  }

  const fmt = n => n ? `$${Number(n).toLocaleString('es-MX')}` : '$0'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 text-sm">{items.length} artículos en almacén</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nuevo Artículo</button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar artículo..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Código</th>
                <th className="table-header">Descripción</th>
                <th className="table-header">Proyecto</th>
                <th className="table-header">Ubicación</th>
                <th className="table-header text-right">Cantidad</th>
                <th className="table-header text-right">Costo Unit.</th>
                <th className="table-header text-right">Valor Total</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(i => (
                <tr key={i.id} className={`hover:bg-gray-50 ${i.cantidad <= 0 ? 'bg-red-50' : ''}`}>
                  <td className="table-cell font-mono text-xs text-gray-500">{i.codigo || '—'}</td>
                  <td className="table-cell font-medium flex items-center gap-2">
                    <Package size={15} className="text-blue-400" />{i.descripcion}
                  </td>
                  <td className="table-cell text-gray-500">{i.proyecto_nombre || '—'}</td>
                  <td className="table-cell">
                    <span className={`badge ${i.ubicacion === 'almacen' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {i.ubicacion}
                    </span>
                  </td>
                  <td className={`table-cell text-right font-bold ${i.cantidad <= 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {i.cantidad} {i.unidad}
                  </td>
                  <td className="table-cell text-right">{fmt(i.costo_unitario)}</td>
                  <td className="table-cell text-right font-medium">{fmt(i.cantidad * i.costo_unitario)}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openMov(i.id)} title="Movimiento" className="p-1 text-green-600 hover:text-green-800">
                        <ArrowUp size={15} />
                      </button>
                      <button onClick={() => openEdit(i)} className="p-1 text-blue-600 hover:text-blue-800"><Pencil size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-8">Sin artículos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal artículo */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Artículo' : 'Nuevo Artículo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Código</label>
              <input className="input" value={form.codigo || ''} onChange={e => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div>
              <label className="label">Unidad</label>
              <input className="input" value={form.unidad || ''} onChange={e => setForm({ ...form, unidad: e.target.value })} placeholder="pza, kg, lt..." />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción *</label>
              <input className="input" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
            </div>
            <div>
              <label className="label">Cantidad</label>
              <input type="number" className="input" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })} min={0} />
            </div>
            <div>
              <label className="label">Costo Unitario</label>
              <input type="number" className="input" value={form.costo_unitario} onChange={e => setForm({ ...form, costo_unitario: Number(e.target.value) })} min={0} step={0.01} />
            </div>
            <div>
              <label className="label">Proyecto</label>
              <select className="input" value={form.proyecto_id || ''} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
                <option value="">General</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ubicación</label>
              <select className="input" value={form.ubicacion || 'almacen'} onChange={e => setForm({ ...form, ubicacion: e.target.value })}>
                <option value="almacen">Almacén</option>
                <option value="proyecto">Proyecto</option>
                <option value="transito">En tránsito</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal movimiento */}
      <Modal open={movModal} onClose={() => setMovModal(false)} title="Registrar Movimiento" size="sm">
        <form onSubmit={handleMovimiento} className="space-y-4">
          <div>
            <label className="label">Tipo de movimiento</label>
            <div className="flex gap-4">
              {['entrada', 'salida'].map(t => (
                <label key={t} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition ${movForm.tipo === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <input type="radio" value={t} checked={movForm.tipo === t} onChange={e => setMovForm({ ...movForm, tipo: e.target.value })} className="hidden" />
                  {t === 'entrada' ? <ArrowUp size={16} className="text-green-600" /> : <ArrowDown size={16} className="text-red-500" />}
                  <span className="capitalize font-medium">{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Cantidad *</label>
            <input type="number" className="input" value={movForm.cantidad} onChange={e => setMovForm({ ...movForm, cantidad: Number(e.target.value) })} min={1} required />
          </div>
          <div>
            <label className="label">Referencia</label>
            <input className="input" value={movForm.referencia} onChange={e => setMovForm({ ...movForm, referencia: e.target.value })} placeholder="OC-001, Proyecto X..." />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={movForm.notas} onChange={e => setMovForm({ ...movForm, notas: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setMovModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
