import { useEffect, useState } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { doc, collection, query, where, getDocs, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Download, Image as ImageIcon, MapPin, Edit, Trash2, CalendarCheck, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MatricesList() {
  const { activeTeam, userRole } = useTeam();
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

  const handleRegisterVisit = async (matrixId: string, name: string) => {
    const daysStr = window.prompt(`Registrar visita na matriz "${name}"\nDaqui a quantos dias será a próxima visita?`, "365");
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) {
      alert("Número de dias inválido.");
      return;
    }
    
    try {
      const today = new Date().toISOString();
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      const nextDateIso = nextDate.toISOString();

      await updateDoc(doc(db, 'matrices', matrixId), {
        revisitDate: nextDateIso,
        visitHistory: arrayUnion(today)
      });
      
      setMatrices(prev => prev.map(m => {
        if (m.id === matrixId) {
          return {
            ...m, 
            revisitDate: nextDateIso,
            visitHistory: [...(m.visitHistory || []), today]
          };
        }
        return m;
      }));
      alert("Visita registrada! A data da próxima revisão foi atualizada.");
    } catch (e) {
      console.error(e);
      alert("Erro ao registrar visita.");
    }
  };

  const handleExportCSV = () => {
    if (matrices.length === 0) return;

    const headers = ['Registro', 'Nome Comum', 'Nome Científico', 'Latitude', 'Longitude', 'Estádio Frutificação', 'Criado Por'];
    const csvContent = [
      headers.join(','),
      ...matrices.map(m => [
        `"${m.matrixCode || 'N/D'}"`,
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
           {filteredData.map((matrix, index) => {
             const firstPhoto = (matrix.photos && matrix.photos.length > 0) ? matrix.photos[0] : 
                                (matrix.photoBase64s && matrix.photoBase64s.length > 0) ? matrix.photoBase64s[0] : null;

             const creationDate = matrix.createdAt?.seconds ? new Date(matrix.createdAt.seconds * 1000).toLocaleDateString() : 'N/D';
             const creatorDisplay = matrix.creatorEmail ? matrix.creatorEmail.split('@')[0] : 'Time';
             
             let diffDays = 0;
             let progressProgress = 0;
             let statusColor = 'var(--success-color)';
             let isUrgent = false;
             
             if (matrix.revisitDate) {
               const revDate = new Date(matrix.revisitDate);
               const today = new Date();
               diffDays = Math.ceil((revDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
                 <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Thumbnail */}
                    <div style={{ width: '55px', height: '55px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--surface-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {firstPhoto ? (
                        <img src={firstPhoto} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageIcon size={20} color="var(--text-muted)" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <h3 style={{ fontSize: '1rem', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.commonName}</h3>
                         {matrix.matrixCode && <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{matrix.matrixCode}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ margin: '0', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{matrix.scientificName}</p>
                        <span style={{ fontSize: '0.7rem', color: statusColor, fontWeight: 500, padding: '2px 6px', background: `${statusColor}15`, borderRadius: '4px' }}>{matrix.fruitingStage}</span>
                      </div>
                    </div>
                 </div>

                  {/* Informação sobre Criação */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.50rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.50rem' }}>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Cadastrado em: {creationDate}</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Por: {creatorDisplay}</span>
                  </div>

                 {/* Observações */}
                 {matrix.notes && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px' }}>
                      <strong style={{ color: 'var(--text-dim)' }}>Obs:</strong> {matrix.notes}
                    </div>
                 )}

                 {/* Histórico de Visitas */}
                 {matrix.visitHistory && matrix.visitHistory.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}><History size={12} /> Visitas Anteriores ({matrix.visitHistory.length}):</strong>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {matrix.visitHistory.map((vDate: string, idx: number) => (
                           <span key={idx} style={{ padding: '2px 6px', backgroundColor: 'var(--surface-color)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                             {new Date(vDate).toLocaleDateString()}
                           </span>
                        ))}
                      </div>
                    </div>
                 )}

                 {/* Barra de Progresso do Registro Pessoal */}
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

                 {/* Botões de Ação Universais */}
                 <div style={{ display: 'flex', gap: '0.5rem', marginTop: matrix.revisitDate ? '0' : '0.75rem' }}>
                   <button 
                     onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${matrix.lat},${matrix.lng}`, '_blank')} 
                     className="btn btn-primary" 
                     style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                     title="Navegar no GPS"
                   >
                     <MapPin size={14} /> Obter Rota
                   </button>
                   <button 
                     onClick={() => handleRegisterVisit(matrix.id, matrix.commonName)} 
                     className="btn btn-secondary" 
                     style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
                     title="Registrar nova visita efetuada"
                   >
                     <CalendarCheck size={14} /> Visita
                   </button>
                   {userRole !== 'beneficiador' && (
                     <>
                       <button onClick={() => navigate(`/edit/${matrix.id}`)} className="btn btn-secondary" style={{ width: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Edit size={16} />
                       </button>
                       <button onClick={() => handleDelete(matrix.id, matrix.commonName)} className="btn btn-danger" style={{ width: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Trash2 size={16} />
                       </button>
                     </>
                   )}
                 </div>
               </div>
             )
           })}
        </div>
      )}
    </div>
  );
}
