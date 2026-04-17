import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';

export function Dashboard() {
  const { activeTeam } = useTeam();
  const [matricesCount, setMatricesCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!activeTeam) return;
      try {
        setLoading(true);
        const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
        const snapshot = await getDocs(q);
        
        setMatricesCount(snapshot.size);
        
        let urgent = 0;
        const now = new Date();
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.revisitDate) {
            const revDate = new Date(data.revisitDate);
            // Urgent if it's past due or due within 3 days
            const diffTime = revDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
              urgent++;
            }
          }
        });
        setUrgentCount(urgent);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [activeTeam]);

  if (!activeTeam) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Bem-vindo!</h2>
        <p>Você não está em nenhuma equipe. Crie ou entre em uma em Ajustes.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ color: 'var(--primary-color)' }}>Visão Geral</h1>
      <p className="text-muted">Equipe: {activeTeam.name}</p>
      
      {loading ? (
        <p>Carregando dados...</p>
      ) : (
        <>
          <div className="card" style={{ marginTop: '1rem', borderTop: '4px solid var(--primary-color)' }}>
            <h2 style={{ fontSize: '1rem' }}>Resumo</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ flex: 1, backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{matricesCount}</div>
                <div style={{ fontSize: '0.875rem' }}>Matrizes</div>
              </div>
              <div style={{ flex: 1, backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', textAlign: 'center', border: urgentCount > 0 ? '1px solid var(--danger-color)' : 'none' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: urgentCount > 0 ? 'var(--danger-color)' : 'var(--warning-color)' }}>{urgentCount}</div>
                <div style={{ fontSize: '0.875rem' }}>Revisões Urgentes</div>
              </div>
            </div>
          </div>
          
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
              <Plus size={18} /> Nova Matriz
            </button>
          </Link>
          
          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Acesso Rápido</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/map" className="btn btn-secondary">
                <Eye size={18} /> Ver no Mapa
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
