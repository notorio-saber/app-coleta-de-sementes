import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeam } from '../context/TeamContext';
import { Camera, Save } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export function EditMatrix() {
  const { id } = useParams<{ id: string }>();
  const { activeTeam } = useTeam();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  
  const [formData, setFormData] = useState({
    scientificName: '',
    commonName: '',
    fruitingStage: 'Sem frutos',
    notes: '',
    revisitDays: '30'
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [photos, setPhotos] = useState<string[]>([]); // New photos (base64)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // Old photos (url)

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const docRef = doc(db, 'matrices', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          let oldDiff = 30;
          if (data.revisitDate && data.createdAt) {
             const revDate = new Date(data.revisitDate);
             const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date();
             oldDiff = Math.ceil((revDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          setFormData({
            scientificName: data.scientificName || '',
            commonName: data.commonName || '',
            fruitingStage: data.fruitingStage || 'Sem frutos',
            notes: data.notes || '',
            revisitDays: oldDiff.toString()
          });
          setLocation({ lat: data.lat, lng: data.lng });
          
          // Support both older 'photoBase64s' and newer 'photos' array
          if (data.photos && data.photos.length > 0) {
            setExistingPhotos(data.photos);
          } else if (data.photoBase64s && data.photoBase64s.length > 0) {
            setExistingPhotos(data.photoBase64s);
          }
        } else {
          alert('Registro não encontrado.');
          navigate('/matrices');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [id, navigate]);

  const handleCaptureLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => alert('Erro: ' + error.message),
        { enableHighAccuracy: true }
      );
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const totalPhotos = photos.length + existingPhotos.length;
    if (file && totalPhotos < 3) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos([...photos, reader.result as string]);
      };
      reader.readAsDataURL(file);
    } else if (totalPhotos >= 3) {
      alert("Máximo de 3 fotos atingido.");
    }
  };

  const removeNewPhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));
  const removeExistingPhoto = (index: number) => setExistingPhotos(existingPhotos.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !id || !location) return;

    setLoadingSubmit(true);

    const revisitDate = new Date();
    revisitDate.setDate(revisitDate.getDate() + parseInt(formData.revisitDays));

    try {
      let finalPhotoUrls: string[] = [...existingPhotos];

      // Upload new photos if online
      if (photos.length > 0 && navigator.onLine) {
        for (let i = 0; i < photos.length; i++) {
          const filename = `matrices/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const storageRef = ref(storage, filename);
          const snapshot = await uploadString(storageRef, photos[i], 'data_url');
          const url = await getDownloadURL(snapshot.ref);
          finalPhotoUrls.push(url);
        }
      }

      await updateDoc(doc(db, 'matrices', id), {
        scientificName: formData.scientificName,
        commonName: formData.commonName,
        fruitingStage: formData.fruitingStage,
        lat: location.lat,
        lng: location.lng,
        notes: formData.notes,
        photos: finalPhotoUrls,
        revisitDate: revisitDate.toISOString(),
      });
      
      alert('Matriz atualizada com sucesso!');
      navigate('/matrices');
    } catch (error: any) {
      alert('Erro ao atualizar: ' + error.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingInitial) return <p style={{ padding: '2rem' }}>Carregando registro...</p>;

  return (
    <div className="card" style={{ marginBottom: '60px' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Editar Matriz</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Nome Popular*</label>
          <input 
            required 
            className="input" 
            value={formData.commonName}
            onChange={e => setFormData({...formData, commonName: e.target.value})}
          />
        </div>

        <div className="input-group">
          <label>Nome Científico</label>
          <input 
            className="input" 
            value={formData.scientificName}
            onChange={e => setFormData({...formData, scientificName: e.target.value})}
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
          <label>Renovar Revisita a partir de Hoje (Dias)*</label>
          <input 
            type="number" 
            required 
            className="input" 
            value={formData.revisitDays}
            onChange={e => setFormData({...formData, revisitDays: e.target.value})}
          />
        </div>

        <div className="input-group">
          <label>Localização (GPS) Atual</label>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Lat: {location?.lat.toFixed(6)}, Lng: {location?.lng.toFixed(6)}</span>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={handleCaptureLocation}>Atualizar GPS</button>
          </div>
        </div>

        <div className="input-group">
          <label>Fotos (Máx 3 no total)</label>
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} ref={fileInputRef} onChange={handlePhotoCapture} />
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '0.5rem' }}>
            
            {/* Existing */}
            {existingPhotos.map((p, idx) => (
              <div key={`ext-${idx}`} style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <img src={p} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--border-radius-sm)' }} />
                <button type="button" onClick={() => removeExistingPhoto(idx)} style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}>&times;</button>
              </div>
            ))}

            {/* New */}
            {photos.map((p, idx) => (
              <div key={`new-${idx}`} style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <img src={p} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--border-radius-sm)', border: '2px dashed var(--primary-color)' }} />
                <button type="button" onClick={() => removeNewPhoto(idx)} style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}>&times;</button>
              </div>
            ))}
          </div>

          {(photos.length + existingPhotos.length) < 3 && (
            <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Camera size={18} /> Adicionar Nova Foto
            </button>
          )}
        </div>

        <div className="input-group">
          <label>Observações</label>
          <textarea className="textarea" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => navigate('/matrices')} className="btn btn-secondary" disabled={loadingSubmit}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loadingSubmit}>
            {loadingSubmit ? 'Salvando...' : <><Save size={20} /> Atualizar</>}
          </button>
        </div>
      </form>
    </div>
  );
}
