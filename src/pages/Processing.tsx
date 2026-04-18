import { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, ChevronRight, Save } from 'lucide-react';

export function Processing() {
  const { activeTeam } = useTeam();
  const { user } = useAuth();
  const [harvests, setHarvests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [openHarvestId, setOpenHarvestId] = useState<string | null>(null);
  const [processData, setProcessData] = useState<Record<string, string>>({}); // matrixId -> benefited Weight String
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!activeTeam) return;
      try {
        setLoading(true);
        const q = query(collection(db, 'harvests'), where('teamId', '==', activeTeam.id));
        const snap = await getDocs(q);
        
        const hData = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        // Filtrar pendentes (aquelas que o benefitedTotalKg é undefined ou ausente) ou ordenar recentes
        hData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHarvests(hData);
        
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTeam]);

  const handleOpenProcess = (h: any) => {
    if (openHarvestId === h.id) {
      setOpenHarvestId(null);
      setProcessData({});
    } else {
       setOpenHarvestId(h.id);
       const initial: Record<string, string> = {};
       h.items.forEach((i: any) => {
         // preenche o que já foi beneficiado, se houver
         const oldBenefited = h.benefitedItems?.find((bi: any) => bi.matrixId === i.matrixId)?.weightKg;
         initial[i.matrixId] = oldBenefited ? String(oldBenefited) : '';
       });
       setProcessData(initial);
    }
  };

  const handleSaveProcess = async (h: any) => {
    if (!activeTeam || !user) return;
    
    setSubmitLoading(true);
    let totalBenefited = 0;
    const items = h.items.map((i: any) => {
       const strB = processData[i.matrixId] || '0';
       const valB = parseFloat(strB) || 0;
       totalBenefited += valB;
       return {
         matrixId: i.matrixId,
         commonName: i.commonName,
         weightKg: valB
       };
    });

    try {
      await updateDoc(doc(db, 'harvests', h.id), {
        benefitedTotalKg: totalBenefited,
        benefitedItems: items,
        processedBy: user.email,
        processedAt: new Date().toISOString()
      });
      
      // Update local state
      setHarvests(harvests.map(hItem => {
        if (hItem.id === h.id) {
          return { ...hItem, benefitedTotalKg: totalBenefited, benefitedItems: items, processedBy: user.email };
        }
        return hItem;
      }));
      setOpenHarvestId(null);
      alert('Beneficiamento registrado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar processamento.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Laboratório</h2>
      </div>

      <p className="text-muted" style={{ marginBottom: '1rem' }}>Comandas aguardando beneficiamento</p>

      {loading ? (
        <p>Carregando comandas...</p>
      ) : harvests.length === 0 ? (
        <p className="text-muted">Nenhuma comanda de campo encontrada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {harvests.map(h => {
             const isProcessed = h.benefitedTotalKg !== undefined;
             const isOpen = openHarvestId === h.id;

             return (
               <div key={h.id} className="card animate-entry" style={{ padding: '1rem', borderTop: isProcessed ? 'none' : '4px solid var(--warning-color)' }}>
                 <div onClick={() => handleOpenProcess(h)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                   <div>
                     <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       Comanda de Campo 
                       {isProcessed ? <CheckCircle2 size={16} color="var(--success-color)" /> : <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--warning-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Pendente</span>}
                     </h3>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                       {new Date(h.date).toLocaleDateString()} • Por: {h.operatorEmail.split('@')[0]}
                     </p>
                     <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-light)' }}>
                       Total Bruto: {h.totalKg.toFixed(1)} kg
                     </p>
                   </div>
                   <ChevronRight size={20} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
                 </div>

                 {isOpen && (
                   <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                     <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>Insira o **Peso Beneficiado (Semente Pura)** para cada espécie identificada nesta comanda:</p>
                     
                     {h.items.map((item: any) => (
                       <div key={item.matrixId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-color)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '0.5rem' }}>
                         <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                           <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>{item.commonName}</p>
                           <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bruto: {item.weightKg} kg</p>
                         </div>
                         <div style={{ width: '120px' }}>
                           <input 
                              type="number" 
                              step="0.1" 
                              className="input" 
                              placeholder="KGs Puros" 
                              value={processData[item.matrixId] || ''}
                              onChange={e => setProcessData({...processData, [item.matrixId]: e.target.value})}
                              style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                           />
                         </div>
                       </div>
                     ))}

                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                       {isProcessed && (
                         <span style={{ fontSize: '0.85rem', color: 'var(--success-color)' }}>
                           Beneficiado: {h.benefitedTotalKg.toFixed(1)} kg
                         </span>
                       )}
                       <button onClick={() => handleSaveProcess(h)} className="btn btn-primary" disabled={submitLoading} style={{ marginLeft: 'auto', padding: '0.5rem 1rem' }}>
                         {submitLoading ? '...' : <><Save size={16} /> Salvar Laboratório</>}
                       </button>
                     </div>
                   </div>
                 )}
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}
