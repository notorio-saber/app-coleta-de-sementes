import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';

export function Notifications() {
  const { activeTeam } = useTeam();
  const { user } = useAuth();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [scope, setScope] = useState<'team'|'mine'>('team');
  const [status, setStatus] = useState<'all'|'urgent'|'upcoming'|'ok'>('all');

  useEffect(() => {
    async function fetchRevisits() {
      if (!activeTeam) return;
      try {
        const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
        const snapshot = await getDocs(q);
        
        let data = snapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
          .filter((m: any) => m.revisitDate);
          
        // Sort by Revisit Date ascending
        data.sort((a: any, b: any) => new Date(a.revisitDate).getTime() - new Date(b.revisitDate).getTime());
        
        setMatrices(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchRevisits();
  }, [activeTeam]);

  if (loading) return <p style={{ padding: '2rem' }}>Carregando...</p>;

  // Apply Client-Side Filters
  let filteredMatrices = matrices;
  if (scope === 'mine') {
    filteredMatrices = filteredMatrices.filter(m => m.creatorId === user?.uid);
  }
  
  filteredMatrices = filteredMatrices.filter(matrix => {
    const revDate = new Date(matrix.revisitDate);
    const diffDays = Math.ceil((revDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (status === 'urgent') return diffDays <= 0;
    if (status === 'upcoming') return diffDays > 0 && diffDays <= 7;
    if (status === 'ok') return diffDays > 7;
    return true;
  });

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Avisos e Revisitas</h2>
      </div>

      {/* Filters UI */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${scope === 'team' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1, padding: '0.5rem' }} 
            onClick={() => setScope('team')}
          >
            Equipe
          </button>
          <button 
            className={`btn ${scope === 'mine' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1, padding: '0.5rem' }} 
            onClick={() => setScope('mine')}
          >
            Meus
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <button className={`btn ${status === 'all' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setStatus('all')}>Todos</button>
          <button className={`btn ${status === 'urgent' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setStatus('urgent')}>Atrasados</button>
          <button className={`btn ${status === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setStatus('upcoming')}>Próximos (7d)</button>
        </div>
      </div>
      
      {filteredMatrices.length === 0 ? (
        <p className="text-muted">Nenhuma revisão programada para este filtro.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredMatrices.map(matrix => {
            const revDate = new Date(matrix.revisitDate);
            const today = new Date();
            const diffTime = revDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let statusColor = 'var(--success-color)';
            let Icon = CheckCircle2;
            let statusText = `${diffDays} dias`;
            
            // Calculando base para progress bar assumindo janela máx de 60 dias
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
                  
                  {/* Progress Bar Container */}
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
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Agendado: {revDate.toLocaleDateString()}</span>
                    {matrix.creatorEmail && <span style={{ fontSize: '0.7rem', color: '#888' }}>{matrix.creatorEmail.split('@')[0]}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
