import { Outlet, NavLink } from 'react-router-dom';
import { Home, Map as MapIcon, Navigation, Archive, Settings, Bell } from 'lucide-react';

export function Layout() {
  return (
    <div className="app-container">
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem', 
        backgroundColor: 'var(--surface-color)', 
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)' }}>Sementes</h1>
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
