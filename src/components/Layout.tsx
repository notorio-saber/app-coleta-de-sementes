import { Outlet, NavLink } from 'react-router-dom';
import { Home, Map as MapIcon, Navigation, Archive, Settings, Bell, ClipboardList, FlaskConical } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

export function Layout() {
  const { userRole } = useTeam();
  
  return (
    <div className="app-container">
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.2rem 1.25rem', 
        backgroundColor: 'rgba(5, 5, 5, 0.8)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Mascote" style={{ height: '40px', width: '40px', objectFit: 'contain', borderRadius: '15px', backgroundColor: 'var(--surface-elevated)' }} />
          <h1 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--primary-color)' }}>SeedDesk</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <NavLink to="/alerts" style={{ color: 'var(--text-muted)' }}>
             <Bell size={24} />
          </NavLink>
          <NavLink to="/settings" style={{ color: 'var(--text-muted)' }}>
             <Settings size={24} />
          </NavLink>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home />
          <span>Início</span>
        </NavLink>
        
        {(userRole === 'admin' || userRole === 'coletor') && (
          <>
            <NavLink to="/coletas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <ClipboardList />
              <span>Coletas</span>
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <MapIcon />
              <span>Mapa</span>
            </NavLink>
            <NavLink to="/routes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Navigation />
              <span>Rotas</span>
            </NavLink>
          </>
        )}

        {(userRole === 'admin' || userRole === 'beneficiador') && (
          <NavLink to="/processing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FlaskConical />
            <span>Lab</span>
          </NavLink>
        )}
        
        <NavLink to="/matrices" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Archive />
          <span>Matrizes</span>
        </NavLink>
      </nav>
    </div>
  );
}
