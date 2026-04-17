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

// Custom icons based on status
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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
              icon={isUrgent ? redIcon : greenIcon}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <h3 style={{ margin: '0 0 5px 0' }}>{matrix.commonName}</h3>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontStyle: 'italic' }}>{matrix.scientificName}</p>
                  <p style={{ margin: '0' }}><strong>Estádio:</strong> {matrix.fruitingStage}</p>
                  {matrix.revisitDate && (
                    <p style={{ margin: '5px 0 0 0', color: isUrgent ? 'var(--danger-color)' : 'var(--text-main)' }}>
                      <strong>Revisita:</strong> {new Date(matrix.revisitDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
