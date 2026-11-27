import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useParams } from 'react-router'
import AnimatedNumber from '../../../components/AnimatedNumber.jsx'
import { scrollToTop } from '../../../lib/smoothScroll.js'

gsap.registerPlugin(ScrollTrigger)

const EASE = [ 0.22, 1, 0.36, 1 ]

const NAV_ITEMS = [
    { id: 'technical', label: 'Technical Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>) },
    { id: 'behavioral', label: 'Behavioral Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>) },
    { id: 'roadmap', label: 'Road Map', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>) },
]

const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

// ── Sub-components ────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index }) => {
    const [ open, setOpen ] = useState(false)
    return (
        <motion.div variants={itemVariants} className={`q-card ${open ? 'q-card--open' : ''}`}>
            <button type='button' className='q-card__header' aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <span className='q-card__question'>{item.question}</span>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key='body'
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className='q-card__collapse'
                    >
                        <div className='q-card__body'>
                            <div className='q-card__section'>
                                <span className='q-card__tag q-card__tag--intention'>Intention</span>
                                <p>{item.intention}</p>
                            </div>
                            <div className='q-card__section'>
                                <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

const QuestionList = ({ questions }) => (
    <motion.div className='q-list' variants={listVariants} initial='hidden' animate='show'>
        {questions.map((q, i) => (
            <QuestionCard key={i} item={q} index={i} />
        ))}
    </motion.div>
)

// GSAP + ScrollTrigger: the timeline line draws as you scroll and each day reveals once
const RoadMap = ({ plan }) => {
    const listRef = useRef(null)

    useLayoutEffect(() => {
        const list = listRef.current
        if (!list) return undefined

        const mm = gsap.matchMedia()
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.fromTo(
                list.querySelector('[data-line]'),
                { scaleY: 0 },
                {
                    scaleY: 1,
                    ease: 'none',
                    transformOrigin: 'top center',
                    scrollTrigger: { trigger: list, start: 'top 75%', end: 'bottom 75%', scrub: true },
                }
            )
            gsap.utils.toArray('.roadmap-day', list).forEach((day) => {
                gsap.from(day, {
                    opacity: 0,
                    x: -22,
                    duration: 0.7,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: day, start: 'top 88%', once: true },
                })
            })
        })

        const id = requestAnimationFrame(() => ScrollTrigger.refresh())
        return () => {
            cancelAnimationFrame(id)
            mm.revert()
        }
    }, [ plan ])

    return (
        <div className='roadmap-list' ref={listRef}>
            <span className='roadmap-list__line' data-line aria-hidden='true' />
            {plan.map((day) => (
                <div className='roadmap-day' key={day.day}>
                    <div className='roadmap-day__header'>
                        <span className='roadmap-day__badge'>Day {day.day}</span>
                        <h3 className='roadmap-day__focus'>{day.focus}</h3>
                    </div>
                    <ul className='roadmap-day__tasks'>
                        {day.tasks.map((task, i) => (
                            <li key={i}>
                                <span className='roadmap-day__bullet' />
                                {task}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}

const ScoreRing = ({ score }) => {
    const value = Math.max(0, Math.min(100, Number(score) || 0))
    const tone = value >= 80 ? 'high' : value >= 60 ? 'mid' : 'low'
    const radius = 52
    const circumference = 2 * Math.PI * radius

    return (
        <div className={`score-ring score-ring--${tone}`}>
            <svg viewBox='0 0 120 120' aria-hidden='true'>
                <circle className='score-ring__track' cx='60' cy='60' r={radius} />
                <motion.circle
                    className='score-ring__bar'
                    cx='60'
                    cy='60'
                    r={radius}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
                    transition={{ duration: 1.4, delay: 0.3, ease: EASE }}
                    transform='rotate(-90 60 60)'
                />
            </svg>
            <div className='score-ring__label' role='img' aria-label={`Match score ${value} percent`}>
                <AnimatedNumber value={value} duration={1.4} delay={0.3} className='score-ring__value' />
                <span className='score-ring__pct'>%</span>
            </div>
        </div>
    )
}

const DownloadIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
)

const ResumeDownload = ({ interviewId, getResumePdf }) => {
    const [ status, setStatus ] = useState('idle') // idle | loading | success | error
    const [ message, setMessage ] = useState('')
    const resetTimer = useRef(null)

    useEffect(() => () => clearTimeout(resetTimer.current), [])

    const handleDownload = async () => {
        if (status === 'loading') return
        clearTimeout(resetTimer.current)
        setStatus('loading')
        setMessage('')
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        const openedWindow = isIOS ? window.open('about:blank', '_blank') : null

        try {
            await getResumePdf(interviewId, openedWindow)
            setStatus('success')
            setMessage(isIOS ? 'Your PDF is opening. Use Share to save it.' : 'Your resume download has started.')
            resetTimer.current = setTimeout(() => setStatus('idle'), 3500)
        } catch (error) {
            setStatus('error')
            setMessage(error?.message || 'Could not download the resume. Please try again.')
        }
    }

    const label = status === 'loading' ? 'Preparing PDF...' : status === 'success' ? 'Downloaded' : 'Download resume'

    return (
        <div className='resume-download-card'>
            <div className='resume-download-heading'>
                <span className='resume-download-icon'>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6" /><path d="M9 11h2" /></svg>
                </span>
                <span><strong>Resume PDF</strong><small>Download your tailored resume</small></span>
            </div>
            <motion.button
                type='button'
                onClick={handleDownload}
                disabled={status === 'loading'}
                whileHover={status === 'loading' ? undefined : { y: -2 }}
                whileTap={status === 'loading' ? undefined : { scale: 0.97 }}
                className={`resume-download-button resume-download-button--${status}`}
            >
                <AnimatePresence mode='wait' initial={false}>
                    <motion.span
                        key={status}
                        className='resume-download-button__content'
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                    >
                        {status === 'loading' && <span className='resume-download-spinner' aria-hidden='true' />}
                        {status === 'success' && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        )}
                        {label}
                        {(status === 'idle' || status === 'error') && DownloadIcon}
                    </motion.span>
                </AnimatePresence>
            </motion.button>
            <AnimatePresence>
                {message && (
                    <motion.p
                        key={message}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`resume-download-message ${status === 'error' ? 'is-error' : 'is-success'}`}
                        role='status'
                    >
                        {message}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [ activeNav, setActiveNav ] = useState('technical')
    const { report, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()

    useEffect(() => {
        scrollToTop(true)
    }, [])

    // Tab content changes the page height, so ScrollTrigger needs a fresh measurement
    useEffect(() => {
        const id = requestAnimationFrame(() => ScrollTrigger.refresh())
        return () => cancelAnimationFrame(id)
    }, [ activeNav ])

    if (loading || !report) {
        return (
            <main className='loading-screen'>
                <span className='loading-screen__spinner' aria-hidden='true' />
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    const technicalQuestions = report.technicalQuestions || []
    const behavioralQuestions = report.behavioralQuestions || []
    const preparationPlan = report.preparationPlan || []
    const skillGaps = report.skillGaps || []
    const score = Number(report.matchScore) || 0
    const scoreSummary =
        score >= 80 ? 'Strong match for this role' :
            score >= 60 ? 'Good match, a few gaps to close' : 'Some preparation needed for this role'

    return (
        <div className='interview-page'>
            <div className='interview-layout'>

                {/* ── Left rail ── */}
                <motion.div
                    className='interview-rail'
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                >
                    <nav className='interview-nav'>
                        <p className='interview-nav__label'>Sections</p>
                        <div className='interview-nav__items'>
                            {NAV_ITEMS.map(item => (
                                <button
                                    key={item.id}
                                    type='button'
                                    className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                    onClick={() => setActiveNav(item.id)}
                                >
                                    {activeNav === item.id && (
                                        <motion.span
                                            layoutId='nav-pill'
                                            className='interview-nav__pill'
                                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                        />
                                    )}
                                    <span className='interview-nav__icon'>{item.icon}</span>
                                    <span className='interview-nav__text'>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>
                    <ResumeDownload interviewId={interviewId} getResumePdf={getResumePdf} />
                </motion.div>

                {/* ── Center Content ── */}
                <main className='interview-content'>
                    <AnimatePresence mode='wait' initial={false}>
                        <motion.section
                            key={activeNav}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: EASE }}
                        >
                            {activeNav === 'technical' && (
                                <>
                                    <div className='content-header'>
                                        <h2>Technical Questions</h2>
                                        <span className='content-header__count'>{technicalQuestions.length} questions</span>
                                    </div>
                                    <QuestionList questions={technicalQuestions} />
                                </>
                            )}

                            {activeNav === 'behavioral' && (
                                <>
                                    <div className='content-header'>
                                        <h2>Behavioral Questions</h2>
                                        <span className='content-header__count'>{behavioralQuestions.length} questions</span>
                                    </div>
                                    <QuestionList questions={behavioralQuestions} />
                                </>
                            )}

                            {activeNav === 'roadmap' && (
                                <>
                                    <div className='content-header'>
                                        <h2>Preparation Road Map</h2>
                                        <span className='content-header__count'>{preparationPlan.length}-day plan</span>
                                    </div>
                                    <RoadMap plan={preparationPlan} />
                                </>
                            )}
                        </motion.section>
                    </AnimatePresence>
                </main>

                {/* ── Right Sidebar ── */}
                <motion.aside
                    className='interview-sidebar'
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
                >
                    <div className='side-panel match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <ScoreRing score={score} />
                        <p className='match-score__sub'>{scoreSummary}</p>
                    </div>

                    <div className='side-panel skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <motion.div className='skill-gaps__list' variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.5 } } }} initial='hidden' animate='show'>
                            {skillGaps.length === 0 && <span className='skill-gaps__empty'>No skill gaps found.</span>}
                            {skillGaps.map((gap, i) => (
                                <motion.span
                                    key={i}
                                    variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                                    className={`skill-tag skill-tag--${gap.severity}`}
                                >
                                    {gap.skill}
                                </motion.span>
                            ))}
                        </motion.div>
                    </div>
                </motion.aside>
            </div>
        </div>
    )
}

export default Interview
