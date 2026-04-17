import { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FileDown, Plus } from 'lucide-react';

export function Reports() {
  const { activeTeam } = useTeam();
  const [collections, setCollections] = useState<any[]>([]);
  const [matrices, setMatrices] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    matrixId: '',
    weight: ''
  });

  useEffect(() => {
    async function fetchData() {
      if (!activeTeam) return;
      
      // Fetch matrices for the dropdown
      const qM = query(collection(db, 'matrices'), where('teamId', '==', activeTeam.id));
      const snapM = await getDocs(qM);
      setMatrices(snapM.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // Fetch collections
      const qC = query(collection(db, 'collections'), where('teamId', '==', activeTeam.id));
      const snapC = await getDocs(qC);
      const cols = snapC.docs.map(d => ({ id: d.id, ...d.data() }));
      cols.sort((a: any, b: any) => b.date - a.date); // Sort desc
      setCollections(cols);
    }
    fetchData();
  }, [activeTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.matrixId || !formData.weight) return;
    try {
      setLoading(true);
      const matrix = matrices.find(m => m.id === formData.matrixId);
      
      const payload = {
        teamId: activeTeam?.id,
        matrixId: formData.matrixId,
        matrixName: matrix?.commonName,
        weight: parseFloat(formData.weight),
        date: Date.now(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'collections'), payload);
      setCollections([payload, ...collections]);
      setShowForm(false);
      setFormData({ matrixId: '', weight: '' });
      alert('Coleta registrada!');
    } catch (e) {
      console.error(e);
      alert('Erro ao registrar.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const header = 'Data,Matriz,Peso(kg)\n';
    const rows = collections.map(c => {
      const date = new Date(c.date).toLocaleDateString();
      return `"${date}","${c.matrixName}","${c.weight}"`;
    }).join('\n');
    
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_coletas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ marginBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Relatórios</h2>
        <button onClick={downloadCSV} className="btn" style={{ padding: '0.5rem', width: 'auto', backgroundColor: 'var(--bg-color)' }}>
          <FileDown size={20} color="var(--primary-color)" />
        </button>
      </div>

      {!showForm && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          <Plus size={18} /> Registrar Coleta
        </button>
      )}

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Nova Coleta</h3>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Selecione a Matriz</label>
              <select 
                className="select" 
                value={formData.matrixId}
                onChange={e => setFormData({...formData, matrixId: e.target.value})}
                required
              >
                <option value="">-- Selecione --</option>
                {matrices.map(m => <option key={m.id} value={m.id}>{m.commonName} - {m.scientificName}</option>)}
              </select>
            </div>
            
            <div className="input-group">
              <label>Peso coletado (kg)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input" 
                required 
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {collections.length === 0 ? (
          <p className="text-muted">Nenhuma coleta registrada.</p>
        ) : (
          collections.map((col, idx) => (
            <div key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', marginBottom: '0.5rem' }}>
              <div>
                <strong>{col.matrixName}</strong>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                  {new Date(col.date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                {col.weight} kg
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
