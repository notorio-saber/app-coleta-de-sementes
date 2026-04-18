import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Eye, Plus, AlertCircle, Calendar, CheckCircle2, MapPin } from 'lucide-react';

export function Dashboard() {
  const { activeTeam } = useTeam();
  const [matricesCount, setMatricesCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [urgentMatrices, setUrgentMatrices] = useState<any[]>([]);
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
        const flagged: any[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.revisitDate) {
            const revDate = new Date(data.revisitDate);
            const diffTime = revDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7) {
               flagged.push({ id: doc.id, ...data, diffDays });
               if (diffDays <= 3) urgent++;
            }
          }
        });
        
        flagged.sort((a,b) => a.diffDays - b.diffDays);
        setUrgentMatrices(flagged);
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
          
          {urgentMatrices.length > 0 && (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--danger-color)' }}>Urgentes e Próximos</h2>
              {urgentMatrices.map(matrix => {
                const diffDays = matrix.diffDays;
                let statusColor = 'var(--success-color)';
                let Icon = CheckCircle2;
                let statusText = `${diffDays} dias`;
                
                let progressProgress = Math.min(100, Math.max(0, 100 - (diffDays / 60) * 100));

                if (diffDays <= 0) {
                  statusColor = 'var(--danger-color)';
                  Icon = AlertCircle;
                  statusText = 'Atrasado';
                  progressProgress = 100;
                } else if (diffDays <= 7) {
                  statusColor = 'var(--warning-color)';
                  Icon = Calendar;
                  statusText = `${diffDays} dias`;
                }

                return (
                  <div key={matrix.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', borderTop: `4px solid ${statusColor}`, paddingTop: '1.5rem' }}>
                    <div style={{ flex: 1, width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{matrix.commonName}</h3>
                          <p className="text-muted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>{matrix.scientificName}</p>
                        </div>
                        <Icon color={statusColor} size={24} />
                      </div>
                      
                      <div style={{ margin: '1rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          <span className="text-muted">Urgência</span>
                          <span style={{ color: statusColor }}>{statusText}</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progressProgress}%`, backgroundColor: statusColor, transition: 'width 0.3s ease' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Agendado: {new Date(matrix.revisitDate).toLocaleDateString()}</span>
                        {matrix.creatorEmail && <span style={{ fontSize: '0.7rem', color: '#888' }}>{matrix.creatorEmail.split('@')[0]}</span>}
                      </div>

                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`, '_blank')} 
                        className="btn btn-primary" 
                        style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', fontSize: '0.9rem' }}
                      >
                        <MapPin size={16} /> Obter Rota
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
