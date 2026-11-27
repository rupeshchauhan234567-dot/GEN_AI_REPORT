import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BrainCircuit, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'
import '../auth.form.scss'
import { useAuth } from '../hooks/useAuth'

const Register = () => {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const { loading, handleRegister } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
            await handleRegister({ username, email, password })
            sessionStorage.setItem('careerhub_pending_email', email.trim().toLowerCase())
            navigate('/verify-email', { replace: true })
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Unable to create account. Please try again.')
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-orb auth-orb-one" />
            <div className="auth-orb auth-orb-two" />
            <div className="auth-shell">
                <section className="auth-showcase">
                    <Link to="/register" className="auth-brand"><span className="auth-brand-icon"><BrainCircuit size={25} /></span><span>Career<span>Hub</span></span></Link>
                    <div className="auth-showcase-copy">
                        <span className="auth-eyebrow"><Sparkles size={14} /> START YOUR PREPARATION</span>
                        <h1>Your potential.<br /><span>One smart plan.</span></h1>
                        <p>Create your workspace for focused learning, career planning and confident interview preparation.</p>
                    </div>
                    <div className="auth-preview-card auth-register-preview">
                        <div className="auth-preview-top"><span className="auth-live-dot" /> YOUR PREPARATION PLAN <span>✦</span></div>
                        <div className="auth-plan-row"><span className="auth-plan-icon">01</span><div><b>Know your strengths</b><small>Understand your role fit</small></div><span className="auth-plan-check">✓</span></div>
                        <div className="auth-plan-row"><span className="auth-plan-icon">02</span><div><b>Practice with purpose</b><small>Get tailored interview questions</small></div><span className="auth-plan-check">✓</span></div>
                        <div className="auth-plan-row"><span className="auth-plan-icon">03</span><div><b>Prepare with confidence</b><small>Follow your personal roadmap</small></div><span className="auth-plan-check">✓</span></div>
                    </div>
                    <div className="auth-showcase-footer">© {new Date().getFullYear()} CareerHub · Learn · Prepare · Grow</div>
                </section>

                <section className="auth-form-side">
                    <div className="auth-form-card">
                        <div className="auth-mobile-brand"><BrainCircuit size={22} /> Career<span>Hub</span></div>
                        <span className="auth-form-kicker">GET STARTED — IT'S FREE</span>
                        <h2>Create your account</h2>
                        <p className="auth-form-subtitle">A few details and you're ready to prepare smarter.</p>
                        <form onSubmit={handleSubmit}>
                            <label className="auth-label" htmlFor="username">Your name</label>
                            <div className="auth-input-wrap"><UserRound size={18} /><input required minLength={2} autoComplete="name" onChange={(e) => setUsername(e.target.value)} value={username} type="text" id="username" placeholder="Enter your name" /></div>
                            <label className="auth-label" htmlFor="email">Email address</label>
                            <div className="auth-input-wrap"><Mail size={18} /><input required autoComplete="email" onChange={(e) => setEmail(e.target.value)} value={email} type="email" id="email" placeholder="you@example.com" /></div>
                            <label className="auth-label" htmlFor="password">Password</label>
                            <div className="auth-input-wrap"><LockKeyhole size={18} /><input required minLength={8} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} value={password} type={showPassword ? 'text' : 'password'} id="password" placeholder="Create a password (min. 8 characters)" /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                            {error && <p className="auth-error" role="alert">{error}</p>}
                            <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Creating account...' : <>Create account <ArrowRight size={18} /></>}</button>
                        </form>
                        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
                        <div className="auth-secure-note"><LockKeyhole size={13} /> Your account and data stay secure</div>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default Register
