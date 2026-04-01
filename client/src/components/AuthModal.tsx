import { useState } from 'react';
import { loginUser } from '../api';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (user: { role: string; role_id: number; id: number; name: string }) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('role_id', data.user.role_id.toString());
      onLogin(data.user);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      setError(message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="auth-card" onClick={e => e.stopPropagation()} style={{
        background: 'white', padding: '30px', borderRadius: '12px', width: '350px'
      }}>
        <h3>Вход в систему</h3>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{width: '100%', marginBottom: '10px', padding: '8px'}} />
          <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required style={{width: '100%', marginBottom: '20px', padding: '8px'}} />
          {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
          <button type="submit" className="auth-submit" style={{width: '100%', padding: '10px', background: '#007b55', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>Войти</button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;