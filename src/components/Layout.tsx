import { Outlet, NavLink } from 'react-router-dom';
import { Home, Map as MapIcon, Navigation, Archive, Settings, Bell } from 'lucide-react';

export function Layout() {
  return (
    <div className="app-container">
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0.8rem 1rem', 
        backgroundColor: 'rgba(5, 5, 5, 0.8)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="Mascote" style={{ height: '32px', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)' }}>SeedDesk</h1>
        </div>
        <NavLink to="/alerts" style={{ color: 'var(--text-muted)' }}>
           <Bell size={24} />
        </NavLink>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home />
          <span>Início</span>
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MapIcon />
          <span>Mapa</span>
        </NavLink>
        <NavLink to="/routes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Navigation />
          <span>Rotas</span>
        </NavLink>
        <NavLink to="/matrices" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Archive />
          <span>Matrizes</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings />
          <span>Ajustes</span>
        </NavLink>
      </nav>
    </div>
  );
}
