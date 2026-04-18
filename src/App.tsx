import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import { Login } from './pages/Login';
import { RegisterMatrix } from './pages/RegisterMatrix';

import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/MapView';
import { RoutesView } from './pages/RoutesView';
import { MatricesList } from './pages/MatricesList';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import { EditMatrix } from './pages/EditMatrix';
import { Collections } from './pages/Collections';
import { Processing } from './pages/Processing';
import { OfflineRecords } from './pages/OfflineRecords';
import { AdminAccounts } from './pages/AdminAccounts';
import { InactiveScreen } from './components/InactiveScreen';

// Auth Guard Component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>;
  }

  if (!user || !dbUser) {
    return <Navigate to="/login" replace />;
  }

  if (!dbUser.active) {
    return <InactiveScreen />;
  }

  return <TeamProvider>{children}</TeamProvider>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
            <Route index element={<Dashboard />} />
            <Route path="map" element={<MapView />} />
            <Route path="routes" element={<RoutesView />} />
            <Route path="matrices" element={<MatricesList />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="settings" element={<Settings />} />
            <Route path="coletas" element={<Collections />} />
            <Route path="processing" element={<Processing />} />
            <Route path="sync" element={<OfflineRecords />} />
            <Route path="register" element={<RegisterMatrix />} />
            <Route path="edit/:id" element={<EditMatrix />} />
            <Route path="admin" element={<AdminAccounts />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
