import { useAuth } from '../context/AuthContext';
import { Leaf } from 'lucide-react';

export function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      backgroundColor: 'var(--bg-color)'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2rem' }}>
        <Leaf size={48} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
        <h1>Coleta de Sementes</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          Gerenciamento técnico e acompanhamento de matrizes florestais.
        </p>
        
        <button 
          className="btn btn-primary" 
          onClick={signInWithGoogle}
          style={{ width: '100%' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', padding: '2px' }} />
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
