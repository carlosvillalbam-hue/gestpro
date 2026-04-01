import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react'

const empty = { nombre: '', rfc: '', direccion: '', telefono: '', email: '', contacto: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.get('/clientes').then(r => { setClientes(r.data); setFiltered(r.data) })

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.rfc || '').toLowerCase().includes(q)
    ))
  }, [search, clientes])

  const openNew = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = c => { setForm(c); setEditId(c.id); setModal(true) }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) await api.put(`/clientes/${editId}`, form)
      else await api.post('/clientes', form)
      setModal(false); load()
    } finally { setLoading(false) }
  }

  const handleDelete = async id => {
    if (!confirm('¿Desactivar este cliente?')) return
    await api.delete(`/clientes/${id}`); load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm">{clientes.filter(c => c.activo).length} clientes activos</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nuevo Cliente</button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-9" placeholder="Buscar cliente..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Nombre</th>
                <th className="table-header">RFC</th>
                <th className="table-header">Contacto</th>
                <th className="table-header">Teléfono</th>
                <th className="table-header">Email</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium flex items-center gap-2">
                    <Building2 size={16} className="text-blue-500" />{c.nombre}
                  </td>
                  <td className="table-cell text-gray-500">{c.rfc || '—'}</td>
                  <td className="table-cell">{c.contacto || '—'}</td>
                  <td className="table-cell">{c.telefono || '—'}</td>
                  <td className="table-cell">{c.email || '—'}</td>
                  <td className="table-cell">
                    <span className={`badge ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">Sin clientes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente' : 'Nuevo Cliente'}>
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
