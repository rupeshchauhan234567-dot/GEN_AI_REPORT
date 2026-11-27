
import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { NavLink, useNavigate, useParams } from 'react-router';
import Home from "../interview/pages/Home";
import {
    Activity,
    ArrowUpRight,
    Bookmark,
    BrainCircuit,
    BriefcaseBusiness,
    CalendarDays,
    Check,
    ChevronRight,
    CircleHelp,
    Clock3,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageCircle,
    Plus,
    Search,
    Sparkles,
    StickyNote,
    Target,
    Trash2,
    X
} from 'lucide-react';

import { useAuth } from '../auth/hooks/useAuth';
import {
    dashboard,
    listItems,
    createItem,
    updateItem,
    deleteItem,
    generateAI,
    sendChat
} from './hub.api';

import './hub.css';

const nav = [
    ['Workspace', [
        ['dashboard', 'Overview', LayoutDashboard],
        ['interview-prep', 'Interview Prep', BriefcaseBusiness],
        ['mock-interview', 'Mock Interview', MessageCircle],
        ['resume', 'Resume Studio', FileText]
    ]],
    ['Career', [
        ['roadmap', 'Career Roadmap', Target],
        ['jobs', 'Job Tracker', Activity],
        ['career-tools', 'Career AI Tools', Sparkles]
    ]],
    ['AI Study Tools', [
        ['quiz', 'Quiz Generator', CircleHelp],
        ['flashcards', 'Flashcards', BrainCircuit],
        ['notes', 'Notes', StickyNote],
        ['summarizer', 'PDF Summarizer', FileText],
        ['assistant', 'Study Assistant', MessageCircle]
    ]],
    ['Productivity', [
        ['planner', 'Study Planner', CalendarDays],
        ['tasks', 'To-do List', Check],
        ['bookmarks', 'Bookmarks', Bookmark],
        ['utilities', 'Pomodoro', Clock3]
    ]]
];

const modules = {
    notes: [
        'note',
        'Notes',
        'Capture and organise your learning notes.',
        'Write a note…'
    ],
    tasks: [
        'task',
        'To-do list',
        'Break your next steps into manageable tasks.',
        'Add a task…'
    ],
    flashcards: [
        'flashcard',
        'Flashcards',
        'Create AI flashcards and practise active recall.',
        'Topic to generate cards…'
    ],
    planner: [
        'planner',
        'Study planner',
        'Plan your upcoming study sessions.',
        'Add a study session…'
    ],
    bookmarks: [
        'bookmark',
        'Bookmarks',
        'Save useful learning resources.',
        'Title or URL…'
    ],
    jobs: [
        'job',
        'Job tracker',
        'Keep your applications in one place.',
        'Company · role…'
    ],
    roadmap: [
        'goal',
        'Career roadmap',
        'Turn your target role into a learning plan.',
        'Target role…'
    ]
};

const title = (s) =>
    s.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function Hub({ isDashboard = false }) {
    const { section = 'dashboard' } = useParams();

    const active = isDashboard ? 'dashboard' : section;

    const { user, handleLogout } = useAuth();
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({});
    const [reports, setReports] = useState([]);

    const [draft, setDraft] = useState('');
    const [query, setQuery] = useState('');

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const [mobile, setMobile] = useState(false);

    const [chat, setChat] = useState([]);
    const [chatText, setChatText] = useState('');

    const [answers, setAnswers] = useState({});
    const [qIndex, setQIndex] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const [seconds, setSeconds] = useState(1500);
    const [timerRunning, setTimerRunning] = useState(false);

    const cfg = modules[active];

    // Load workspace items
    const refresh = async () => {
        if (!cfg) return;

        const d = await listItems(cfg[0], query);
        setItems(d.items || []);
    };

    // Load dashboard and section data
    useEffect(() => {
        if (
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            gsap.fromTo(
                '.ch-content > *',
                {
                    y: 14,
                    opacity: 0
                },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.42,
                    stagger: 0.045,
                    ease: 'power2.out',
                    clearProps: 'transform'
                }
            );
        }

        setError('');
        setResult(null);
        setDraft('');
        setAnswers({});
        setQIndex(0);
        setSubmitted(false);

        if (active === 'dashboard') {
            dashboard()
                .then(d => {
                    // Supports both direct and nested backend responses
                    const data = d.dashboard || d.data || d;

                    setStats(
                        data.stats ||
                        data.itemCounts ||
                        d.stats ||
                        {}
                    );

                    setReports(
                        data.interviews ||
                        data.recentReports ||
                        d.interviews ||
                        d.recentReports ||
                        []
                    );
                })
                .catch(e => {
                    setError(
                        e.response?.data?.message ||
                        'Could not load dashboard.'
                    );
                });
        } else if (cfg) {
            refresh().catch(e => {
                setError(
                    e.response?.data?.message ||
                    'Could not load items.'
                );
            });
        }
    }, [active, query]);



    // Sidebar navigation animation
