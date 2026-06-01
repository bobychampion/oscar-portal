import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Public
import Apply from './pages/Apply'
import Results from './pages/Results'
import ResultDetail from './pages/ResultDetail'
import OrderResults from './pages/OrderResults'
import Unauthorized from './pages/Unauthorized'

// Admin auth
import Login from './pages/admin/Login'
import ProtectedRoute from './router/ProtectedRoute'

// Admin — all roles
import Dashboard from './pages/admin/Dashboard'
import Applications from './pages/admin/Applications'
import ApplicationDetail from './pages/admin/ApplicationDetail'

// Admin — admin only
import ApiKeys from './pages/admin/ApiKeys'
import Webhooks from './pages/admin/Webhooks'
import UserManagement from './pages/admin/UserManagement'

// Patients — admin, front_desk, lab_scientist
import PatientList from './pages/admin/patients/PatientList'
import RegisterPatient from './pages/admin/patients/RegisterPatient'
import PatientDetail from './pages/admin/patients/PatientDetail'

// Orders — all internal roles
import OrderList from './pages/admin/orders/OrderList'
import CreateOrder from './pages/admin/orders/CreateOrder'
import OrderDetail from './pages/admin/orders/OrderDetail'

// Test Type Management — admin only
import TestTypeManagement from './pages/admin/TestTypeManagement'

// Billing — admin, finance, front_desk
import InvoiceList from './pages/admin/billing/InvoiceList'
import InvoiceDetail from './pages/admin/billing/InvoiceDetail'
import TestPricing from './pages/admin/billing/TestPricing'
import FinanceDashboard from './pages/admin/billing/FinanceDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/apply" element={<Apply />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:tracking_number" element={<ResultDetail />} />
          <Route path="/order-results" element={<OrderResults />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin login */}
          <Route path="/admin/login" element={<Login />} />

          {/* All authenticated roles */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/applications" element={<Applications />} />
            <Route path="/admin/applications/:id" element={<ApplicationDetail />} />

            {/* Orders — all roles */}
            <Route path="/admin/orders" element={<OrderList />} />
            <Route path="/admin/orders/:id" element={<OrderDetail />} />
          </Route>

          {/* Admin + Front Desk: create orders & register patients */}
          <Route element={<ProtectedRoute allowedRoles={['admin','front_desk']} />}>
            <Route path="/admin/orders/new" element={<CreateOrder />} />
            <Route path="/admin/patients/new" element={<RegisterPatient />} />
          </Route>

          {/* Admin + Front Desk + Lab Scientist: patients */}
          <Route element={<ProtectedRoute allowedRoles={['admin','front_desk','lab_scientist']} />}>
            <Route path="/admin/patients" element={<PatientList />} />
            <Route path="/admin/patients/:id" element={<PatientDetail />} />
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/api-keys" element={<ApiKeys />} />
            <Route path="/admin/webhooks" element={<Webhooks />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/billing/pricing" element={<TestPricing />} />
            <Route path="/admin/test-types" element={<TestTypeManagement />} />
          </Route>

          {/* Admin + Finance + Front Desk: billing */}
          <Route element={<ProtectedRoute allowedRoles={['admin','finance','front_desk']} />}>
            <Route path="/admin/billing" element={<InvoiceList />} />
            <Route path="/admin/billing/:id" element={<InvoiceDetail />} />
          </Route>

          {/* Admin + Finance: finance dashboard */}
          <Route element={<ProtectedRoute allowedRoles={['admin','finance']} />}>
            <Route path="/admin/finance" element={<FinanceDashboard />} />
          </Route>

          {/* Defaults */}
          <Route path="/" element={<Navigate to="/apply" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
