import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', { email, password });
            const { data } = await api.post('/auth/login', { email, password });
            login(data.token);
        } catch (error) {
            alert('Қате: ' + (error.response?.data?.error || error.message));
        }
    };

    return (
        <div className="container" style={{ maxWidth: 400, marginTop: 50 }}>
            <div className="card">
                <h2>Тіркелу</h2>
                <form onSubmit={handleSubmit} style={{ boxShadow: 'none', padding: 0, margin: 0 }}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="submit">Тіркелу</button>
                </form>
                <div style={{ marginTop: 15, textAlign: 'center' }}>
                    <Link to="/login">Менде аккаунт бар (Кіру)</Link>
                </div>
            </div>
        </div>
    );
}