import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Fix for default Leaflet icons in Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Custom Tree Icon
const treeIcon = new L.DivIcon({
  html: '<div style="font-size: 28px; line-height: 1; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.4));">🌳</div>',
  className: 'custom-tree-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

const redTreeIcon = new L.DivIcon({
  html: '<div style="font-size: 28px; line-height: 1; filter: drop-shadow(0px 2px 2px rgba(255,0,0,0.6));">⚠️</div>',
  className: 'custom-tree-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

const userIcon = new L.DivIcon({
  html: '<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>',
  className: 'custom-user-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

export function MapView() {
  const { activeTeam } = useTeam();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (err) => console.error("GPS Error Map:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    async function fetchMatrices() {
      if (!activeTeam) return;
      const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatrices(data);
    }
    
    fetchMatrices();
  }, [activeTeam]);

  // Center on Brazil as default if no matrices
  const center: [number, number] = matrices.length > 0 
    ? [matrices[0].lat, matrices[0].lng] 
    : userLoc 
      ? [userLoc.lat, userLoc.lng] 
      : [-14.2350, -51.9253];

  return (
    <div style={{ height: 'calc(100vh - 140px)', width: '100%', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={matrices.length > 0 ? 12 : 4} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {userLoc && (
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
            <Popup>
              <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                 <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary-color)' }}>Sua Posição</h3>
              </div>
            </Popup>
          </Marker>
        )}
        {matrices.map(matrix => {
          let isUrgent = false;
          if (matrix.revisitDate) {
            const revDate = new Date(matrix.revisitDate);
            const diffTime = revDate.getTime() - new Date().getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) isUrgent = true;
          }

          return (
            <Marker 
              key={matrix.id} 
              position={[matrix.lat, matrix.lng]}
              icon={isUrgent ? redTreeIcon : treeIcon}
            >
              <Popup>
                <div style={{ minWidth: '160px', padding: '0.25rem' }}>
                  {matrix.photos && matrix.photos.length > 0 && (
                    <div style={{ width: '100%', height: '100px', marginBottom: '12px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={matrix.photos[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Matriz" />
                    </div>
                  )}
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.05rem', color: 'var(--text-main)' }}>{matrix.commonName}</h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{matrix.scientificName}</p>
                  
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                     <span style={{ fontSize: '0.7rem', color: isUrgent ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 500, padding: '2px 6px', background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '4px' }}>{matrix.fruitingStage}</span>
                  </div>
                  
                  {matrix.revisitDate && (
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: isUrgent ? 'var(--danger-color)' : 'var(--text-muted)' }}>
                      <strong>Prazo limite:</strong> {new Date(matrix.revisitDate).toLocaleDateString()}
                    </p>
                  )}

                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`, '_blank')} 
                    className="btn btn-primary"
                    style={{ marginTop: '12px', padding: '0.5rem 1rem', width: '100%', borderRadius: '12px', color: 'white', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Obter Rota
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
