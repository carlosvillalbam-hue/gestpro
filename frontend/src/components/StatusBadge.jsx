const configs = {
  // Presupuestos
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprobado: 'bg-green-100 text-green-700',
  no_aprobado: 'bg-red-100 text-red-700',
  // OC
  enviada: 'bg-blue-100 text-blue-700',
  parcialmente_recibida: 'bg-yellow-100 text-yellow-700',
  completamente_recibida: 'bg-green-100 text-green-700',
  cerrada: 'bg-gray-100 text-gray-700',
  cancelada: 'bg-red-100 text-red-700',
  // Proyectos
  activo: 'bg-green-100 text-green-700',
  pausado: 'bg-yellow-100 text-yellow-700',
  terminado: 'bg-blue-100 text-blue-700',
  archivado: 'bg-gray-100 text-gray-700',
  // Facturas
  pendiente: 'bg-yellow-100 text-yellow-700',
  emitida: 'bg-blue-100 text-blue-700',
  pagada: 'bg-green-100 text-green-700',
  // Contratos
  vigente: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
}

const labels = {
  borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado',
  no_aprobado: 'No Aprobado', enviada: 'Enviada',
  parcialmente_recibida: 'Parcial', completamente_recibida: 'Recibida',
  cerrada: 'Cerrada', cancelada: 'Cancelada', activo: 'Activo',
  pausado: 'Pausado', terminado: 'Terminado', archivado: 'Archivado',
  pendiente: 'Pendiente', emitida: 'Emitida', pagada: 'Pagada',
  vigente: 'Vigente', vencido: 'Vencido',
}

export default function StatusBadge({ status }) {
  const cls = configs[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`badge ${cls}`}>
      {labels[status] || status}
    </span>
  )
}
