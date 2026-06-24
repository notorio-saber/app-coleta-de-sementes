import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Navigation, Image as ImageIcon, Copy, Map as MapIcon } from 'lucide-react';
import { PhotoModal } from '../components/PhotoModal';

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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function RoutesView() {
  const { activeTeam } = useTeam();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);

  const [cityFilter, setCityFilter] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'distance' | 'urgency'>('urgency');
  const [selectedPhotoMatrix, setSelectedPhotoMatrix] = useState<any>(null);

  useEffect(() => {
    // 1. Ask for location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (err) => {
          console.error("GPS Error:", err);
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

  async function populateCities(data: any[]) {
    const cityCache = new Map<string, string>();
    const updatedData = [...data];
    const citiesSet = new Set<string>();

    setMatrices(updatedData);
    setLoading(false);

    for (let i = 0; i < updatedData.length; i++) {
      const m = updatedData[i];
      const cacheKey = `${parseFloat(m.lat).toFixed(1)},${parseFloat(m.lng).toFixed(1)}`;
      
      if (!cityCache.has(cacheKey)) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${m.lat}&lon=${m.lng}&zoom=10`);
          const geo = await res.json();
          const city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.municipality || 'Desconhecida';
          cityCache.set(cacheKey, city);
          await delay(1000);
        } catch (e) {
          cityCache.set(cacheKey, 'Desconhecida');
        }
      }
      
      const foundCity = cityCache.get(cacheKey) as string;
      updatedData[i] = { ...updatedData[i], cityName: foundCity };
      if (foundCity !== 'Desconhecida') citiesSet.add(foundCity);
      
      if (i % 3 === 0 || i === updatedData.length - 1) {
        setMatrices([...updatedData]);
        setAvailableCities(Array.from(citiesSet).sort());
      }
    }
  }

  async function fetchData() {
    if (!activeTeam) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
      const snapshot = await getDocs(q);
      
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        
      if (userLoc) {
        data = data.map(m => {
          const dist = getDistanceFromLatLonInKm(userLoc.lat, userLoc.lng, parseFloat(m.lat), parseFloat(m.lng));
          return { ...m, distanceKm: dist };
        });
      }

      data = data.map(m => {
        let diffDays = 9999;
        if (m.revisitDate) {
          const revDate = new Date(m.revisitDate);
          const today = new Date();
          diffDays = Math.ceil((revDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        return { ...m, diffDays };
      });

      await populateCities(data);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  const handleCopyCoords = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    alert('Coordenadas copiadas!');
  };

  const filteredMatrices = matrices.filter(m => {
    if (cityFilter && m.cityName !== cityFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortMode === 'urgency') {
      return (a.diffDays || 9999) - (b.diffDays || 9999);
    } else {
      return (a.distanceKm || 0) - (b.distanceKm || 0);
    }
  });

  const handleGenerateRoute = () => {
    if (filteredMatrices.length === 0) return;
    
    // Limits waypoint to top 10
    const stops = filteredMatrices.slice(0, 10);
    let url = 'https://www.google.com/maps/dir/?api=1';
    
    if (userLoc) {
      url += `&origin=${userLoc.lat},${userLoc.lng}`;
    } else {
      // Use the first stop as origin if no GPS
      const origin = stops.shift();
      if(origin) {
         url += `&origin=${origin.lat},${origin.lng}`;
      }
    }
    
    if (stops.length > 0) {
      const destination = stops[stops.length - 1];
      url += `&destination=${destination.lat},${destination.lng}`;
      
      if (stops.length > 1) {
        const waypoints = stops.slice(0, stops.length - 1).map(s => `${s.lat},${s.lng}`).join('|');
        url += `&waypoints=${waypoints}`;
      }
    }
    
    window.open(url, '_blank');
  };

  if (loading) return <p style={{ padding: '2rem' }}>Calculando rotas e buscando matrizes...</p>;

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Rotas Sugeridas</h2>
      </div>

      {!userLoc && (
        <div className="card" style={{ backgroundColor: 'var(--warning-color)', color: '#000', marginBottom: '1rem' }}>
          <strong>Atenção:</strong> Não foi possível acessar seu GPS. A lista abaixo não está ordenada por distância até você.
        </div>
      )}

      {/* Controles de Filtro e Rota */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
         <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filtrar por Cidade</label>
               <select className="select" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }}>
                 <option value="">Todas as cidades</option>
                 {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
               <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ordenar por</label>
               <select className="select" value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} style={{ width: '100%', marginTop: '0.25rem' }}>
                 <option value="urgency">Maior Necessidade</option>
                 <option value="distance">Mais Próximas</option>
               </select>
            </div>
         </div>

         <button 
           onClick={handleGenerateRoute} 
           className="btn btn-primary" 
           style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
         >
           <MapIcon size={20} />
           Gerar Rota Otimizada (Top {Math.min(10, filteredMatrices.length)})
         </button>
      </div>

      {filteredMatrices.length === 0 ? (
        <p className="text-muted">Nenhuma matriz encontrada nesta equipe.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredMatrices.map((matrix, index) => {
            const firstPhoto = (matrix.photos && matrix.photos.length > 0) ? matrix.photos[0] : 
                               (matrix.photoBase64s && matrix.photoBase64s.length > 0) ? matrix.photoBase64s[0] : null;

             let progressProgress = 0;
             let statusColor = 'var(--success-color)';
             let isUrgent = false;
             const diffDays = matrix.diffDays || 0;
             
             if (matrix.revisitDate) {
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
                  <div 
                    onClick={() => setSelectedPhotoMatrix(matrix)}
                    style={{ width: '55px', height: '55px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--surface-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    {firstPhoto ? (
                      <img src={firstPhoto} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={20} color="var(--text-muted)" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <h3 style={{ fontSize: '1rem', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.commonName}</h3>
                       {matrix.distanceKm !== undefined && (
                         <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                           {matrix.distanceKm.toFixed(1)} km
                         </span>
                       )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <p style={{ margin: '0', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.scientificName}</p>
                      <span style={{ fontSize: '0.7rem', color: statusColor, fontWeight: 500, padding: '2px 6px', background: `${statusColor}15`, borderRadius: '4px' }}>{matrix.fruitingStage}</span>
                    </div>
                  </div>
                </div>

                 {/* Informação sobre Cidade e GPS */}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.50rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.50rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                         Cidade: {matrix.cityName || (matrix.cityName === 'Desconhecida' ? 'Não encontrada' : 'Buscando...')}
                       </span>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                           Lat: {Number(matrix.lat).toFixed(5)}, Lng: {Number(matrix.lng).toFixed(5)}
                        </span>
                        <button onClick={() => handleCopyCoords(matrix.lat, matrix.lng)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '0.2rem' }} title="Copiar Coordenadas">
                           <Copy size={14} />
                        </button>
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
                      <Navigation size={14} /> Rota Direta
                    </a>
                  ) : (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <Navigation size={14} /> Rota Direta
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PhotoModal 
        isOpen={!!selectedPhotoMatrix}
        onClose={() => setSelectedPhotoMatrix(null)}
        photos={selectedPhotoMatrix?.photos || selectedPhotoMatrix?.photoBase64s || []}
        matrixCode={selectedPhotoMatrix?.matrixCode}
        lat={selectedPhotoMatrix?.lat}
        lng={selectedPhotoMatrix?.lng}
        commonName={selectedPhotoMatrix?.commonName}
      />
    </div>
  );
}
