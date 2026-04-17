import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export function Settings() {
  const { signOut, user } = useAuth();
  const { activeTeam, userTeams, refreshTeams } = useTeam();
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeamName,
        ownerId: user.uid,
        members: [user.uid]
      });

      // User document needs creation/updating potentially, but we rely on teams.members for querying
      await refreshTeams();
      setNewTeamName('');
      alert('Equipe criada!');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar equipe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Ajustes e Equipe</h2>

      <div className="card">
        <h3>Sua Conta</h3>
        <p className="text-muted">{user?.email}</p>
        <button className="btn btn-secondary" onClick={signOut} style={{ marginTop: '1rem' }}>
          Sair da Conta
        </button>
      </div>

      <div className="card">
        <h3>Equipe Atual</h3>
        {activeTeam ? (
          <div>
            <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary-color)' }}>{activeTeam.name}</p>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Membros: {activeTeam.members?.length || 1}</p>
          </div>
        ) : (
          <p className="text-muted">Nenhuma equipe ativa.</p>
        )}
      </div>

      <div className="card">
        <h3>Criar Nova Equipe</h3>
        <form onSubmit={handleCreateTeam} style={{ marginTop: '1rem' }}>
          <div className="input-group">
            <input 
              required 
              className="input" 
              placeholder="Nome da Equipe" 
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Equipe'}
          </button>
        </form>
      </div>

      {userTeams.length > 1 && (
        <div className="card">
          <h3>Suas Equipes</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {userTeams.map(team => (
              <li key={team.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                {team.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
