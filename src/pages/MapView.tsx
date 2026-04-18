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

export function MapView() {
  const { activeTeam } = useTeam();
  const [matrices, setMatrices] = useState<any[]>([]);

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
  const center: [number, number] = matrices.length > 0 ? [matrices[0].lat, matrices[0].lng] : [-14.2350, -51.9253];

  return (
    <div style={{ height: 'calc(100vh - 140px)', width: '100%', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
      <MapContainer center={center} zoom={matrices.length > 0 ? 12 : 4} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
                <div style={{ minWidth: '160px' }}>
                  {matrix.photos && matrix.photos.length > 0 && (
                    <div style={{ width: '100%', height: '80px', marginBottom: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={matrix.photos[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Matriz" />
                    </div>
                  )}
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{matrix.commonName}</h3>
                  <p style={{ margin: '0 0 5px 0', fontSize: '11px', fontStyle: 'italic', color: '#666' }}>{matrix.scientificName}</p>
                  <p style={{ margin: '0', fontSize: '12px' }}><strong>Estádio:</strong> {matrix.fruitingStage}</p>
                  
                  {matrix.revisitDate && (
                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: isUrgent ? 'var(--danger-color)' : 'inherit' }}>
                      <strong>Revisita:</strong> {new Date(matrix.revisitDate).toLocaleDateString()}
                    </p>
                  )}

                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`, '_blank')} 
                    style={{ 
                      marginTop: '10px', width: '100%', padding: '6px', 
                      backgroundColor: 'var(--primary-color)', color: 'white', 
                      border: 'none', borderRadius: '4px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 'bold'
                    }}
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
