import { useState, useRef } from 'react';
import { useTeam } from '../context/TeamContext';
import { MapPin, Camera, Save } from 'lucide-react';
import { saveMatrixOffline } from '../lib/offlineSync';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

export function RegisterMatrix() {
  const { activeTeam } = useTeam();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    scientificName: '',
    commonName: '',
    fruitingStage: 'Sem frutos',
    notes: '',
    revisitDays: '30'
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const handleCaptureLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          alert('Erro ao obter localização: ' + error.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocalização não suportada neste dispositivo.');
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) {
      alert('Você precisa estar em uma equipe para registrar.');
      return;
    }
    if (!location) {
      alert('Por favor, capture a localização da matriz antes de salvar.');
      return;
    }

    setLoading(true);

    const revisitDate = new Date();
    revisitDate.setDate(revisitDate.getDate() + parseInt(formData.revisitDays));

    const payload = {
      ...formData,
      lat: location.lat,
      lng: location.lng,
      revisitDate: revisitDate.toISOString(),
      teamId: activeTeam.id,
      photoBase64: photo
    };

    try {
      if (navigator.onLine) {
        let photoUrl = '';
        if (photo) {
          const filename = `matrices/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const storageRef = ref(storage, filename);
          const snapshot = await uploadString(storageRef, photo, 'data_url');
          photoUrl = await getDownloadURL(snapshot.ref);
        }

        await addDoc(collection(db, 'matrices'), {
          scientificName: formData.scientificName,
          commonName: formData.commonName,
          fruitingStage: formData.fruitingStage,
          lat: location.lat,
          lng: location.lng,
          notes: formData.notes,
          photos: photoUrl ? [photoUrl] : [],
          createdAt: serverTimestamp(),
          revisitDate: revisitDate.toISOString(),
          teamId: activeTeam.id
        });
        alert('Matriz salva com sucesso!');
      } else {
        await saveMatrixOffline(payload);
        alert('Matriz salva offline. Será sincronizada quando houver conexão.');
      }
      
      navigate('/');
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '60px' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Cadastrar Matriz</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Nome Popular*</label>
          <input 
            required 
            className="input" 
            value={formData.commonName}
            onChange={e => setFormData({...formData, commonName: e.target.value})}
            placeholder="Ex: Pau-Brasil" 
          />
        </div>

        <div className="input-group">
          <label>Nome Científico</label>
          <input 
            className="input" 
            value={formData.scientificName}
            onChange={e => setFormData({...formData, scientificName: e.target.value})}
            placeholder="Ex: Paubrasilia echinata" 
          />
        </div>

        <div className="input-group">
          <label>Estádio de Frutificação*</label>
          <select 
            className="select" 
            value={formData.fruitingStage}
            onChange={e => setFormData({...formData, fruitingStage: e.target.value})}
          >
            <option value="Sem frutos">Sem frutos</option>
            <option value="Flores">Flores</option>
            <option value="Frutos verdes">Frutos verdes</option>
            <option value="Quase maduros">Quase maduros</option>
            <option value="Maduros">Maduros</option>
          </select>
        </div>

        <div className="input-group">
          <label>Notificar Re-visita (Dias)*</label>
          <input 
            type="number" 
            required 
            className="input" 
            value={formData.revisitDays}
            onChange={e => setFormData({...formData, revisitDays: e.target.value})}
          />
        </div>

        <div className="input-group">
          <label>Localização (GPS)*</label>
          {location ? (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem' }}>
              Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={handleCaptureLocation}>
              <MapPin size={18} /> Obter Coordenadas
            </button>
          )}
        </div>

        <div className="input-group">
          <label>Foto da Matriz</label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handlePhotoCapture}
          />
          {photo ? (
            <div style={{ position: 'relative' }}>
              <img src={photo} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--border-radius-sm)' }} />
              <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ marginTop: '0.5rem' }}>
                Refazer Foto
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Camera size={18} /> Tirar Foto
            </button>
          )}
        </div>

        <div className="input-group">
          <label>Observações</label>
          <textarea 
            className="textarea" 
            rows={3}
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Salvando...' : <><Save size={20} /> Salvar Matriz</>}
        </button>
      </form>
    </div>
  );
}
