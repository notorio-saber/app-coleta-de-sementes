import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Plus, AlertCircle, Calendar, CheckCircle2, MapPin, Image as ImageIcon } from 'lucide-react';

export function Dashboard() {
  const { activeTeam, userRole } = useTeam();
  const [matricesCount, setMatricesCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [urgentMatrices, setUrgentMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyCollected, setMonthlyCollected] = useState(0);
  const [monthlyRawCollected, setMonthlyRawCollected] = useState(0);

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

        // Fetch Harvests (Colheitas) to calculate monthly goal progress
        const qHarvests = query(collection(db, 'harvests'), where('teamId', '==', activeTeam.id));
        const snapHarvests = await getDocs(qHarvests);
        
        let collectedThisMonth = 0;
        let collectedRawThisMonth = 0;
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        snapHarvests.forEach(doc => {
          const data = doc.data();
          if (data.date) {
             const hDate = new Date(data.date);
             if (hDate.getUTCMonth() === currentMonth && hDate.getUTCFullYear() === currentYear) {
                // Now monthly goal applies ONLY to benefited/processed seeds
                collectedThisMonth += (data.benefitedTotalKg || 0);
                collectedRawThisMonth += (data.totalKg || 0);
             }
          }
        });

        setMonthlyCollected(collectedThisMonth);
        setMonthlyRawCollected(collectedRawThisMonth);

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

          {/* Meta Mensal de Produção */}
          <div className="card" style={{ marginTop: '1rem', borderTop: '4px solid goldenrod' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Meta de Semente Beneficiada</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mês Atual</span>
            </h2>
            
            {activeTeam.monthlyGoalKg && activeTeam.monthlyGoalKg > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-end', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'goldenrod' }}>{monthlyCollected.toFixed(1)} <span style={{ fontSize:'0.8rem' }}>kg Puros</span></span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Meta: {activeTeam.monthlyGoalKg} kg</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--surface-elevated)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min(100, (monthlyCollected / activeTeam.monthlyGoalKg) * 100)}%`, 
                    background: 'linear-gradient(to right, #F59E0B, #10B981)', 
                    transition: 'width 1s ease-in-out' 
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    {((monthlyCollected / activeTeam.monthlyGoalKg) * 100).toFixed(1)}% alcançado
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    *Curiosidade (Bruto na Roça): {monthlyRawCollected.toFixed(1)} kg
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Nenhuma meta mensal definida ainda. O Gerente da equipe pode ditar a meta em Ajustes.
              </p>
            )}
          </div>
          
          
          {userRole !== 'beneficiador' && (
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                <Plus size={18} /> Nova Matriz
              </button>
            </Link>
          )}
          
          {urgentMatrices.length > 0 && (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--danger-color)' }}>Urgentes e Próximos</h2>
              {urgentMatrices.slice(0, 5).map((matrix, index) => {
                const diffDays = matrix.diffDays;
                let statusColor = 'var(--success-color)';
                let Icon = CheckCircle2;
                let statusText = `${diffDays} dias`;
                const isUrgent = diffDays <= 3;

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
                  <div key={matrix.id} className={`card animate-entry ${isUrgent ? 'electric-card' : ''}`} style={{ animationDelay: `${index * 50}ms`, padding: '0.75rem' }}>
                    
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
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>{new Date(matrix.revisitDate).toLocaleDateString()}</span>
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
        </>
      )}
    </div>
  );
}
