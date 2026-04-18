import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Download, Image as ImageIcon } from 'lucide-react';

export function MatricesList() {
  const { activeTeam } = useTeam();
  const { user } = useAuth();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<'team'|'mine'>('team');

  useEffect(() => {
    async function fetchAll() {
      if (!activeTeam) return;
      try {
        setLoading(true);
        const q = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        // Sort by newest first
        data.sort((a,b) => {
           const timeA = a.createdAt?.seconds || 0;
           const timeB = b.createdAt?.seconds || 0;
           return timeB - timeA;
        });
        setMatrices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [activeTeam]);

  const handleExportCSV = () => {
    if (matrices.length === 0) return;

    const headers = ['Nome Comum', 'Nome Científico', 'Latitude', 'Longitude', 'Estádio Frutificação', 'Criado Por'];
    const csvContent = [
      headers.join(','),
      ...matrices.map(m => [
        `"${m.commonName || ''}"`,
        `"${m.scientificName || ''}"`,
        m.lat,
        m.lng,
        `"${m.fruitingStage || ''}"`,
        `"${m.creatorEmail || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `acervo_${activeTeam?.name || 'equipe'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = matrices.filter(m => {
    // 1. Scope filter
    if (filterScope === 'mine' && m.creatorId !== user?.uid) return false;
    
    // 2. Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchCommon = m.commonName?.toLowerCase().includes(term);
      const matchScientific = m.scientificName?.toLowerCase().includes(term);
      if (!matchCommon && !matchScientific) return false;
    }

    return true;
  });

  if (loading) return <p style={{ padding: '2rem' }}>Carregando acervo...</p>;

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Matrizes (Acervo)</h2>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
           <input 
             type="text" 
             className="input" 
             style={{ flex: 1 }} 
             placeholder="Pesquisar por nome..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
           <button className="btn btn-secondary" style={{ padding: '0.5rem' }}>
             <Search size={20} />
           </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            className={`btn ${filterScope === 'team' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1, padding: '0.5rem' }} 
            onClick={() => setFilterScope('team')}
          >
            Da Equipe
          </button>
          <button 
            className={`btn ${filterScope === 'mine' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1, padding: '0.5rem' }} 
            onClick={() => setFilterScope('mine')}
          >
            Meus Registros
          </button>
        </div>

        <button onClick={handleExportCSV} className="btn btn-secondary" style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <Download size={18} /> Exportar Relatório (CSV)
        </button>
      </div>

      <p className="text-muted" style={{ marginBottom: '1rem' }}>Mostrando {filteredData.length} registros</p>

      {filteredData.length === 0 ? (
        <p className="text-muted">Nenhuma matriz encontrada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           {filteredData.map(matrix => {
             // photos or photoBase64s
             const firstPhoto = (matrix.photos && matrix.photos.length > 0) ? matrix.photos[0] : 
                                (matrix.photoBase64s && matrix.photoBase64s.length > 0) ? matrix.photoBase64s[0] : null;

             return (
               <div key={matrix.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem' }}>
                  {/* Thumbnail */}
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--border-color)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {firstPhoto ? (
                      <img src={firstPhoto} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={24} color="#888" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 0.15rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.commonName}</h3>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--primary-color)' }}>{matrix.scientificName}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{matrix.fruitingStage}</span>
                      {matrix.creatorEmail && <span className="text-muted" style={{ fontSize: '0.7rem' }}>{matrix.creatorEmail.split('@')[0]}</span>}
                    </div>
                  </div>
               </div>
             )
           })}
        </div>
      )}
    </div>
  );
}
