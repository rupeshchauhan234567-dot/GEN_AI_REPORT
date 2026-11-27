import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BrainCircuit, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import '../auth.form.scss'
import { useAuth } from '../hooks/useAuth'

const Login = () => {
    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
            await handleLogin({ email, password })
            navigate('/', { replace: true })
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || 'Unable to login. Please check your details.'
            setError(message)
            if (/verify.*email|email.*verif/i.test(message)) { sessionStorage.setItem('careerhub_pending_email', email.trim().toLowerCase()); navigate('/verify-email') }
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-orb auth-orb-one" />
            <div className="auth-orb auth-orb-two" />
            <div className="auth-shell">
                <section className="auth-showcase">
                    <Link to="/login" className="auth-brand">
                        <span className="auth-brand-icon"><BrainCircuit size={25} /></span>
                        <span>Career<span>Hub</span></span>
                    </Link>
                    <div className="auth-showcase-copy">
                        <span className="auth-eyebrow"><Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE</span>
                        <h1>Build skills.<br /><span>Move forward.</span></h1>
                        <p>Your personal space for learning, career planning, AI-powered tools and interview preparation.</p>
                    </div>
                    <div className="auth-preview-card">
                        <div className="auth-preview-top"><span className="auth-live-dot" /> YOUR CAREER WORKSPACE <span>✦</span></div>
                        <div className="auth-preview-score"><div><strong>86%</strong><small>Role match score</small></div><div className="auth-score-ring">86</div></div>
                        <div className="auth-preview-bars"><i /><i /><i /></div>
                        <div className="auth-preview-caption">A clearer path to your next opportunity.</div>
                    </div>
                    <div className="auth-showcase-footer">© {new Date().getFullYear()} CareerHub · Built for your next opportunity</div>
                </section>

                <section className="auth-form-side">
                    <div className="auth-form-card">
                        <div className="auth-mobile-brand"><BrainCircuit size={22} /> Career<span>Hub</span></div>
                        <span className="auth-form-kicker">WELCOME BACK</span>
                        <h2>Sign in to your account</h2>
                        <p className="auth-form-subtitle">Pick up where you left off and keep moving towards your next opportunity.</p>
                        <form onSubmit={handleSubmit}>
                            <label className="auth-label" htmlFor="email">Email address</label>
                            <div className="auth-input-wrap"><Mail size={18} /><input required autoComplete="email" onChange={(e) => setEmail(e.target.value)} value={email} type="email" id="email" placeholder="you@example.com" /></div>
                            <label className="auth-label" htmlFor="password">Password</label>
                            <div className="auth-input-wrap"><LockKeyhole size={18} /><input required autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} value={password} type={showPassword ? 'text' : 'password'} id="password" placeholder="Enter your password" /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                            {error && <p className="auth-error" role="alert">{error}</p>}
                            <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : <>Sign in <ArrowRight size={18} /></>}</button>
                        </form>
                        <p className="auth-switch">New to CareerHub? <Link to="/register">Create an account</Link></p>
                        <div className="auth-secure-note"><LockKeyhole size={13} /> Your account and data stay secure</div>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default Login
