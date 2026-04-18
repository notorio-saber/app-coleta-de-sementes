import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Navigation, MapPin } from 'lucide-react';

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
          {matrices.map(matrix => {
            const distanceText = matrix.distanceKm !== undefined 
              ? (matrix.distanceKm < 1 ? `${Math.round(matrix.distanceKm * 1000)}m` : `${matrix.distanceKm.toFixed(1)}km`)
              : 'N/A';

            return (
              <div key={matrix.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{matrix.commonName}</h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>{matrix.scientificName}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={18} /> {distanceText}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>Estádio: {matrix.fruitingStage}</span>
                  {userLoc ? (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${matrix.lat},${matrix.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                      <Navigation size={18} /> Guiar
                    </a>
                  ) : (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${matrix.lat},${matrix.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Ver no Mapa
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
