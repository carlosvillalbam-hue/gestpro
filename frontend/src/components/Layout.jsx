import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, FileText, FolderKanban, Calculator,
  ShoppingCart, Package, Truck, Receipt, BarChart3, LogOut,
  ClipboardList, Building2, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
  { to: '/clientes', icon: Building2, label: 'Clientes' },
  { to: '/contratos', icon: ClipboardList, label: 'Contratos' },
  { to: '/presupuestos', icon: Calculator, label: 'Presupuestos' },
  { to: '/ordenes-compra', icon: ShoppingCart, label: 'Órdenes de Compra' },
  { to: '/inventario', icon: Package, label: 'Inventario' },
  { to: '/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/facturas', icon: Receipt, label: 'Facturación' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/usuarios', icon: Users, label: 'Usuarios' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-lg text-white">GestPro</h1>
              <p className="text-xs text-gray-400">Sistema de Proyectos</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white p-1">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700 p-4">
          {sidebarOpen && (
            <div className="mb-3">
              <p className="text-sm font-medium text-white">{user?.nombre}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.rol}</p>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full">
            <LogOut size={18} />
            {sidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
