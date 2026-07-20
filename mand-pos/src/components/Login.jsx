import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Gem, Lock, Mail } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico para restablecer la contraseña.');
      setMessage('');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Te hemos enviado un enlace para restablecer tu contraseña. Revisa tu correo (y la carpeta de SPAM).');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No hay ninguna cuenta registrada con este correo.');
      } else {
        setError('Ocurrió un error al intentar enviar el correo de recuperación.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Ocurrió un error. Verifica que Authentication esté habilitado en Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel animate-fade-in">
        <div className="logo-container-login">
          <div className="logo-icon-login">
            <Gem size={32} />
          </div>
          <h2>MAND</h2>
          <p>Sistema de Inventario y POS</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}
        
        {message && (
          <div className="login-error" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-with-icon">
              <Mail className="icon" size={18} />
              <input 
                type="email" 
                className="form-control" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@mand.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-with-icon">
              <Lock className="icon" size={18} />
              <input 
                type="password" 
                className="form-control" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Cargando...' : (isRegistering ? 'Crear Cuenta Administrador' : 'Iniciar Sesión')}
          </button>
        </form>

        <div className="login-footer">
          <button 
            type="button" 
            className="text-btn" 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setMessage('');
            }}
          >
            {isRegistering 
              ? '¿Ya tienes cuenta? Inicia sesión aquí' 
              : '¿Primera vez? Crea tu cuenta de administrador'}
          </button>
          
          {!isRegistering && (
            <button 
              type="button" 
              className="text-btn" 
              onClick={handleResetPassword}
              style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}
              disabled={loading}
            >
              ¿Olvidaste tu contraseña? Enviar correo de recuperación
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
