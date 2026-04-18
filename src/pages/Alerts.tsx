import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AlertCircle, Calendar, CheckCircle2, MapPin, Image as ImageIcon } from 'lucide-react';
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
          {matrices.map((matrix, index) => {
            const diffDays = matrix.diffDays;
            
            let statusColor = 'var(--success-color)';
            let Icon = CheckCircle2;
            let statusText = `${diffDays} dias`;
            

            if (diffDays <= 0) {
              statusColor = 'var(--danger-color)';
              Icon = AlertCircle;
              statusText = 'Atrasado';
            } else if (diffDays <= 7) {
              statusColor = 'var(--warning-color)';
              Icon = Calendar;
              statusText = `${diffDays} dias`;
            }

            const firstPhoto = (matrix.photos && matrix.photos.length > 0) ? matrix.photos[0] : 
                               (matrix.photoBase64s && matrix.photoBase64s.length > 0) ? matrix.photoBase64s[0] : null;

            return (
              <div key={matrix.id} className="card electric-card animate-entry" style={{ animationDelay: `${index * 50}ms`, padding: '0.75rem' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '55px', height: '55px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--surface-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {firstPhoto ? (
                      <img src={firstPhoto} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={20} color="var(--text-muted)" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '1rem', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.commonName}</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.scientificName}</p>
                      </div>
                      <Icon color={statusColor} size={20} style={{ flexShrink: 0, marginLeft: '0.5rem' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>Data Limite: <span style={{color: statusColor}}>{new Date(matrix.revisitDate).toLocaleDateString()}</span></span>
                  <span style={{ fontSize: '0.75rem', color: statusColor }}>{statusText}</span>
                </div>

                <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`, '_blank')} 
                  className="btn btn-primary" 
                  style={{ marginTop: '0.75rem', width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                >
                  <MapPin size={14} /> Obter Rota
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
