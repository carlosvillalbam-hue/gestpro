import { useEffect, useState } from 'react'
import api from '../services/api'
import Modal from '../components/Modal'
import { Plus, Pencil, Users } from 'lucide-react'

const empty = { nombre: '', email: '', password: '', rol: 'proyectos', activo: 1 }
const roles = ['admin', 'proyectos', 'compras', 'almacen', 'contabilidad']

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => api.get('/auth/usuarios').then(r => setUsuarios(r.data))
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = u => { setForm({ ...u, password: '' }); setEditId(u.id); setModal(true) }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      if (editId) await api.put(`/auth/usuarios/${editId}`, form)
      else await api.post('/auth/usuarios', form)
      setModal(false); load()
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar') }
    finally { setLoading(false) }
  }

  const rolColor = { admin: 'bg-red-100 text-red-700', proyectos: 'bg-blue-100 text-blue-700', compras: 'bg-yellow-100 text-yellow-700', almacen: 'bg-green-100 text-green-700', contabilidad: 'bg-purple-100 text-purple-700' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm">{usuarios.length} usuarios registrados</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nuevo Usuario</button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Nombre</th>
                <th className="table-header">Email</th>
                <th className="table-header">Rol</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Fecha</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    {u.nombre}
                  </td>
                  <td className="table-cell text-gray-500">{u.email}</td>
                  <td className="table-cell">
                    <span className={`badge ${rolColor[u.rol] || 'bg-gray-100 text-gray-700'}`}>{u.rol}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell text-gray-400 text-xs">{u.created_at?.slice(0, 10)}</td>
                  <td className="table-cell">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{editId ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editId} />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.activo} onChange={e => setForm({ ...form, activo: Number(e.target.value) })}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
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
