import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, BrainCircuit, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import '../auth.form.scss';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { loading, handleVerifyEmail, handleResendOtp } = useAuth();
  const [email, setEmail] = useState(() => sessionStorage.getItem('careerhub_pending_email') || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setNotice('');
    try {
      await handleVerifyEmail({ email: email.trim().toLowerCase(), otp: otp.trim() });
      sessionStorage.removeItem('careerhub_pending_email');
      navigate('/', { replace: true });
    } catch (err) { setError(err?.response?.data?.message || 'Verification failed. Check the code and try again.'); }
  };
  const resend = async () => {
    setError(''); setNotice('');
    try { const r = await handleResendOtp({ email: email.trim().toLowerCase() }); setNotice(r.message || 'A new verification code has been sent.'); setCooldown(60); }
    catch (err) { setError(err?.response?.data?.message || 'Could not resend the code. Please try again.'); }
  };

  return <main className="auth-page"><div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/><div className="auth-shell">
    <section className="auth-showcase"><Link to="/login" className="auth-brand"><span className="auth-brand-icon"><BrainCircuit size={25}/></span><span>Career<span>Hub</span></span></Link><div className="auth-showcase-copy"><span className="auth-eyebrow"><ShieldCheck size={14}/> ONE QUICK SECURITY CHECK</span><h1>Verify your email.<br/><span>Unlock your hub.</span></h1><p>Your learning plans, career tools and interview preparation stay together in one secure workspace.</p></div><div className="auth-preview-card"><div className="auth-preview-top"><span className="auth-live-dot"/> ACCOUNT SECURITY <span>✦</span></div><div className="auth-plan-row"><span className="auth-plan-icon"><MailCheck size={18}/></span><div><b>Email confirmation</b><small>One-time 6-digit code</small></div><span className="auth-plan-check">✓</span></div><div className="auth-plan-row"><span className="auth-plan-icon">02</span><div><b>Private workspace</b><small>Your account stays protected</small></div><span className="auth-plan-check">✓</span></div></div><div className="auth-showcase-footer">AI Career & Learning Hub · Learn. Prepare. Grow.</div></section>
    <section className="auth-form-side"><div className="auth-form-card"><div className="auth-mobile-brand"><BrainCircuit size={22}/> Career<span>Hub</span></div><span className="auth-form-kicker">EMAIL VERIFICATION</span><h2>Check your inbox</h2><p className="auth-form-subtitle">Enter the 6-digit code sent to your email address.</p><form onSubmit={submit}><label className="auth-label" htmlFor="verify-email">Email address</label><div className="auth-input-wrap"><MailCheck size={18}/><input id="verify-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div><label className="auth-label" htmlFor="otp">Verification code</label><div className="auth-input-wrap"><ShieldCheck size={18}/><input id="otp" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter 6-digit code"/></div>{error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="auth-success" role="status">{notice}</p>}<button className="auth-submit" type="submit" disabled={loading||otp.length!==6}>{loading?'Verifying…':<>Verify email <ArrowRight size={18}/></>}</button></form><button type="button" className="auth-resend" disabled={cooldown>0||!email} onClick={resend}><RefreshCw size={15}/>{cooldown?`Resend available in ${cooldown}s`:'Resend verification code'}</button><p className="auth-switch">Already verified? <Link to="/login">Sign in</Link></p></div></section>
  </div></main>;
}
