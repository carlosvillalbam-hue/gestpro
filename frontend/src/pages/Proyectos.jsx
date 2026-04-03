import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { Plus, Pencil, Eye, Search, FolderKanban, Paperclip, Download } from 'lucide-react'

const empty = { folio: '', nombre: '', serie: '', descripcion: '', cliente_id: '', contrato_id: '', responsable_id: '', fecha_inicio: '', fecha_fin_estimada: '', estado: 'activo', po_numero: '' }

export default function Proyectos() {
  const [proyectos, setProyectos] = useState([])
  const [filtered, setFiltered] = useState([])
  const [clientes, setClientes] = useState([])
  const [contratos, setContratos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => Promise.all([
    api.get('/proyectos'), api.get('/clientes'), api.get('/contratos'), api.get('/auth/usuarios')
  ]).then(([p, c, ct, u]) => {
    setProyectos(p.data); setFiltered(p.data)
    setClientes(c.data); setContratos(ct.data); setUsuarios(u.data)
  })

  useEffect(() => { load() }, [])

  useEffect(() => {
    let f = proyectos
    if (estadoFilter) f = f.filter(p => p.estado === estadoFilter)
    const q = search.toLowerCase()
    if (q) f = f.filter(p => p.nombre.toLowerCase().includes(q) || p.folio.toLowerCase().includes(q) || (p.cliente_nombre || '').toLowerCase().includes(q))
    setFiltered(f)
  }, [search, estadoFilter, proyectos])

  const openNew = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = p => { setForm(p); setEditId(p.id); setModal(true) }

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      if (editId) await api.put(`/proyectos/${editId}`, form)
      else await api.post('/proyectos', form)
      setModal(false); load()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally { setLoading(false) }
  }

  const estados = ['activo', 'pausado', 'terminado', 'archivado']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-500 text-sm">{proyectos.filter(p => p.estado === 'activo').length} activos de {proyectos.length} total</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={18} />Nuevo Proyecto</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar proyecto..." />
          </div>
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className="input w-auto">
            <option value="">Todos los estados</option>
            {estados.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-header">Folio</th>
                <th className="table-header">Nombre</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Responsable</th>
                <th className="table-header">Inicio</th>
                <th className="table-header">Estado</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-blue-700 font-medium">{p.folio}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <FolderKanban size={15} className="text-blue-400" />
                      <span className="font-medium">{p.nombre}</span>
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      {p.serie && <span className="text-xs text-gray-400">Serie: {p.serie}</span>}
                      {p.po_numero && <span className="text-xs text-blue-600 font-medium">PO: {p.po_numero}</span>}
                      {p.po_documento && (
                        <a href={`/api/proyectos/${p.id}/po-documento`} target="_blank" rel="noreferrer"
                          className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1">
                          <Paperclip size={11} /> Doc. PO
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-gray-500">{p.cliente_nombre || '—'}</td>
                  <td className="table-cell text-gray-500">{p.responsable_nombre || '—'}</td>
                  <td className="table-cell text-gray-500">{p.fecha_inicio || '—'}</td>
                  <td className="table-cell"><StatusBadge status={p.estado} /></td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Link to={`/proyectos/${p.id}`} className="text-blue-600 hover:text-blue-800 p-1"><Eye size={15} /></Link>
                      <button onClick={() => openEdit(p)} className="text-gray-500 hover:text-gray-700 p-1"><Pencil size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">Sin proyectos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Proyecto' : 'Nuevo Proyecto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Folio *</label>
              <input className="input" value={form.folio} onChange={e => setForm({ ...form, folio: e.target.value })} required />
            </div>
            <div>
              <label className="label">Serie</label>
              <input className="input" value={form.serie || ''} onChange={e => setForm({ ...form, serie: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Nombre del Proyecto *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label">Cliente</label>
              <select className="input" value={form.cliente_id || ''} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Sin cliente</option>
                {clientes.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Contrato</label>
              <select className="input" value={form.contrato_id || ''} onChange={e => setForm({ ...form, contrato_id: e.target.value })}>
                <option value="">Sin contrato</option>
                {contratos.map(c => <option key={c.id} value={c.id}>{c.numero} - {c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Responsable</label>
              <select className="input" value={form.responsable_id || ''} onChange={e => setForm({ ...form, responsable_id: e.target.value })}>
                <option value="">Sin responsable</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {['activo', 'pausado', 'terminado', 'archivado'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha Inicio</label>
              <input type="date" className="input" value={form.fecha_inicio || ''} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha Fin Estimada</label>
              <input type="date" className="input" value={form.fecha_fin_estimada || ''} onChange={e => setForm({ ...form, fecha_fin_estimada: e.target.value })} />
            </div>
            <div>
              <label className="label">Número de PO</label>
              <input className="input" placeholder="Ej: PO-2024-0042" value={form.po_numero || ''} onChange={e => setForm({ ...form, po_numero: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción</label>
              <textarea className="input" rows={2} value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
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
