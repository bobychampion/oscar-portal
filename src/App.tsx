import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Apply from './pages/Apply'
import Results from './pages/Results'
import ResultDetail from './pages/ResultDetail'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Applications from './pages/admin/Applications'
import ApplicationDetail from './pages/admin/ApplicationDetail'
import ApiKeys from './pages/admin/ApiKeys'
import Webhooks from './pages/admin/Webhooks'
import ProtectedRoute from './router/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/apply" element={<Apply />} />
        <Route path="/results" element={<Results />} />
        <Route path="/results/:tracking_number" element={<ResultDetail />} />

        {/* Admin — auth-gated */}
        <Route path="/admin/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/applications" element={<Applications />} />
          <Route path="/admin/applications/:id" element={<ApplicationDetail />} />
          <Route path="/admin/api-keys" element={<ApiKeys />} />
          <Route path="/admin/webhooks" element={<Webhooks />} />
        </Route>

        {/* Default */}
        <Route path="/" element={<Navigate to="/apply" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
