import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import { Login } from './pages/Login';
import { RegisterMatrix } from './pages/RegisterMatrix';

import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/MapView';
import { Notifications } from './pages/Notifications';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

// Auth Guard Component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
            <Route path="notifications" element={<Notifications />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="register" element={<RegisterMatrix />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
