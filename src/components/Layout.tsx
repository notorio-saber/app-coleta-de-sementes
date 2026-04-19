import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Map as MapIcon, Navigation, Archive, Settings, Bell, ClipboardList, FlaskConical, CloudOff, Cloud } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { getOfflineData } from '../lib/offlineSync';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Layout() {
  const { activeTeam, userRole } = useTeam();
  const { user } = useAuth();
  const [offlineCount, setOfflineCount] = useState(0);
  const [newMatricesCount, setNewMatricesCount] = useState(0);

  useEffect(() => {
    const checkOffline = async () => {
      try {
        const { matrices, harvests, processings } = await getOfflineData();
        setOfflineCount(matrices.length + harvests.length + processings.length);
      } catch (e) {
        console.error(e);
      }
    };

    checkOffline();
    const interval = setInterval(checkOffline, 5000); // Check every 5s
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeTeam || !user) return;
    const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const lastViewedStr = localStorage.getItem(`lastViewedAlerts_${user.uid}`);
       // Subtract 24 hours just to have an initial state if first time, or use 0
       const lastViewed = lastViewedStr ? new Date(lastViewedStr).getTime() : Date.now() - 24*60*60*1000;
       
       let count = 0;
       snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.creatorId && data.creatorId !== user.uid && data.createdAt) {
             const createdAt = data.createdAt.seconds ? data.createdAt.seconds * 1000 : new Date(data.createdAt).getTime();
             if (createdAt > lastViewed) {
                count++;
             }
          }
       });
       setNewMatricesCount(count);
    });
    return () => unsubscribe();
  }, [activeTeam, user]);
  
  const handleAlertsClick = () => {
    if (user) {
      localStorage.setItem(`lastViewedAlerts_${user.uid}`, new Date().toISOString());
      setNewMatricesCount(0);
    }
  };
  
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
          {userRole !== 'beneficiador' && (
            <NavLink to="/alerts" onClick={handleAlertsClick} style={{ color: 'var(--text-muted)', position: 'relative', display: 'flex', alignItems: 'center' }}>
               <Bell size={24} />
               {newMatricesCount > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: 'var(--danger-color)', borderRadius: '50%' }}></span>}
            </NavLink>
          )}
          <NavLink to="/sync" style={{ color: offlineCount > 0 ? 'var(--warning-color)' : 'var(--text-muted)', position: 'relative', display: 'flex', alignItems: 'center' }}>
             {offlineCount > 0 ? <CloudOff size={24} /> : <Cloud size={24} />}
             {offlineCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--warning-color)', color: '#000', fontSize: '0.6rem', fontWeight: 'bold', padding: '2px 5px', borderRadius: '10px' }}>{offlineCount}</span>}
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
