import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';

export function Notifications() {
  const { activeTeam } = useTeam();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ marginBottom: '60px' }}>
      <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Revisitas Programadas</h2>
      
      {matrices.length === 0 ? (
        <p className="text-muted">Nenhuma revisão programada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {matrices.map(matrix => {
            const revDate = new Date(matrix.revisitDate);
            const today = new Date();
            const diffTime = revDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let statusColor = 'var(--success-color)';
            let Icon = CheckCircle2;
            let statusText = `${diffDays} dias restantes`;

            if (diffDays <= 0) {
              statusColor = 'var(--danger-color)';
              Icon = AlertCircle;
              statusText = 'Atrasado';
            } else if (diffDays <= 3) {
              statusColor = 'var(--warning-color)';
              Icon = Calendar;
              statusText = 'Próximo';
            }

            return (
              <div key={matrix.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', borderLeft: `4px solid ${statusColor}` }}>
                <div>
                  <Icon color={statusColor} size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{matrix.commonName}</h3>
                  <p className="text-muted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>{matrix.scientificName} • Estádio: {matrix.fruitingStage}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Data: {revDate.toLocaleDateString()}</span>
                    <span style={{ fontSize: '0.875rem', color: statusColor, fontWeight: 'bold' }}>{statusText}</span>
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
