import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import ClusterList from '@/pages/ClusterList'
import ClusterDetail from '@/pages/ClusterDetail'
import Deployments from '@/pages/Deployments'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/clusters" element={<ClusterList />} />
        <Route path="/clusters/:id" element={<ClusterDetail />} />
        <Route path="/deployments" element={<Deployments />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}
