import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Contratos from './pages/Contratos'
import Proyectos from './pages/Proyectos'
import ProyectoDetalle from './pages/ProyectoDetalle'
import Presupuestos from './pages/Presupuestos'
import OrdenesCompra from './pages/OrdenesCompra'
import Inventario from './pages/Inventario'
import Proveedores from './pages/Proveedores'
import Facturas from './pages/Facturas'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="proyectos" element={<Proyectos />} />
            <Route path="proyectos/:id" element={<ProyectoDetalle />} />
            <Route path="presupuestos" element={<Presupuestos />} />
            <Route path="ordenes-compra" element={<OrdenesCompra />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="facturas" element={<Facturas />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
