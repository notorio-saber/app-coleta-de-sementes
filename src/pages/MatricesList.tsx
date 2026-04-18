import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { doc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, Image as ImageIcon, MapPin, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MatricesList() {
  const { activeTeam } = useTeam();
  const { user } = useAuth();
  const [matrices, setMatrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
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

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza absoluta que deseja APAGAR o registro da árvore "${name}"? Essa ação não pode ser desfeita.`)) {
      try {
        await deleteDoc(doc(db, 'matrices', id));
        setMatrices(prev => prev.filter(m => m.id !== id));
      } catch (err) {
        console.error("Erro ao deletar:", err);
        alert("Falha ao deletar a matriz. Verifique sua conexão.");
      }
    }
  };

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
        <div style={{ marginBottom: '1rem' }}>
           <input 
             type="text" 
             className="input" 
             style={{ width: '100%' }} 
             placeholder="Pesquisar por nome comum ou científico..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
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

             let diffDays = 0;
             let progressProgress = 0;
             let statusColor = 'var(--success-color)';
             
             if (matrix.revisitDate) {
               const revDate = new Date(matrix.revisitDate);
               const today = new Date();
               diffDays = Math.ceil((revDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
               progressProgress = Math.min(100, Math.max(0, 100 - (diffDays / 60) * 100));
               
               if (diffDays <= 0) {
                 statusColor = 'var(--danger-color)';
                 progressProgress = 100;
               } else if (diffDays <= 7) {
                 statusColor = 'var(--warning-color)';
               }
             }

             return (
               <div key={matrix.id} className="card" style={{ padding: '1rem' }}>
                 <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    {/* Thumbnail */}
                    <div style={{ width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--border-color)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {firstPhoto ? (
                        <img src={firstPhoto} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={24} color="#888" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.commonName}</h3>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--primary-color)' }}>{matrix.scientificName}</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>{matrix.fruitingStage}</span>
                        {matrix.creatorEmail && <span className="text-muted" style={{ fontSize: '0.75rem' }}>{matrix.creatorEmail.split('@')[0]}</span>}
                      </div>
                    </div>
                 </div>

                 {/* Barra de Progresso do Registro Pessoal */}
                 {matrix.revisitDate && (
                    <div style={{ marginTop: '0.75rem', backgroundColor: 'var(--bg-color)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        <span className="text-muted">Prazo de Visita</span>
                        <span style={{ color: statusColor }}>{diffDays <= 0 ? 'Atrasado' : `Faltam ${diffDays} dias`}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progressProgress}%`, backgroundColor: statusColor, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                 )}

                 {/* Botões de Ação Universais */}
                 <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                   <button 
                     onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`, '_blank')} 
                     className="btn btn-primary" 
                     style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                   >
                     <MapPin size={16} /> Obter Rota
                   </button>
                   <button 
                     onClick={() => navigate(`/edit/${matrix.id}`)}
                     className="btn btn-secondary" 
                     style={{ width: 'auto', padding: '0.6rem', fontSize: '0.85rem' }}
                   >
                     <Edit size={16} />
                   </button>
                   <button 
                     onClick={() => handleDelete(matrix.id, matrix.commonName)}
                     className="btn btn-secondary" 
                     style={{ width: 'auto', padding: '0.6rem', fontSize: '0.85rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
             )
           })}
        </div>
      )}
    </div>
  );
}
