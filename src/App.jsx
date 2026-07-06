import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import ClusterList from '@/pages/ClusterList';
import ClusterDetail from '@/pages/ClusterDetail';
import Deployments from '@/pages/Deployments';
import ConfigDeploy from '@/pages/ConfigDeploy';
import Monitor from '@/pages/Monitor';
import Conf from '@/pages/Conf';
import Settings from '@/pages/Settings';
import SettingsLayout from '@/components/layout/SettingsLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Protected routes — require authentication */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/conf" element={<Conf />} />
            <Route path="/clusters" element={<ClusterList />} />
            <Route path="/clusters/:id" element={<ClusterDetail />} />
            <Route path="/config-deploy" element={<ConfigDeploy />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/deployments" element={<Deployments />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Settings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
