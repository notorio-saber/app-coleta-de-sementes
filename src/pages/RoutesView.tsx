import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Navigation, Image as ImageIcon } from 'lucide-react';

// Haversine formula to get distance in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d;
}

export function RoutesView() {
  const { activeTeam } = useTeam();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // 1. Ask for location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (err) => {
          console.error("GPS Error:", err);
          // If GPS fails, still fetch but can't sort by distance
          fetchData();
        },
        { enableHighAccuracy: true }
      );
    } else {
      fetchData();
    }
  }, []);

  useEffect(() => {
    if (userLoc) fetchData();
  }, [userLoc, activeTeam]);

  async function fetchData() {
    if (!activeTeam) return;
    try {
      const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
      const snapshot = await getDocs(q);
      
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        
      if (userLoc) {
        // Calculate distance and sort
        data = data.map(m => {
          const dist = getDistanceFromLatLonInKm(userLoc.lat, userLoc.lng, parseFloat(m.lat), parseFloat(m.lng));
          return { ...m, distanceKm: dist };
        });
        // Sort by closest first
        data.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }
      
      setMatrices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p style={{ padding: '2rem' }}>Calculando rotas e buscando matrizes...</p>;

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Rotas Sugeridas</h2>
      </div>

      {!userLoc && (
        <div className="card" style={{ backgroundColor: 'var(--warning-color)', color: '#000', marginBottom: '1rem' }}>
          <strong>Atenção:</strong> Não foi possível acessar seu GPS. A lista abaixo não está ordenada por distância.
        </div>
      )}

      {matrices.length === 0 ? (
        <p className="text-muted">Nenhuma matriz encontrada nesta equipe.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {matrices.map((matrix, index) => {
            const firstPhoto = (matrix.photos && matrix.photos.length > 0) ? matrix.photos[0] : 
                               (matrix.photoBase64s && matrix.photoBase64s.length > 0) ? matrix.photoBase64s[0] : null;

             let diffDays = 0;
             let progressProgress = 0;
             let statusColor = 'var(--success-color)';
             let isUrgent = false;
             
             if (matrix.revisitDate) {
               const revDate = new Date(matrix.revisitDate);
               const today = new Date();
               diffDays = Math.ceil((revDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
               progressProgress = Math.min(100, Math.max(0, 100 - (diffDays / 60) * 100));
               
               if (diffDays <= 7) isUrgent = true;
               if (diffDays <= 0) {
                 statusColor = 'var(--danger-color)';
                 progressProgress = 100;
               } else if (diffDays <= 7) {
                 statusColor = 'var(--warning-color)';
               }
             }

            return (
              <div key={matrix.id} className={`card ${isUrgent ? 'electric-card' : ''} animate-entry`} style={{ animationDelay: `${index * 50}ms`, padding: '0.75rem' }}>
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
                       <h3 style={{ fontSize: '1rem', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.commonName}</h3>
                       {matrix.matrixCode && <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{matrix.matrixCode}</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <p style={{ margin: '0', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.scientificName}</p>
                      <span style={{ fontSize: '0.7rem', color: statusColor, fontWeight: 500, padding: '2px 6px', background: `${statusColor}15`, borderRadius: '4px' }}>{matrix.fruitingStage}</span>
                    </div>
                  </div>
                </div>

                 {/* Observações */}
                 {matrix.notes && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px' }}>
                      <strong style={{ color: 'var(--text-dim)' }}>Obs:</strong> {matrix.notes}
                    </div>
                 )}

                 {/* Barra de Progresso */}
                 {matrix.revisitDate && (
                    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.7rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-dim)' }}>Prazo ({diffDays} dias)</span>
                        <span style={{ color: statusColor }}>{diffDays <= 0 ? 'Atrasado' : `${diffDays} dias restantes`}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progressProgress}%`, background: 'linear-gradient(to right, #10B981, #F59E0B, #EF4444)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                 )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {userLoc ? (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${matrix.lat},${matrix.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <Navigation size={14} /> Obter Rota
                    </a>
                  ) : (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <Navigation size={14} /> Obter Rota
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
