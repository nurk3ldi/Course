import { type FormEvent, useState } from 'react';
import { forgotPasswordUser, resetPasswordUser } from './api';

type PasswordResetProps = {
    onBackToLogin: () => void;
};

export default function PasswordReset({ onBackToLogin }: PasswordResetProps) {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            await forgotPasswordUser(email);
            setStep(2);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            await resetPasswordUser(email, code, newPassword);
            alert('Пароль успешно изменен! Теперь вы можете войти в систему, используя новый пароль.');
            onBackToLogin();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="root">
            <header className="topbar">
                <div className="topbar-brand">TooOcenka LMS</div>
                <div className="topbar-actions">
                    <button className="topbar-btn topbar-btn-ghost" onClick={onBackToLogin}>
                        На главную
                    </button>
                </div>
            </header>

            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-label">Восстановление пароля</div>
                    <div className="auth-title">Сброс пароля</div>
                    <div className="auth-subtitle">
                        {step === 1
                            ? 'Введите ваш email, и мы отправим вам 6-значный код.'
                            : 'Введите полученный код и придумайте новый пароль.'}
                    </div>

                    {step === 1 ? (
                        <form className="auth-form" onSubmit={handleSendCode}>
                            <label className="auth-field">
                                <span>Email</span>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </label>

                            <button className="auth-submit" type="submit" disabled={loading}>
                                {loading ? 'Отправка...' : 'Отправить код'}
                            </button>
                        </form>
                    ) : (
                        <form className="auth-form" onSubmit={handleResetPassword}>
                            <label className="auth-field">
                                <span>Код из письма</span>
                                <input
                                    type="text"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                />
                            </label>

                            <label className="auth-field">
                                <span>Новый пароль</span>
                                <input
                                    type="password"
                                    placeholder="Минимум 8 символов"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </label>

                            <button className="auth-submit" type="submit" disabled={loading}>
                                {loading ? 'Сохранение...' : 'Сохранить пароль'}
                            </button>
                        </form>
                    )}

                    <button
                        className="auth-switch"
                        onClick={onBackToLogin}
                        type="button"
                    >
                        Вспомнили пароль? Вернуться ко входу
                    </button>
                </div>
            </div>
        </div>
    );
}