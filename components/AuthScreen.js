'use client';
import { useState } from 'react';
import { api } from '../services/api';

export default function AuthScreen({ onAuthenticated, message = '' }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registering = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (registering && fields.password !== fields.confirm_password) {
      setError('The passwords do not match.');
      return;
    }
    delete fields.confirm_password;
    if (!fields.coaching_code) delete fields.coaching_code;
    setBusy(true);
    try { onAuthenticated(await api(registering ? '/auth/register' : '/auth/login', '', fields)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <main className="login"><div className="brand">◉ ATTENDANCE DESK</div>
    <div className="auth-tabs" role="group" aria-label="Account access">
      <button type="button" disabled={busy} className={registering ? 'auth-tab' : 'auth-tab selected'} onClick={() => {setMode('login');setError('');}}>Sign in</button>
      <button type="button" disabled={busy} className={registering ? 'auth-tab selected' : 'auth-tab'} onClick={() => {setMode('register');setError('');}}>Register coaching</button>
    </div>
    <h1>{registering ? <>Your coaching.<br/>Your workspace.</> : <>A clear view of<br/>every arrival.</>}</h1>
    <p>{registering ? 'Create a coaching account to manage your own students, attendance, devices, and parent messages.' : 'Sign in to your coaching dashboard.'}</p>
    {!error && message && <p role="status" className="notice">{message}</p>}
    <form key={mode} onSubmit={submit}>
      {registering && <><label>Coaching name<input name="coaching_name" required minLength={2} maxLength={150} autoComplete="organization"/></label>
        <label>Coaching code (optional)<input name="coaching_code" maxLength={24} pattern="[A-Za-z][A-Za-z0-9_-]{1,23}" placeholder="e.g. ASPIRE" autoCapitalize="characters" aria-describedby="coaching-code-help"/></label>
        <p id="coaching-code-help" className="muted">Used in student IDs, such as ASPIRE-STU-…. Leave blank to generate a unique coaching code.</p></>}
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="username"/></label>
      <label>Password<input name="password" type="password" required minLength={registering ? 12 : 1} maxLength={registering ? 128 : 256} autoComplete={registering ? 'new-password' : 'current-password'}/></label>
      {registering && <label>Confirm password<input name="confirm_password" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label>}
      <button disabled={busy}>{busy ? (registering ? 'Creating coaching…' : 'Signing in…') : (registering ? 'Create coaching account →' : 'Sign in →')}</button>
    </form>{error && <p role="alert" className="error">{error}</p>}
  </main>;
}
