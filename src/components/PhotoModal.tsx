import { useState } from 'react';
import { X, Download, Share2, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  matrixCode?: string;
  lat?: number;
  lng?: number;
  commonName?: string;
}

export function PhotoModal({ isOpen, onClose, photos, matrixCode, lat, lng, commonName }: PhotoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen || !photos || photos.length === 0) return null;

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);

  const handleDownload = async () => {
    const url = photos[currentIndex];
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Matriz_${matrixCode || 'Foto'}_${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erro ao baixar a imagem", error);
      // Fallback
      window.open(url, '_blank');
    }
  };

  const handleShare = async () => {
    const url = photos[currentIndex];
    const text = `Confira a matriz ${commonName || ''} (${matrixCode || ''}).\nLocalização: https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    try {
      // Fetch the image as a blob
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `matriz_${matrixCode}.jpg`, { type: blob.type });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Matriz ${matrixCode || ''}`,
          text: text,
          files: [file]
        });
      } else {
        // Fallback to WhatsApp URL
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
      }
    } catch (error) {
      console.error("Erro ao compartilhar", error);
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', alignItems: 'center' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>
          {commonName || 'Matriz'} {matrixCode ? `- ${matrixCode}` : ''}
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem' }}>
          <X size={28} />
        </button>
      </div>

      {/* Image View */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {photos.length > 1 && (
          <button onClick={handlePrev} style={{ position: 'absolute', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', zIndex: 10 }}>
            <ChevronLeft size={32} />
          </button>
        )}
        
        <img 
          src={photos[currentIndex]} 
          alt="Matriz ampliata" 
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />

        {photos.length > 1 && (
          <button onClick={handleNext} style={{ position: 'absolute', right: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', zIndex: 10 }}>
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      {/* Footer / Actions */}
      <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <button 
          onClick={handleDownload}
          className="btn btn-secondary" 
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: '200px' }}
        >
          <Download size={20} /> Baixar
        </button>
        
        <button 
          onClick={handleShare}
          className="btn btn-primary" 
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: '200px' }}
        >
          <Share2 size={20} /> Compartilhar
        </button>
      </div>
    </div>
  );
}
