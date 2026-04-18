import { useState, useEffect } from 'react';
import { getOfflineData, syncOfflineData, deleteOfflineRecord } from '../lib/offlineSync';
import { CloudOff, RefreshCw, Trash2, CheckCircle, Database } from 'lucide-react';

export function OfflineRecords() {
  const [matrices, setMatrices] = useState<any[]>([]);
  const [harvests, setHarvests] = useState<any[]>([]);
  const [processings, setProcessings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getOfflineData();
      setMatrices(data.matrices);
      setHarvests(data.harvests);
      setProcessings(data.processings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    const handleOnline = () => {
      // Auto reload data when online status changes just to update UI if needed
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine) {
      alert('Você ainda está offline. Conecte-se à internet para sincronizar.');
      return;
    }
    setSyncing(true);
    try {
      await syncOfflineData();
      await loadData();
      alert('Sincronização concluída com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Ocorreu um erro durante a sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (storeName: string, id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro local? Ele não foi enviado para a nuvem ainda.')) return;
    try {
      await deleteOfflineRecord(storeName, id);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir registro local.');
    }
  };

  const totalPending = matrices.length + harvests.length + processings.length;

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando registros...</div>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--warning-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={24} /> Fila de Sincronização
        </h2>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        {totalPending > 0 ? (
          <>
            <CloudOff size={48} color="var(--warning-color)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Você tem {totalPending} registros pendentes</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Estes dados foram salvos localmente e precisam de internet para serem enviados para a nuvem.
            </p>
            <button 
              onClick={handleSync} 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
              disabled={syncing || !navigator.onLine}
            >
              <RefreshCw size={20} className={syncing ? 'spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>
            {!navigator.onLine && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Conecte-se à internet para habilitar a sincronização.
              </p>
            )}
          </>
        ) : (
          <>
            <CheckCircle size={48} color="var(--success-color)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Tudo Atualizado</h3>
            <p className="text-muted">
              Não há dados locais pendentes de envio. Seu aplicativo está em dia com a nuvem!
            </p>
          </>
        )}
      </div>

      {matrices.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Matrizes Pendentes ({matrices.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {matrices.map(m => (
              <div key={m.localId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{m.commonName || m.scientificName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Cadastrada em: {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => handleDelete('offline-matrices', m.localId)} className="btn btn-danger" style={{ padding: '0.5rem' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {harvests.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Coletas Pendentes ({harvests.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {harvests.map(h => (
              <div key={h.localId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Data: {new Date(h.date).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                    Total: {h.totalKg.toFixed(1)} Kg
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Itens: {h.items.map((i:any) => i.commonName).join(', ')}
                  </div>
                </div>
                <button onClick={() => handleDelete('offline-harvests', h.localId)} className="btn btn-danger" style={{ padding: '0.5rem' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {processings.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Beneficiamentos Pendentes ({processings.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {processings.map(p => (
              <div key={p.localId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Lab em Coleta do Campo</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                    Processado: {p.benefitedTotalKg.toFixed(1)} Kg
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Salvo em: {new Date(p.processedAt || p.createdAt).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => handleDelete('offline-processings', p.localId)} className="btn btn-danger" style={{ padding: '0.5rem' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
