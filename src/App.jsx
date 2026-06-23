import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import ClusterList from '@/pages/ClusterList';
import ClusterDetail from '@/pages/ClusterDetail';
import Deployments from '@/pages/Deployments';
import Settings from '@/pages/Settings';
import SettingsLayout from '@/components/layout/SettingsLayout';
import ClustersSettings from '@/pages/settings/ClustersSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/clusters" element={<ClusterList />} />
        <Route path="/clusters/:id" element={<ClusterDetail />} />
        <Route path="/deployments" element={<Deployments />} />

        {/* Settings Routes */}
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Settings />} />
          <Route path="clusters" element={<ClustersSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
