import { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Save, Trash2, TrendingUp, Edit, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { saveHarvestOffline, updateHarvestOffline, deleteOfflineRecord } from '../lib/offlineSync';
import { Send } from 'lucide-react';

interface MatrixOption {
  id: string;
  commonName: string;
}

interface HarvestItem {
  matrixId: string;
  commonName: string;
  weightKg: string;
}

export function Collections() {
  const { activeTeam } = useTeam();
  const { user } = useAuth();
  
  const [matrices, setMatrices] = useState<MatrixOption[]>([]);
  const [harvests, setHarvests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<HarvestItem[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!activeTeam) return;
      try {
        setLoading(true);
        // Load Matrices for options
        const qM = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
        const snapM = await getDocs(qM);
        const mData = snapM.docs.map(d => ({ id: d.id, commonName: d.data().commonName || 'Sem nome' }));
        setMatrices(mData);
        
        // Load Harvests
        const qH = query(collection(db, 'harvests'), where('teamId', '==', activeTeam.id));
        const snapH = await getDocs(qH);
        const hData = snapH.docs.map(d => ({ id: d.id, ...d.data() as any }));
        // Sort by newest
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

  const handleAddItem = () => {
    if (matrices.length === 0) return;
    setItems([...items, { matrixId: matrices[0].id, commonName: matrices[0].commonName, weightKg: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof HarvestItem, value: string) => {
    const newItems = [...items];
    if (field === 'matrixId') {
      const selected = matrices.find(m => m.id === value);
      newItems[index].matrixId = value;
      newItems[index].commonName = selected?.commonName || '';
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !user || items.length === 0) return;
    if (items.some(i => !i.weightKg || parseFloat(i.weightKg) <= 0)) {
      alert('Verifique se todos os itens têm um peso maior que zero.');
      return;
    }

    setSubmitLoading(true);
    let totalKg = 0;
    const finalItems = items.map(i => {
      const kg = parseFloat(i.weightKg);
      totalKg += kg;
      return { ...i, weightKg: kg };
    });

    try {
      const payload = {
        date,
        totalKg,
        items: finalItems
      };
      
      if (!navigator.onLine) {
         // Save Offline
         if (editingId && editingId.startsWith('offline-')) {
            const localId = parseInt(editingId.replace('offline-', ''));
            await updateHarvestOffline(localId, payload);
            alert('Coleta offline atualizada com sucesso!');
            setHarvests(harvests.map(h => h.id === editingId ? { ...h, ...payload } : h));
         } else {
            const newDoc = {
              ...payload,
              teamId: activeTeam.id,
              operatorId: user.uid,
              operatorEmail: user.email,
              deliveryStatus: 'aguardando_entrega',
              _isOffline: true
            };
            const localId = await saveHarvestOffline(newDoc);
            setHarvests([{ id: `offline-${localId}`, ...newDoc, localId }, ...harvests]);
            alert('Você está offline. Coleta salva no dispositivo e será sincronizada assim que a conexão for restaurada!');
         }
      } else {
        if (editingId) {
          await updateDoc(doc(db, 'harvests', editingId), payload);
          alert('Coleta atualizada com sucesso!');
          setHarvests(harvests.map(h => h.id === editingId ? { ...h, ...payload } : h));
        } else {
          const newDoc = {
            ...payload,
            teamId: activeTeam.id,
            operatorId: user.uid,
            operatorEmail: user.email,
            deliveryStatus: 'aguardando_entrega',
            timestamp: serverTimestamp()
          };
          const docRef = await addDoc(collection(db, 'harvests'), newDoc);
          setHarvests([{ id: docRef.id, ...newDoc }, ...harvests]);
          alert('Coleta registrada com sucesso!');
        }
      }

      setIsFormOpen(false);
      setEditingId(null);
      setItems([]);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar comanda.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (h: any) => {
    setIsFormOpen(true);
    setEditingId(h.id);
    setDate(h.date);
    setItems(h.items.map((i: any) => ({ ...i, weightKg: String(i.weightKg) })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, isOffline: boolean = false) => {
    if (!window.confirm("Essa exclusão é permanente. Tem certeza que deseja apagar os registros desta coleta?")) return;
    try {
      if (isOffline) {
        const localId = parseInt(id.replace('offline-', ''));
        await deleteOfflineRecord('offline-harvests', localId);
      } else {
        await deleteDoc(doc(db, 'harvests', id));
      }
      setHarvests(harvests.filter(h => h.id !== id));
    } catch (e) {
      console.error(e);
      alert('Erro ao apagar.');
    }
  };

  const handleDeliver = async (id: string, isOffline: boolean = false) => {
    if (!window.confirm("Confirmar o envio desta carga para o laboratório?")) return;
    try {
      if (isOffline) {
         const localId = parseInt(id.replace('offline-', ''));
         await updateHarvestOffline(localId, { deliveryStatus: 'entregue' });
      } else {
         await updateDoc(doc(db, 'harvests', id), { deliveryStatus: 'entregue' });
      }
      setHarvests(harvests.map(h => h.id === id ? { ...h, deliveryStatus: 'entregue' } : h));
      alert('Entrega confirmada! O laboratório já pode visualizar a comanda.');
    } catch(e) {
       console.error(e);
       alert('Erro ao confirmar entrega.');
    }
  };

  const handleExportCSV = () => {
    if (harvests.length === 0) return;

    const headers = ['Data', 'Peso Bruto Campo (Kg)', 'Peso Beneficiado (Kg)', 'Operador Rota', 'Laboratório', 'Itens da Coleta'];
    const csvContent = [
      headers.join(','),
      ...harvests.map(h => {
        const itemsStr = h.items.map((i:any) => `${i.commonName} (${i.weightKg}kg)`).join(' | ');
        return [
          `"${new Date(h.date).toLocaleDateString()}"`,
          h.totalKg.toFixed(2),
          h.benefitedTotalKg !== undefined ? h.benefitedTotalKg.toFixed(2) : '',
          `"${h.operatorEmail || ''}"`,
          `"${h.processedBy || ''}"`,
          `"${itemsStr}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `coletas_${activeTeam?.name || 'equipe'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Chart
  const chartData = [...harvests].reverse().reduce((acc: any[], curr) => {
    const existing = acc.find(x => x.date === curr.date);
    if (existing) {
      existing.bruto += curr.totalKg;
      existing.liquido += (curr.benefitedTotalKg || 0);
    } else {
      acc.push({ date: curr.date, bruto: curr.totalKg, liquido: curr.benefitedTotalKg || 0 });
    }
    return acc;
  }, []);

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Desempenho & Coletas</h2>
      </div>

      {!isFormOpen ? (
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }} onClick={() => { setIsFormOpen(true); setEditingId(null); setDate(new Date().toISOString().split('T')[0]); setItems([]); }}>
          <Plus size={18} /> Lançar nova coleta
        </button>
      ) : (
        <div className="card electric-card animate-entry" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary-light)' }}>
            {editingId ? 'Editando Coleta' : 'Nova Coleta do Dia'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Data</label>
              <input type="date" required className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Espécies Coletadas (Kg)</label>
              
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <select 
                    className="select" 
                    style={{ flex: 2 }}
                    value={item.matrixId} 
                    onChange={e => handleUpdateItem(idx, 'matrixId', e.target.value)}
                  >
                    {matrices.map(m => (
                      <option key={m.id} value={m.id}>{m.commonName}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    placeholder="Qtd (Kg)" 
                    className="input" 
                    style={{ flex: 1 }}
                    value={item.weightKg}
                    onChange={e => handleUpdateItem(idx, 'weightKg', e.target.value)}
                  />
                  <button type="button" className="btn btn-danger" style={{ padding: '0.75rem' }} onClick={() => handleRemoveItem(idx)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem', borderStyle: 'dashed' }} onClick={handleAddItem}>
                <Plus size={16} /> Adicionar Espécie na Comanda
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsFormOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitLoading || items.length === 0}>
                {submitLoading ? 'Salvando...' : <><Save size={18} /> Salvar Comanda</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gráfico de Desempenho */}
      {harvests.length > 0 && (
        <div className="card animate-entry delay-50" style={{ padding: '1.5rem 1rem' }}>
           <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <TrendingUp size={20} color="var(--primary-color)" /> Produtividade Diária (Kg)
           </h3>
           <div style={{ width: '100%', height: '200px' }}>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBruto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-muted)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--text-muted)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLiquido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                  <YAxis tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                  <Area type="monotone" name="Bruto (Campo)" dataKey="bruto" stroke="var(--text-muted)" fillOpacity={1} fill="url(#colorBruto)" />
                  <Area type="monotone" name="Líquido (Lab)" dataKey="liquido" stroke="var(--primary-color)" fillOpacity={1} fill="url(#colorLiquido)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* Histórico das Comandas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Histórico da Equipe</h3>
        {harvests.length > 0 && (
          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            <Download size={14} /> Relatório CSV
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-muted">Carregando coletas...</p>
      ) : harvests.length === 0 ? (
        <p className="text-muted">Nenhuma coleta registrada ainda. Lance a primeira comanda!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {harvests.map((h, i) => (
             <div key={h.id || i} className="card animate-entry" style={{ animationDelay: `${i * 50}ms` }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <span style={{ fontWeight: 'bold' }}>{new Date(h.date).toLocaleDateString()}</span>
                     {h._isOffline && <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--warning-color)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Offline</span>}
                   </div>
                   <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                     <button onClick={() => handleEdit(h)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}><Edit size={14} /></button>
                     <button onClick={() => handleDelete(h.id, h._isOffline)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 0 }}><Trash2 size={14} /></button>
                   </div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   {(!h.deliveryStatus || h.deliveryStatus === 'aguardando_entrega') ? (
                      <button onClick={() => handleDeliver(h.id, h._isOffline)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Send size={12} /> Confirmar Envio
                      </button>
                   ) : (
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--success-color)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Carga Entregue</span>
                   )}
                   <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '4px' }}>Bruto (Campo): {h.totalKg.toFixed(1)} Kg</div>
                   <div style={{ color: 'var(--primary-light)', fontWeight: 'bold' }}>
                     Processado: {h.benefitedTotalKg !== undefined ? h.benefitedTotalKg.toFixed(1) : '0.0'} Kg
                   </div>
                 </div>
               </div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                 Operador Rota: {h.operatorEmail.split('@')[0]}
                 {h.processedBy && <><br/>Laboratório: {h.processedBy.split('@')[0]}</>}
               </div>
               <div style={{ marginTop: '0.5rem' }}>
                 {h.items.map((item: any, idx: number) => {
                   const benefitedObj = h.benefitedItems?.find((x:any) => x.matrixId === item.matrixId);
                   return (
                     <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '2px 0' }}>
                       <span>• {item.commonName}</span>
                       <span>{item.weightKg.toFixed(1)} kg {benefitedObj && <span style={{ color: 'var(--primary-light)' }}>$\rightarrow$ {benefitedObj.weightKg.toFixed(1)} kg</span>}</span>
                     </div>
                   );
                 })}
               </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
