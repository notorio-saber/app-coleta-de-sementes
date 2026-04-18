import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';

export function Settings() {
  const { signOut, user } = useAuth();
  const { activeTeam, userTeams, refreshTeams } = useTeam();
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [goalLoading, setGoalLoading] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'coletor' | 'beneficiador'>('coletor');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeamName,
        ownerId: user.uid,
        members: [user.uid],
        invitedEmails: [],
        roles: {}
      });

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

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam) return;

    setLoadingInvite(true);
    try {
      const teamRef = doc(db, 'teams', activeTeam.id);
      const emailKey = inviteEmail.trim().toLowerCase();
      await updateDoc(teamRef, {
        invitedEmails: arrayUnion(emailKey),
        [`roles.${emailKey}`]: inviteRole
      });
      alert(`Convite enviado para ${inviteEmail}!`);
      setInviteEmail('');
      await refreshTeams();
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar membro.');
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleRemoveMember = async (emailToRemove: string) => {
    if (!activeTeam) return;
    if (!window.confirm(`Tem certeza que deseja remover ${emailToRemove} da equipe?`)) return;

    try {
      const teamRef = doc(db, 'teams', activeTeam.id);
      await updateDoc(teamRef, {
        invitedEmails: arrayRemove(emailToRemove),
        [`roles.${emailToRemove}`]: deleteField()
      });
      alert('Membro removido com sucesso!');
      await refreshTeams();
    } catch (err) {
      console.error(err);
      alert('Erro ao remover membro.');
    }
  };

  const handleUpdateUserRole = async (email: string, newRole: string) => {
    if (!activeTeam) return;
    try {
      const teamRef = doc(db, 'teams', activeTeam.id);
      await updateDoc(teamRef, {
        [`roles.${email}`]: newRole
      });
      await refreshTeams();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar cargo.');
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !monthlyGoal) return;
    setGoalLoading(true);
    try {
      await updateDoc(doc(db, 'teams', activeTeam.id), {
        monthlyGoalKg: parseFloat(monthlyGoal)
      });
      alert('Meta atualizada com sucesso!');
      await refreshTeams();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar meta.');
    } finally {
      setGoalLoading(false);
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
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Membros Reais/Logs: {activeTeam.members?.length || 1}</p>
            {(() => {
              const allEmails = Array.from(new Set([
                ...(activeTeam.invitedEmails || []),
                ...Object.keys(activeTeam.roles || {})
              ]));
              
              if (allEmails.length === 0) return null;
              
              return (
                <div style={{ marginTop: '0.5rem' }}>
                   <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Lista de E-mails na Nuvem (Ativos/Convites):</p>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                     {allEmails.map(email => (
                     <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)', padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)' }}>
                       <div style={{ flex: 1 }}>
                         <div style={{ fontSize: '0.85rem' }}>{email}</div>
                         {activeTeam.ownerId === user?.uid && activeTeam.ownerId !== email ? (
                           <select 
                             className="input" 
                             style={{ padding: '0.25rem', fontSize: '0.75rem', marginTop: '0.25rem', width: 'auto', display: 'inline-block' }}
                             value={activeTeam.roles?.[email] || 'coletor'}
                             onChange={(e) => handleUpdateUserRole(email, e.target.value)}
                           >
                             <option value="coletor">Coletor</option>
                             <option value="beneficiador">Beneficiador</option>
                             <option value="admin">Admin</option>
                           </select>
                         ) : (
                           <div style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'uppercase' }}>{activeTeam.roles?.[email] || 'coletor'}</div>
                         )}
                       </div>
                       {activeTeam.ownerId === user?.uid && activeTeam.ownerId !== email && (
                         <button onClick={() => handleRemoveMember(email)} className="btn btn-danger" style={{ padding: '0.4rem', marginLeft: '0.5rem' }}>
                           <Trash2 size={14} />
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
              );
            })()}

            {activeTeam.ownerId === user?.uid && (
              <>
                <form onSubmit={handleInviteMember} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Convidar Membro (E-mail do Google)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input 
                      type="email"
                      required
                      className="input"
                      style={{ flex: 1 }}
                      placeholder="email@gmail.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                    <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}>
                      <option value="coletor">Coletor de Campo</option>
                      <option value="beneficiador">Laboratório (Beneficiamento)</option>
                    </select>
                    <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }} disabled={loadingInvite}>
                      {loadingInvite ? '...' : 'Adicionar'}
                    </button>
                  </div>
                </form>

                <form onSubmit={handleUpdateGoal} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Definir Meta Mensal (Kg)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input 
                      type="number"
                      step="0.1"
                      required
                      className="input"
                      style={{ flex: 1 }}
                      placeholder={`Atual: ${activeTeam.monthlyGoalKg || 0} kg`}
                      value={monthlyGoal}
                      onChange={e => setMonthlyGoal(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }} disabled={goalLoading}>
                      {goalLoading ? '...' : 'Salvar Meta'}
                    </button>
                  </div>
                </form>
              </>
            )}
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
