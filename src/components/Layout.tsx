import { Outlet, NavLink } from 'react-router-dom';
import { Home, Map as MapIcon, Bell, ClipboardList, Settings, Navigation } from 'lucide-react';

export function Layout() {
  return (
    <div className="app-container">
      <main className="main-content">
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
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
        <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Bell />
          <span>Avisos</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ClipboardList />
          <span>Relatórios</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings />
          <span>Ajustes</span>
        </NavLink>
      </nav>
    </div>
  );
}
