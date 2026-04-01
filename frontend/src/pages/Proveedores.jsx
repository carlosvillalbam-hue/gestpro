import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import { Plus, Pencil, Trash2, Search, Truck } from 'lucide-react'

const empty = { nombre: '', rfc: '', direccion: '', telefono: '', email: '', contacto: '', categoria: '' }

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.get('/proveedores').then(r => { setProveedores(r.data); setFiltered(r.data) })
  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(proveedores.filter(p =>
      p.nombre.toLowerCase().includes(q) || (p.rfc || '').toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q)
    ))
  }, [search, proveedores])

  const openNew = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = p => { setForm(p); setEditId(p.id); setModal(true) }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      if (editId) await api.put(`/proveedores/${editId}`, form)
      else await api.post('/proveedores', form)
      setModal(false); load()
    } finally { setLoading(false) }
  }

  const handleDelete = async id => {
    if (!confirm('¿Desactivar proveedor?')) return
    await api.delete(`/proveedores/${id}`); load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-gray-500 text-sm">{proveedores.filter(p => p.activo).length} activos</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nuevo Proveedor</button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar proveedor..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Nombre</th>
                <th className="table-header">RFC</th>
                <th className="table-header">Categoría</th>
                <th className="table-header">Contacto</th>
                <th className="table-header">Teléfono</th>
                <th className="table-header">Email</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium flex items-center gap-2"><Truck size={15} className="text-blue-400" />{p.nombre}</td>
                  <td className="table-cell text-gray-500">{p.rfc || '—'}</td>
                  <td className="table-cell">
                    {p.categoria && <span className="badge bg-purple-100 text-purple-700">{p.categoria}</span>}
                  </td>
                  <td className="table-cell">{p.contacto || '—'}</td>
                  <td className="table-cell">{p.telefono || '—'}</td>
                  <td className="table-cell">{p.email || '—'}</td>
                  <td className="table-cell">
                    <span className={`badge ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-8">Sin proveedores</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label">RFC</label>
              <input className="input" value={form.rfc || ''} onChange={e => setForm({ ...form, rfc: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <input className="input" value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Materiales, Servicios..." />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Contacto</label>
              <input className="input" value={form.contacto || ''} onChange={e => setForm({ ...form, contacto: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Dirección</label>
              <textarea className="input" rows={2} value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} />
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
