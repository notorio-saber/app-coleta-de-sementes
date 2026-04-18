import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldAlert, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export function AdminAccounts() {
  const { dbUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dbUser?.isAdmin) {
      fetchUsers();
    }
  }, [dbUser]);

  const handleToggleActive = async (uid: string, currentStatus: boolean) => {
    if (uid === '9Omk4UhYFZU2gob04pm1y6bRNmr2') {
       alert('Você não pode desativar o Administrador Mestre global.');
       return;
    }
    
    try {
      await updateDoc(doc(db, 'users', uid), {
        active: !currentStatus
      });
      setUsers(users.map(u => u.uid === uid ? { ...u, active: !currentStatus } : u));
    } catch (e) {
      console.error(e);
      alert('Falha ao atualizar status.');
    }
  };

  const handleToggleAdmin = async (uid: string, currentStatus: boolean, email: string) => {
    if (uid === '9Omk4UhYFZU2gob04pm1y6bRNmr2') {
       alert('O Administrador Mestre não pode ter seus privilégios removidos.');
       return;
    }
    if (!window.confirm(`Você tem certeza que quer ${currentStatus ? 'remover' : 'dar'} privilégios de Admin Mestre para ${email}?`)) return;
    
    try {
      await updateDoc(doc(db, 'users', uid), {
        isAdmin: !currentStatus
      });
      setUsers(users.map(u => u.uid === uid ? { ...u, isAdmin: !currentStatus } : u));
    } catch (e) {
      console.error(e);
      alert('Falha ao atualizar status de admin.');
    }
  };

  if (!dbUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={24} /> Controle Mestre de Contas
        </h2>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p className="text-muted" style={{ margin: 0 }}>
          Somente você tem acesso a esta tela. As contas abaixo acessaram o aplicativo através da conta Google pelo menos uma vez. Novos acessos ficarão bloqueados até que você clique para ativá-los abaixo.
        </p>
      </div>

      {loading ? (
        <p>Carregando lista de contas cadastradas...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {users.map(u => (
            <div key={u.uid} className="card animate-entry" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img 
                src={u.photoURL || '/logo.png'} 
                alt="Foto" 
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', opacity: u.active ? 1 : 0.5 }} 
              />
              
              <div style={{ flex: 1 }}>
                 <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: u.active ? 'var(--text-color)' : 'var(--text-muted)' }}>
                   {u.displayName || 'Sem Nome'} {u.isAdmin && <span style={{ color: 'var(--warning-color)' }} title="Administrador Mestre">⭐</span>}
                 </h3>
                 <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <button 
                   onClick={() => handleToggleActive(u.uid, u.active)} 
                   className={`btn ${u.active ? 'btn-danger' : 'btn-primary'}`}
                   style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                 >
                   {u.active ? <><UserX size={14} /> Bloquear</> : <><UserCheck size={14} /> Ativar</>}
                 </button>
                 
                 <button 
                   onClick={() => handleToggleAdmin(u.uid, u.isAdmin, u.email)} 
                   className="btn btn-secondary"
                   style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                 >
                   {u.isAdmin ? <><ShieldCheck size={14} color="var(--warning-color)" /> Remover Mestre</> : <><ShieldAlert size={14} /> Fazer Mestre</>}
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
