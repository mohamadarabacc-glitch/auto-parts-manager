import { Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import BackupPage from './pages/BackupPage'
import DashboardPage from './pages/DashboardPage'
import ExpenseFormPage from './pages/ExpenseFormPage'
import ExpensesPage from './pages/ExpensesPage'
import InventoryPage from './pages/InventoryPage'
import PartFormPage from './pages/PartFormPage'
import PurchaseFormPage from './pages/PurchaseFormPage'
import PurchasesPage from './pages/PurchasesPage'
import RepairFormPage from './pages/RepairFormPage'
import RepairsPage from './pages/RepairsPage'
import ReportsPage from './pages/ReportsPage'
import SaleFormPage from './pages/SaleFormPage'
import SalesPage from './pages/SalesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/new" element={<PartFormPage />} />
        <Route path="inventory/:id" element={<PartFormPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<PurchaseFormPage />} />
        <Route path="purchases/:id" element={<PurchaseFormPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/new" element={<SaleFormPage />} />
        <Route path="sales/:id" element={<SaleFormPage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route path="repairs/new" element={<RepairFormPage />} />
        <Route path="repairs/:id" element={<RepairFormPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="expenses/new" element={<ExpenseFormPage />} />
        <Route path="expenses/:id" element={<ExpenseFormPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