useEffect(() => {
    const links = gsap.utils.toArray('.ch-side nav .ch-link');

    if (!links.length) return;

    const animation = gsap.fromTo(
        links,
        {
            x: -12,
            opacity: 0
        },
        {
            x: 0,
            opacity: 1,
            duration: 0.35,
            stagger: 0.035,
            ease: 'power2.out',
            clearProps: 'all'
        }
    );

    return () => animation.kill();
}, [active]);


    // Pomodoro timer
    useEffect(() => {
        if (active !== 'utilities' || !timerRunning) return;

        const id = setInterval(() => {
            setSeconds(s => {
                if (s <= 1) {
                    setTimerRunning(false);
                    return 0;
                }

                return s - 1;
            });
        }, 1000);

        return () => clearInterval(id);
    }, [active, timerRunning]);

    // Logout
    const logout = async () => {
        await handleLogout();
        navigate('/login');
    };

    // Save workspace item
    const save = async e => {
        e.preventDefault();

        if (!draft.trim() || !cfg) return;

        setBusy(true);
        setError('');

        try {
            await createItem({
                type: cfg[0],
                title: draft.trim(),
                content: {
                    text: draft.trim()
                }
            });

            setDraft('');
            await refresh();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                'Save failed.'
            );
        } finally {
            setBusy(false);
        }
    };

    // Delete workspace item
    const remove = async id => {
        try {
            await deleteItem(id);
            await refresh();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                'Could not delete item.'
            );
        }
    };

    // AI content generation
    const ai = async kind => {
        if (!draft.trim()) {
            setError('Please enter a topic or some content first.');
            return;
        }

        setBusy(true);
        setError('');
        setResult(null);

        try {
            const r = await generateAI({
                task: kind,
                kind,
                topic: draft.trim(),
                context: draft.trim(),
                count: 5
            });

            if (!r?.result) {
                throw new Error(
                    r?.message || 'AI did not return a result.'
                );
            }

            setResult(r.result);

            // Save generated flashcards
            if (
                kind === 'flashcards' &&
                Array.isArray(r.result.cards)
            ) {
                for (const c of r.result.cards) {
                    await createItem({
                        type: 'flashcard',
                        title: c.front,
                        content: c
                    });
                }

                await refresh();
            }
        } catch (e) {
            setError(
                e.response?.data?.message ||
                e.message ||
                'AI generation failed. Check Groq setup.'
            );
        } finally {
            setBusy(false);
        }
    };

    // Study assistant chat
    const send = async e => {
        e.preventDefault();

        if (!chatText.trim() || busy) return;

        const next = [
            ...chat,
            {
                role: 'user',
                content: chatText.trim()
            }
        ];

        setChat(next);
        setChatText('');
        setBusy(true);
        setError('');

        try {
            const r = await sendChat({
                message: next[next.length - 1].content,
                history: next.slice(0, -1)
            });

            const assistantMessage =
                r?.reply ||
                r?.answer ||
                r?.message ||
                'No response received.';

            setChat([
                ...next,
                {
                    role: 'assistant',
                    content: assistantMessage
                }
            ]);
        } catch (e) {
            setError(
                e.response?.data?.message ||
                'Assistant unavailable.'
            );
        } finally {
            setBusy(false);
        }
    };

    const logoutText = 'Sign out';

    const heading =
        nav.flatMap(g => g[1]).find(x => x[0] === active)?.[1] ||
        'Overview';

    return (
        <div className="ch-app">

            {mobile && (
                <button
                    className="ch-overlay"
                    onClick={() => setMobile(false)}
                    aria-label="Close navigation"
                />
            )}

            {/* Sidebar */}
            <aside className={`ch-side ${mobile ? 'open' : ''}`}>

                <div className="ch-logo">
                    <span>
                        <BrainCircuit />
                    </span>

                    <b>
                        Career<span>Hub</span>
                        <small>AI CAREER & LEARNING</small>
                    </b>

                    <button
                        className="ch-close"
                        onClick={() => setMobile(false)}
                    >
                        <X />
                    </button>
                </div>

                <div className="ch-user">
                    <i>
                        {(user?.username || 'U')[0].toUpperCase()}
                    </i>

                    <div>
                        <b>{user?.username || 'Learner'}</b>
                        <small>{user?.email}</small>
                    </div>
                </div>

                <nav>
                    {nav.map(([group, links]) => (
                        <section key={group}>
                            <label>{group}</label>

                            {links.map(([id, name, Icon]) => (
                                <NavLink
                                    onClick={() => setMobile(false)}
                                    key={id}
                                    to={
                                        id === 'dashboard'
                                            ? '/dashboard'
                                            : `/hub/${id}`
                                    }
                                    className={({ isActive }) =>
                                        `ch-link ${active === id ? 'active' : ''
                                        }`
                                    }
                                >
                                    <Icon size={17} />

                                    {name}

                                    {active === id && (
                                        <ChevronRight size={14} />
                                    )}
                                </NavLink>
                            ))}
                        </section>
                    ))}
                </nav>

                <button className="ch-logout" onClick={logout}>
                    <LogOut size={17} />
                    {logoutText}
                </button>
            </aside>

            {/* Main content */}
            <main className="ch-main">

                <header className="ch-top">
                    <button
                        className="ch-menu"
                        onClick={() => setMobile(true)}
                    >
                        <Menu />
                    </button>

                    <div>
                        Workspace <ChevronRight size={14} />
                        <b>{heading}</b>
                    </div>

                    <span className="ch-online">
                        <i /> Groq AI
                    </span>

                    <i className="ch-top-avatar">
                        {(user?.username || 'U')[0].toUpperCase()}
                    </i>
                </header>

                <div className="ch-content">

                    {/* Dashboard */}
                    {active === 'dashboard' ? (
                        <>
                            <div className="ch-head">
                                <div>
                                    <small>YOUR PERSONAL WORKSPACE</small>

                                    <h1>
                                        Good to see you,{' '}
                                        {user?.username || 'there'}{' '}
                                        <span>✦</span>
                                    </h1>

                                    <p>
                                        Learn smarter, prepare better and move
                                        your career forward.
                                    </p>
                                </div>

                                <NavLink
                                    className="ch-btn"
                                    to="/hub/interview-prep"
                                >
                                    <Sparkles size={16} />
                                    Create interview report
                                </NavLink>
                            </div>

                            <div className="ch-hero">
                                <div>
                                    <small>AI CAREER & LEARNING HUB</small>

                                    <h2>
                                        Your next opportunity
                                        <br />
                                        starts with one small step.
                                    </h2>

                                    <p>
                                        One space to learn, prepare and grow
                                        with purpose.
                                    </p>

                                    <NavLink to="/hub/roadmap">
                                        Build my roadmap
                                        <ArrowUpRight size={16} />
                                    </NavLink>
                                </div>

                                <div className="ch-orbit">
                                    <div>
                                        <BrainCircuit size={46} />
                                    </div>

                                    <i>✦</i>
                                    <b>LEARN</b>
                                    <em>GROW</em>
                                </div>
                            </div>

                            <div className="ch-stats">
                                {[
                                    [
                                        BriefcaseBusiness,
                                        'Interview reports',
                                        reports.length
                                    ],
                                    [
                                        StickyNote,
                                        'Notes saved',
                                        stats.note || 0
                                    ],
                                    [
                                        BrainCircuit,
                                        'Flashcards',
                                        stats.flashcard || 0
                                    ],
                                    [
                                        Check,
                                        'Tasks saved',
                                        stats.task || 0
                                    ]
                                ].map(([I, l, v]) => (
                                    <div key={l}>
                                        <span>
                                            <I />
                                        </span>

                                        <small>{l}</small>
                                        <b>{v}</b>
                                        <em>In your workspace</em>
                                    </div>
                                ))}
                            </div>

                            <h2 className="ch-section-title">
                                Quick actions
                            </h2>

                            <div className="ch-quick">
                                {[
                                    [
                                        'quiz',
                                        'Generate a quiz',
                                        'Test your understanding',
                                        CircleHelp
                                    ],
                                    [
                                        'notes',
                                        'Capture a note',
                                        'Save important ideas',
                                        StickyNote
                                    ],
                                    [
                                        'assistant',
                                        'Ask the AI assistant',
                                        'Learn with guided help',
                                        MessageCircle
                                    ],
                                    [
                                        'jobs',
                                        'Track an application',
                                        'Stay organised',
                                        BriefcaseBusiness
                                    ]
                                ].map(([id, l, d, I]) => (
                                    <NavLink
                                        to={`/hub/${id}`}
                                        key={id}
                                    >
                                        <I />
                                        <b>{l}</b>
                                        <small>{d}</small>
                                        <ArrowUpRight size={15} />
                                    </NavLink>
                                ))}
                            </div>

                            <h2 className="ch-section-title">
                                Recent interview reports
                            </h2>

                            <div className="ch-list">
                                {reports.length ? (
                                    reports.map(r => (
                                        <NavLink
                                            to={`/interview/${r._id || r.id}`}
                                            key={r._id || r.id}
                                        >
                                            <FileText />

                                            <span>
                                                <b>{r.title}</b>
                                                <small>
                                                    {r.createdAt
                                                        ? new Date(
                                                            r.createdAt
                                                        ).toLocaleDateString()
                                                        : ''}
                                                </small>
                                            </span>

                                            <strong>
                                                {r.matchScore ?? 0}% match
                                            </strong>
                                        </NavLink>
                                    ))
                                ) : (
                                    <p className="ch-empty">
                                        No reports yet. Your existing
                                        interview generator is ready to use.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : active === 'interview-prep' ? (
                        <div className="ch-interview-embed">
                            <Home embedded />
                        </div>
                    ) : active === 'mock-interview' ? (
                        <>
                            <Heading
                                title="Mock interview"
                                desc="Generate a question set and practise answering one question at a time."
                            />

                            <div className="ch-panel">
                                <textarea
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    placeholder="e.g. React frontend developer interview…"
                                />

                                <button
                                    className="ch-btn"
                                    disabled={busy || !draft.trim()}
                                    onClick={() => ai('quiz')}
                                >
                                    {busy
                                        ? 'Generating…'
                                        : 'Generate practice questions'}
                                </button>

                                <Quiz
                                    result={result}
                                    index={qIndex}
                                    setIndex={setQIndex}
                                    answers={answers}
                                    setAnswers={setAnswers}
                                    submitted={submitted}
                                    setSubmitted={setSubmitted}
                                />
                            </div>
                        </>
                    ) : (
                        active === 'quiz' ||
                        active === 'summarizer' ||
                        active === 'career-tools'
                    ) ? (
                        <>
                            <Heading
                                title={
                                    active === 'quiz'
                                        ? 'Quiz generator'
                                        : active === 'summarizer'
                                            ? 'PDF summarizer'
                                            : 'Career AI tools'
                                }
                                desc={
                                    active === 'quiz'
                                        ? 'Generate a topic quiz and check your answers.'
                                        : active === 'summarizer'
                                            ? 'Paste extracted PDF text to create a structured summary.'
                                            : 'Create role-focused career material from your own details.'
                                }
                            />

                            <div className="ch-panel">
                                <textarea
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    placeholder={
                                        active === 'quiz'
                                            ? 'Topic or learning material…'
                                            : active === 'summarizer'
                                                ? 'Paste text extracted from your PDF…'
                                                : 'Paste your skills, project details or job description…'
                                    }
                                />

                                <div className="ch-actions">
                                    {(
                                        active === 'quiz'
                                            ? [['quiz', 'Generate quiz']]
                                            : active === 'summarizer'
                                                ? [['summary', 'Summarise text']]
                                                : [
                                                    ['jd-analysis', 'Analyse JD'],
                                                    ['cover-letter', 'Draft cover letter'],
                                                    ['portfolio', 'Portfolio bio'],
                                                    ['project-ideas', 'Project ideas']
                                                ]
                                    ).map(([k, l]) => (
                                        <button
                                            className="ch-btn"
                                            disabled={busy || !draft.trim()}
                                            onClick={() => ai(k)}
                                            key={k}
                                        >
                                            {busy ? 'Working…' : l}
                                        </button>
                                    ))}
                                </div>

                                {active === 'quiz' ? (
                                    <Quiz
                                        result={result}
                                        index={qIndex}
                                        setIndex={setQIndex}
                                        answers={answers}
                                        setAnswers={setAnswers}
                                        submitted={submitted}
                                        setSubmitted={setSubmitted}
                                    />
                                ) : (
                                    <AI result={result} />
                                )}
                            </div>
                        </>
                    ) : active === 'assistant' ? (
                        <>
                            <Heading
                                title="Study assistant"
                                desc="Ask in Hindi or English. Get help with concepts, code and debugging."
                            />

                            <div className="ch-chat">
                                <div className="ch-chat-log">
                                    {chat.length ? (
                                        chat.map((m, i) => (
                                            <article
                                                className={m.role}
                                                key={i}
                                            >
                                                <small>
                                                    {m.role === 'user'
                                                        ? 'You'
                                                        : 'AI assistant'}
                                                </small>

                                                <p>{m.content}</p>
                                            </article>
                                        ))
                                    ) : (
                                        <div className="ch-empty">
                                            <BrainCircuit />
                                            <b>
                                                What are you learning today?
                                            </b>
                                            <p>
                                                Ask a question or share code to
                                                understand it better.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={send}>
                                    <input
                                        value={chatText}
                                        onChange={e =>
                                            setChatText(e.target.value)
                                        }
                                        placeholder="Ask a question…"
                                    />

                                    <button
                                        className="ch-btn"
                                        disabled={busy || !chatText.trim()}
                                    >
                                        {busy ? 'Sending…' : 'Send'}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : active === 'utilities' ? (
                        <>
                            <Heading
                                title="Pomodoro focus timer"
                                desc="Use focused sessions to make steady progress."
                            />

                            <div className="ch-panel ch-timer">
                                <small>FOCUS SESSION</small>

                                <strong>
                                    {String(
                                        Math.floor(seconds / 60)
                                    ).padStart(2, '0')}
                                    :
                                    {String(seconds % 60).padStart(2, '0')}
                                </strong>

                                <div className="ch-actions">
                                    <button
                                        className="ch-btn"
                                        onClick={() =>
                                            setTimerRunning(v => !v)
                                        }
                                    >
                                        {timerRunning
                                            ? 'Pause'
                                            : 'Start focus'}
                                    </button>

                                    <button
                                        className="ch-btn secondary"
                                        onClick={() => {
                                            setTimerRunning(false);
                                            setSeconds(1500);
                                        }}
                                    >
                                        Reset 25 min
                                    </button>

                                    <button
                                        className="ch-btn secondary"
                                        onClick={() => {
                                            setTimerRunning(false);
                                            setSeconds(300);
                                        }}
                                    >
                                        Break 5 min
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : active === 'resume' ? (
                        <>
                            <Heading
                                title="Resume studio"
                                desc="Keep your resume profile details in your account workspace."
                            />

                            <ResumeDraft />
                        </>
                    ) : cfg ? (
                        <>
                            <Heading
                                title={cfg[1]}
                                desc={cfg[2]}
                            />

                            <form
                                className="ch-create"
                                onSubmit={save}
                            >
                                <input
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    placeholder={cfg[3]}
                                />

                                <button
                                    className="ch-btn"
                                    disabled={busy || !draft.trim()}
                                >
                                    <Plus size={16} />
                                    Save
                                </button>

                                {['flashcards', 'roadmap'].includes(active) && (
                                    <button
                                        type="button"
                                        className="ch-btn secondary"
                                        disabled={busy || !draft.trim()}
                                        onClick={() =>
                                            ai(
                                                active === 'flashcards'
                                                    ? 'flashcards'
                                                    : 'roadmap'
                                            )
                                        }
                                    >
                                        <Sparkles size={16} />
                                        Generate with AI
                                    </button>
                                )}
                            </form>

                            {active === 'flashcards' ? (
                                <div className="ch-flash-grid">
                                    {items.map(i => (
                                        <Flash
                                            key={i.id || i._id}
                                            item={i}
                                            remove={remove}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="ch-search">
                                        <Search size={16} />

                                        <input
                                            value={query}
                                            onChange={e =>
                                                setQuery(e.target.value)
                                            }
                                            placeholder="Search…"
                                        />
                                    </div>

                                    <div className="ch-list">
                                        {items.map(i => (
                                            <div key={i.id || i._id}>
                                                <button
                                                    className={`ch-check ${i.status === 'completed'
                                                            ? 'checked'
                                                            : ''
                                                        }`}
                                                    onClick={() => {
                                                        updateItem(
                                                            i.id || i._id,
                                                            {
                                                                status:
                                                                    i.status === 'completed'
                                                                        ? 'active'
                                                                        : 'completed'
                                                            }
                                                        ).then(refresh);
                                                    }}
                                                >
                                                    <Check size={14} />
                                                </button>

                                                <span>
                                                    <b
                                                        className={
                                                            i.status === 'completed'
                                                                ? 'strike'
                                                                : ''
                                                        }
                                                    >
                                                        {i.title}
                                                    </b>

                                                    <small>
                                                        {i.content?.text ||
                                                            i.status}
                                                    </small>
                                                </span>

                                                <button
                                                    className="ch-trash"
                                                    onClick={() =>
                                                        remove(i.id || i._id)
                                                    }
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        {!items.length && (
                                            <p className="ch-empty">
                                                Nothing here yet. Add your first
                                                item above.
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {active === 'roadmap' && (
                                <AI result={result} />
                            )}
                        </>
                    ) : (
                        <>
                            <Heading
                                title={title(active)}
                                desc="Personal workspace."
                            />

                            <div className="ch-panel">
                                <p>
                                    This section is not yet connected in this
                                    release.
                                </p>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="ch-error">
                            {error}
                        </div>
                    )}

                    <footer>
                        AI Career & Learning Hub · Your progress, your pace.
                    </footer>
                </div>
            </main>
        </div>
    );
}

// Page heading
function Heading({ title, desc }) {
    return (
        <div className="ch-page-heading">
            <small>AI CAREER & LEARNING HUB</small>
            <h1>{title}</h1>
            <p>{desc}</p>
        </div>
    );
}

// AI generated content renderer
function AI({ result }) {
    if (!result) return null;

    return (
        <div className="ch-ai">
            <h3>
                {result.title || result.role || 'AI result'}
            </h3>

            {result.summary && (
                <p>{result.summary}</p>
            )}

            {result.sections?.map((s, i) => (
                <section key={i}>
                    <b>{s.heading}</b>

                    <ul>
                        {s.points?.map((p, j) => (
                            <li key={j}>{p}</li>
                        ))}
                    </ul>
                </section>
            ))}

            {result.questions?.map((q, i) => (
                <section key={i}>
                    <b>
                        Q{i + 1}. {q.question}
                    </b>

                    <p>{q.explanation}</p>
                    <small>Answer: {q.answer}</small>
                </section>
            ))}

            {result.cards?.map((c, i) => (
                <section key={i}>
                    <b>{c.front}</b>
                    <p>{c.back}</p>
                </section>
            ))}

            {result.phases?.map((p, i) => (
                <section key={i}>
                    <b>
                        {p.name} · {p.duration}
                    </b>

                    <p>{p.skills?.join(', ')}</p>

                    <ul>
                        {p.tasks?.map((t, j) => (
                            <li key={j}>{t}</li>
                        ))}
                    </ul>
                </section>
            ))}

            {result.ideas?.map((p, i) => (
                <section key={i}>
                    <b>{p.title}</b>
                    <p>{p.problem}</p>
                    <small>{p.stack?.join(', ')}</small>
                </section>
            ))}

            {result.body && (
                <pre>{result.body}</pre>
            )}

            {result.requiredSkills && (
                <p>
                    <b>Required skills:</b>{' '}
                    {result.requiredSkills.join(', ')}
                </p>
            )}

            {result.preparationTips && (
                <ul>
                    {result.preparationTips.map((p, i) => (
                        <li key={i}>{p}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Quiz component
function Quiz({
    result,
    index,
    setIndex,
    answers,
    setAnswers,
    submitted,
    setSubmitted
}) {
    if (!result?.questions?.length) return null;

    const qs = result.questions;
    const q = qs[index];

    const score = qs.filter(
        (x, i) => answers[i] === x.answer
    ).length;

    return (
        <div className="ch-quiz">
            <small>
                QUESTION {index + 1} OF {qs.length}
            </small>

            <div className="ch-progress">
                <i
                    style={{
                        width: `${((index + 1) / qs.length) * 100}%`
                    }}
                />
            </div>

            {!submitted ? (
                <>
                    <h3>{q.question}</h3>

                    {(q.options || ['True', 'False']).map((o, i) => (
                        <button
                            className={`ch-option ${answers[index] === o ? 'selected' : ''
                                }`}
                            key={i}
                            onClick={() =>
                                setAnswers(a => ({
                                    ...a,
                                    [index]: o
                                }))
                            }
                        >
                            {o}
                        </button>
                    ))}

                    <div className="ch-actions">
                        <button
                            className="ch-btn secondary"
                            disabled={!index}
                            onClick={() => setIndex(index - 1)}
                        >
                            Previous
                        </button>

                        <button
                            className="ch-btn"
                            onClick={() =>
                                index === qs.length - 1
                                    ? setSubmitted(true)
                                    : setIndex(index + 1)
                            }
                        >
                            {index === qs.length - 1
                                ? 'Submit'
                                : 'Next'}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <h3>
                        Score: {score}/{qs.length}
                    </h3>

                    {qs.map((x, i) => (
                        <section key={i}>
                            <b>{x.question}</b>

                            <p>
                                Your answer: {answers[i] || 'Skipped'}
                                {' · '}
                                Correct: {x.answer}
                            </p>

                            <small>{x.explanation}</small>
                        </section>
                    ))}

                    <button
                        className="ch-btn"
                        onClick={() => {
                            setIndex(0);
                            setAnswers({});
                            setSubmitted(false);
                        }}
                    >
                        Retake quiz
                    </button>
                </>
            )}
        </div>
    );
}

// Flashcard component
function Flash({ item, remove }) {
    const [flip, setFlip] = useState(false);

    return (
        <button
            className="ch-flash"
            onClick={() => setFlip(!flip)}
        >
            <small>
                {flip ? 'ANSWER' : 'QUESTION'}
            </small>

            <b>
                {flip
                    ? item.content?.back
                    : item.content?.front || item.title}
            </b>

            <em>Click to flip</em>

            <i
                onClick={e => {
                    e.stopPropagation();
                    remove(item.id || item._id);
                }}
            >
                <Trash2 size={14} />
            </i>
        </button>
    );
}

// Resume profile component
function ResumeDraft() {
    const [v, setV] = useState({
        name: '',
        role: '',
        summary: '',
        skills: '',
        education: '',
        projects: ''
    });

    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        let live = true;

        listItems('resume')
            .then(d => {
                const item = d.items?.[0];

                if (live && item?.content) {
                    setV(x => ({
                        ...x,
                        ...item.content
                    }));
                }
            })
            .catch(() => { });

        return () => {
            live = false;
        };
    }, []);

    const fields = {
        name: 'Full name',
        role: 'Target role',
        summary: 'Professional summary',
        skills: 'Skills',
        education: 'Education',
        projects: 'Projects'
    };

    return (
        <div className="ch-panel ch-resume">
            {Object.entries(fields).map(([k, l]) => (
                <label key={k}>
                    {l}

                    {['summary', 'projects'].includes(k) ? (
                        <textarea
                            value={v[k]}
                            onChange={e =>
                                setV(x => ({
                                    ...x,
                                    [k]: e.target.value
                                }))
                            }
                        />
                    ) : (
                        <input
                            value={v[k]}
                            onChange={e =>
                                setV(x => ({
                                    ...x,
                                    [k]: e.target.value
                                }))
                            }
                        />
                    )}
                </label>
            ))}

            <button
                className="ch-btn"
                disabled={busy || !v.name.trim()}
                onClick={async () => {
                    setBusy(true);
                    setMessage('');

                    try {
                        const d = await listItems('resume');

                        const payload = {
                            type: 'resume',
                            title: v.name.trim() + ' resume profile',
                            content: v
                        };

                        if (d.items?.[0]) {
                            await updateItem(
                                d.items[0].id || d.items[0]._id,
                                payload
                            );
                        } else {
                            await createItem(payload);
                        }

                        setMessage(
                            'Resume profile saved to your account.'
                        );
                    } catch (e) {
                        setMessage(
                            e.response?.data?.message ||
                            'Could not save resume profile.'
                        );
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                {busy ? 'Saving…' : 'Save resume profile'}
            </button>

            {message && (
                <small>{message}</small>
            )}
        </div>
    );
}
