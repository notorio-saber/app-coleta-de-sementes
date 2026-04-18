import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export function InactiveScreen() {
  const { signOut, user } = useAuth();
  
  const handleWhatsApp = () => {
    window.open('https://wa.me/5547920022746?text=Olá,%20gostaria%20de%20ativar%20a%20minha%20conta', '_blank');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-color)',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ color: 'var(--warning-color)', marginBottom: '1rem' }}>Conta não ativada</h1>
      <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
        Olá, {user?.displayName || 'visitante'}! Seu acesso ainda não foi liberado no sistema. 
        Por favor, solicite a ativação da sua conta para continuar.
      </p>
      
      <button 
        onClick={handleWhatsApp}
        className="btn"
        style={{
          backgroundColor: '#25D366',
          color: '#fff',
          fontWeight: 'bold',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          marginBottom: '1.5rem',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '300px',
          boxShadow: '0 4px 6px rgba(37, 211, 102, 0.2)'
        }}
      >
        Pedir Ativação pelo WhatsApp
      </button>

      <button 
        onClick={signOut}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer'
        }}
      >
        <LogOut size={16} />
        Sair ou trocar de conta
      </button>
    </div>
  );
}
