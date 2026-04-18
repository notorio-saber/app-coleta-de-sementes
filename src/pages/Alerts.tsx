import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Alerts() {
  const { activeTeam } = useTeam();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRevisits() {
      if (!activeTeam) return;
      try {
        setLoading(true);
        const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
        const snapshot = await getDocs(q);
        
        const now = new Date();
        const flagged: any[] = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.revisitDate) {
            const revDate = new Date(data.revisitDate);
            const diffTime = revDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Only show upcoming and late
            if (diffDays <= 7) {
               flagged.push({ id: doc.id, ...data, diffDays });
            }
          }
        });

        flagged.sort((a,b) => a.diffDays - b.diffDays);
        setMatrices(flagged);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRevisits();
  }, [activeTeam]);

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--danger-color)', margin: 0 }}>Caixa de Alertas</h2>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Voltar</button>
      </div>

      {loading ? (
        <p>Procurando alertas...</p>
      ) : matrices.length === 0 ? (
        <p className="text-muted">Nenhum registro urgente ou próximo do prazo para sua equipe!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {matrices.map(matrix => {
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
                  
                  {/* Barra Progressiva */}
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
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Data Limite: {new Date(matrix.revisitDate).toLocaleDateString()}</span>
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
