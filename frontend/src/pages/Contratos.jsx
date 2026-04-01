import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

const empty = { numero: '', cliente_id: '', nombre: '', descripcion: '', monto: '', fecha_inicio: '', fecha_fin: '', vigencia: '', alcance: '', condiciones: '', estado: 'activo' }

export default function Contratos() {
  const [contratos, setContratos] = useState([])
  const [clientes, setClientes] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => Promise.all([
    api.get('/contratos'), api.get('/clientes')
  ]).then(([c, cl]) => { setContratos(c.data); setFiltered(c.data); setClientes(cl.data) })

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(contratos.filter(c =>
      c.numero.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q) || (c.cliente_nombre || '').toLowerCase().includes(q)
    ))
  }, [search, contratos])

  const openNew = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = c => { setForm({ ...c, monto: c.monto || '' }); setEditId(c.id); setModal(true) }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      if (editId) await api.put(`/contratos/${editId}`, form)
      else await api.post('/contratos', form)
      setModal(false); load()
    } finally { setLoading(false) }
  }

  const fmt = n => n ? `$${Number(n).toLocaleString('es-MX')}` : '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-500 text-sm">{contratos.length} contratos registrados</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nuevo Contrato</button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar..." />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">No. Contrato</th>
                <th className="table-header">Nombre</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Monto</th>
                <th className="table-header">Vigencia</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono font-medium text-blue-700">{c.numero}</td>
                  <td className="table-cell">{c.nombre}</td>
                  <td className="table-cell text-gray-500">{c.cliente_nombre}</td>
                  <td className="table-cell font-medium">{fmt(c.monto)}</td>
                  <td className="table-cell text-sm">{c.fecha_inicio || '—'} / {c.fecha_fin || '—'}</td>
                  <td className="table-cell"><StatusBadge status={c.estado} /></td>
                  <td className="table-cell">
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">Sin contratos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Contrato' : 'Nuevo Contrato'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">No. Contrato *</label>
              <input className="input" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} required />
            </div>
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} required>
                <option value="">Seleccionar...</option>
                {clientes.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Nombre del Contrato *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label">Monto</label>
              <input type="number" className="input" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option value="activo">Activo</option>
                <option value="vigente">Vigente</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha Inicio</label>
              <input type="date" className="input" value={form.fecha_inicio || ''} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha Fin</label>
              <input type="date" className="input" value={form.fecha_fin || ''} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Alcance</label>
              <textarea className="input" rows={2} value={form.alcance || ''} onChange={e => setForm({ ...form, alcance: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Condiciones</label>
              <textarea className="input" rows={2} value={form.condiciones || ''} onChange={e => setForm({ ...form, condiciones: e.target.value })} />
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
