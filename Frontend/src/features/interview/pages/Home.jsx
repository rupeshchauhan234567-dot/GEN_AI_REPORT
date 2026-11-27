
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  LogOut,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useInterview } from "../hooks/useInterview.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import Loading from "../../../components/Loading.jsx";
import AnimatedNumber from "../../../components/AnimatedNumber.jsx";
import { scrollToTarget, scrollToTop } from "../../../lib/smoothScroll.js";

gsap.registerPlugin(ScrollTrigger);

const EASE = [0.22, 1, 0.36, 1];

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const panelVariants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

const GlassPanel = ({ icon: Icon, title, hint, htmlFor, children }) => (
  <motion.div
    variants={panelVariants}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.15 }}
    whileHover={{ y: -2, transition: { duration: 0.25 } }}
    className="glass rounded-[20px] p-5 sm:p-6"
  >
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f4f1] text-[#087f80]">
        <Icon size={18} strokeWidth={1.8} />
      </span>

      <div className="min-w-0">
        <label
          htmlFor={htmlFor}
          className="block text-[15px] font-semibold tracking-[-0.01em] text-[#203b43]"
        >
          {title}
        </label>
        <p className="mt-0.5 text-xs text-[#718487]">{hint}</p>
      </div>
    </div>

    {children}
  </motion.div>
);

const Home = ({ embedded = false }) => {
  const { loading, generateReport, reports = [], deleteReport } = useInterview();
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();

  const resumeInputRef = useRef(null);
  const rootRef = useRef(null);
  const heroRef = useRef(null);

  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState("");

  const safeReports = useMemo(
    () => (Array.isArray(reports) ? reports : []),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return safeReports;

    return safeReports.filter((item) =>
      String(item.title || "Untitled position")
        .toLowerCase()
        .includes(query)
    );
  }, [safeReports, searchTerm]);

  const averageScore = safeReports.length
    ? Math.round(
        safeReports.reduce(
          (total, item) => total + (Number(item.matchScore) || 0),
          0
        ) / safeReports.length
      )
    : 0;

  useEffect(() => {
    if (!embedded) scrollToTop(true);
  }, [embedded]);

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (loading || !root) return undefined;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = (selector) => gsap.utils.toArray(selector, root);

      gsap.from(q("[data-hero]"), {
        y: 26,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.1,
        delay: 0.05,
      });

      if (heroRef.current) {
        gsap.to(q("[data-hero-orb]"), {
          yPercent: -30,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      q("[data-orb]").forEach((orb) => {
        gsap.to(orb, {
          y: Number(orb.dataset.orb) || 0,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
        });
      });

      q("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true,
          },
        });
      });

      const stats = q("[data-stat]");

      gsap.set(stats, { opacity: 0, y: 30 });

      const batch = ScrollTrigger.batch(stats, {
        start: "top 92%",
        once: true,
        onEnter: (items) =>
          gsap.to(items, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.12,
          }),
      });

      return () => batch.forEach((trigger) => trigger.kill());
    });

    return () => mm.revert();
  }, [loading]);

  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => cancelAnimationFrame(id);
  }, [safeReports.length, filteredReports.length]);

  const acceptFile = (file) => {
    setError("");

    if (!file) {
      setSelectedFile(null);
      return false;
    }

    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");

    if (!isPdf) {
      setError("Please select a PDF file.");
      setSelectedFile(null);
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume size must be 5MB or less.");
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleFileChange = (event) => {
    const accepted = acceptFile(event.target.files?.[0]);

    if (!accepted) event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    setSelectedFile(null);

    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  };

  const handleGenerateReport = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const jd = jobDescription.trim();
    const sd = selfDescription.trim();
    const resumeFile = selectedFile;

    if (!jd) return setError("Please enter the job description.");

    if (jd.length < 30) {
      return setError(
        "Job description must contain at least 30 characters."
      );
    }

    if (jd.length > 20000) {
      return setError("Job description cannot exceed 20,000 characters.");
    }

    if (!resumeFile) {
      return setError("Please upload your resume PDF.");
    }

    if (!sd) {
      return setError("Please enter your self-description.");
    }

    try {
      const data = await generateReport({
        jobDescription: jd,
        selfDescription: sd,
        resumeFile,
      });

      if (data?._id) {
        navigate(`/interview/${data._id}`);
      } else {
        setError("Could not generate the report. Please try again.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const handleDelete = async (event, report) => {
    event.stopPropagation();

    const title = report.title || "this report";

    if (
      !window.confirm(
        `Delete “${title}”? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(report._id);
    setNotice("");

    try {
      await deleteReport(report._id);
      setNotice("Report deleted successfully.");
    } catch (err) {
      setNotice(
        err?.response?.data?.message ||
          "Could not delete the report. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const onLogout = async () => {
    try {
      await handleLogout();
      navigate("/login", { replace: true });
    } catch {
      setNotice("Could not sign out. Please try again.");
    }
  };

  if (loading) return <Loading />;

  const inputClass =
    "w-full rounded-xl border border-[#dfe9e7] bg-white/75 px-4 py-3 text-sm text-[#294147] outline-none transition placeholder:text-[#9aa9a8] focus:border-[#53a99d] focus:bg-white focus:ring-4 focus:ring-[#53a99d]/15";

  const displayName =
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "there";

  const initials = String(displayName).trim().slice(0, 1).toUpperCase();

  return (
    <main
      ref={rootRef}
      className={`relative isolate min-w-0 overflow-x-clip text-[#294147] ${
        embedded
          ? "ch-interview-embed w-full bg-transparent"
          : "min-h-screen bg-gradient-to-b from-[#f1f7f5] via-[#edf4f2] to-[#f5f8f7]"
      }`}
    >
      {!embedded && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div
            data-orb="-140"
            className="absolute -left-24 top-24 h-[360px] w-[360px] rounded-full bg-[#83c9bc]/25 blur-[90px]"
          />
          <div
            data-orb="-220"
            className="absolute -right-20 top-[38%] h-[420px] w-[420px] rounded-full bg-[#a4d8cc]/30 blur-[100px]"
          />
          <div
            data-orb="-100"
            className="absolute -bottom-24 left-1/3 h-[340px] w-[340px] rounded-full bg-[#66aaa0]/15 blur-[90px]"
          />
        </div>
      )}

      {!embedded && (
        <header className="glass-bar sticky top-0 z-30">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-3.5 sm:px-8">
            <button
              type="button"
              onClick={() => scrollToTop()}
              className="flex items-center gap-3 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#203b43] text-white">
                <Sparkles size={19} strokeWidth={1.8} />
              </span>
              <span className="text-[19px] font-bold tracking-[-0.04em]">
                Interview<span className="font-medium text-[#258e87]">AI</span>
              </span>
            </button>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-[#294147]">
                  {displayName}
                </p>
                <p className="text-xs text-[#829394]">Your workspace</p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3f1ed] text-sm font-bold text-[#287c73] ring-1 ring-white/80">
                {initials}
              </span>

              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white/50 px-3 py-2 text-sm font-medium text-[#526b6e] transition hover:border-[#8fc6ba] hover:bg-white/80"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <div
        className={
          embedded
            ? "mx-auto grid w-full max-w-none grid-cols-1 gap-8 px-0 py-2"
            : "mx-auto grid max-w-[1380px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-10 lg:py-10"
        }
      >
        <div className="min-w-0 space-y-8">
          <section
            ref={heroRef}
            className="glass-hero relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#203b43] via-[#315c60] to-[#477b75] px-6 py-7 text-white sm:px-9 sm:py-9"
          >
            <div
              data-hero-orb
              className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10"
            />
            <div
              data-hero-orb
              className="pointer-events-none absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10"
            />

            <div className="relative max-w-2xl">
              <p data-hero className="mb-3 text-sm font-medium text-[#b9ddd5]">
                Interview preparation
              </p>

              <h1
                data-hero
                className="max-w-xl text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[36px]"
              >
                A little preparation goes a long way.
              </h1>

              <p
                data-hero
                className="mt-3 max-w-xl text-sm leading-6 text-[#d0e1de]"
              >
                Build a focused interview plan from the role you want and the
                experience you already have.
              </p>

              <button
                data-hero
                type="button"
                onClick={() =>
                  scrollToTarget("#generate", { offset: -96 })
                }
                className="group mt-6 inline-flex items-center gap-2 rounded-lg bg-[#dff2ec] px-4 py-2.5 text-sm font-semibold text-[#244b4b] transition hover:bg-white"
              >
                Create a report
                <ArrowUpRight
                  size={16}
                  className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>
            </div>

            <div
              data-hero-orb
              className="absolute bottom-7 right-9 hidden h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-sm lg:flex"
            >
              <BriefcaseBusiness
                size={35}
                strokeWidth={1.2}
                className="text-[#c9e5dd]"
              />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div data-stat className="glass rounded-2xl px-5 py-4">
              <p className="text-xs font-medium text-[#829394]">
                Reports created
              </p>
              <p className="mt-2 text-[27px] font-semibold tracking-tight text-[#294147]">
                <AnimatedNumber value={safeReports.length} duration={1} />
              </p>
            </div>

            <div data-stat className="glass rounded-2xl px-5 py-4">
              <p className="text-xs font-medium text-[#829394]">
                Average match score
              </p>
              <p className="mt-2 text-[27px] font-semibold tracking-tight text-[#294147]">
                <AnimatedNumber value={averageScore} />
                <span className="ml-0.5 text-base font-medium text-[#829394]">
                  %
                </span>
              </p>
            </div>

            <div data-stat className="glass rounded-2xl px-5 py-4">
              <p className="text-xs font-medium text-[#829394]">
                Latest report
              </p>
              <p className="mt-2 truncate text-[17px] font-semibold text-[#294147]">
                {safeReports[0]?.title || "Not created yet"}
              </p>
            </div>
          </section>

          <section id="generate" className="scroll-mt-24">
            <div
              data-reveal
              className="mb-5 flex items-start justify-between gap-4 px-1"
            >
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#294147]">
                  Create an interview report
                </h2>
                <p className="mt-1.5 text-sm text-[#829394]">
                  Share the role and your background to get a tailored
                  preparation plan.
                </p>
              </div>

              <span className="glass hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#258e87] sm:flex">
                <FileText size={19} />
              </span>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              <GlassPanel
                icon={BriefcaseBusiness}
                title="Job description"
                hint="Paste the posting for the role you are targeting."
                htmlFor="jobDescription"
              >
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={5}
                  maxLength={20000}
                  placeholder="Paste the job description here..."
                  className={`${inputClass} resize-y`}
                />
                <p className="mt-2 text-right text-xs text-[#91a2a1]">
                  {jobDescription.length.toLocaleString()} / 20,000
                </p>
              </GlassPanel>

              <GlassPanel
                icon={UploadCloud}
                title="Your resume"
                hint="PDF format, up to 5MB."
                htmlFor="resume"
              >
                <motion.label
                  htmlFor="resume"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragging(false);
                  }}
                  onDrop={handleDrop}
                  animate={{ scale: dragging ? 1.015 : 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 26,
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors duration-300 ${
                    dragging
                      ? "border-[#258e87] bg-[#258e87]/10"
                      : "border-[#a9d1c8] bg-white/40 hover:border-[#258e87] hover:bg-white/65"
                  }`}
                >
                  <input
                    ref={resumeInputRef}
                    id="resume"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                  />

                  <motion.span
                    animate={
                      dragging
                        ? { y: -8, scale: 1.12 }
                        : { y: [0, -5, 0], scale: 1 }
                    }
                    transition={
                      dragging
                        ? {
                            type: "spring",
                            stiffness: 300,
                            damping: 16,
                          }
                        : {
                            duration: 3.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }
                    }
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f4f1] text-[#258e87]"
                  >
                    <UploadCloud size={26} strokeWidth={1.6} />
                  </motion.span>

                  <span>
                    <span className="block text-sm font-semibold text-[#294147]">
                      {dragging
                        ? "Drop your PDF to upload"
                        : selectedFile
                          ? "Choose a different file"
                          : "Drag your resume here"}
                    </span>
                    <span className="mt-1 block text-xs text-[#829394]">
                      or{" "}
                      <span className="font-semibold text-[#258e87] underline underline-offset-2">
                        browse files
                      </span>{" "}
                      from your device
                    </span>
                  </span>
                </motion.label>

                <AnimatePresence initial={false}>
                  {selectedFile && (
                    <motion.div
                      key={selectedFile.name}
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.97 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                      className="mt-3 flex items-center gap-3 rounded-xl border border-[#d6e9df] bg-[#f3fbf7]/80 px-3.5 py-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e5f4f1] text-[#258e87]">
                        <FileText size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#294147]">
                          {selectedFile.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6f9990]">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·
                          Ready to upload
                        </p>
                      </div>

                      <CheckCircle2 size={18} className="text-[#39977c]" />

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={clearFile}
                        aria-label="Remove selected resume"
                        className="rounded-lg p-2 text-[#829394] transition hover:bg-white hover:text-[#294147]"
                      >
                        <X size={16} />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassPanel>

              <GlassPanel
                icon={User}
                title="A little about you"
                hint="Skills, projects and what you bring to the role."
                htmlFor="selfDescription"
              >
                <textarea
                  id="selfDescription"
                  value={selfDescription}
                  onChange={(e) => setSelfDescription(e.target.value)}
                  rows={5}
                  placeholder="Mention your skills, experience, projects and what you bring to the role..."
                  className={`${inputClass} resize-y`}
                />
              </GlassPanel>

              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl border border-[#f0d2d2] bg-[#fff7f7]/90 px-4 py-3 text-sm text-[#a64040]"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex flex-col-reverse gap-3 px-1 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#829394]">
                  Your report will be saved in your history.
                </p>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#247e79] to-[#329d91] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(36,126,121,0.65)] transition-shadow hover:shadow-[0_14px_32px_-8px_rgba(50,157,145,0.7)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Generate report
                  <ArrowUpRight
                    size={16}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </motion.button>
              </div>
            </form>
          </section>

          <section id="reports" data-reveal className="scroll-mt-24">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#258e87]">
                  Your previous work
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#294147]">
                  Report history{" "}
                  <span className="ml-1 text-sm font-medium text-[#91a2a1]">
                    ({safeReports.length})
                  </span>
                </h2>
              </div>

              <div className="relative w-full sm:max-w-[260px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#91a2a1]"
                />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find a report..."
                  aria-label="Search reports"
                  className={`${inputClass} py-2.5 pl-10`}
                />
              </div>
            </div>

            <AnimatePresence>
              {notice && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    marginBottom: 12,
                  }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden rounded-lg border border-[#d9e9dc] bg-[#f5fbf5]/90 px-4 py-2.5 text-sm text-[#3e744b]"
                >
                  {notice}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="glass overflow-hidden rounded-[20px]">
              {filteredReports.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f4f1] text-[#258e87]">
                    <FileText size={21} />
                  </span>

                  <p className="mt-4 text-sm font-semibold text-[#294147]">
                    {safeReports.length
                      ? "No reports found"
                      : "Your history is empty for now"}
                  </p>

                  <p className="mt-1 text-sm text-[#829394]">
                    {safeReports.length
                      ? "Try another title or keyword."
                      : "Reports you create will show up here."}
                  </p>
                </div>
              ) : (
                <ul className="relative divide-y divide-[#e8efed]">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredReports.map((report) => (
                      <motion.li
                        key={report._id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/interview/${report._id}`)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f4f1] text-[#258e87]">
                            <FileText size={18} />
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#294147] transition group-hover:text-[#258e87]">
                              {report.title || "Untitled position"}
                            </span>

                            <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#91a2a1]">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={12} />
                                {formatDate(report.createdAt)}
                              </span>
                              <span>·</span>
                              <span>
                                Match score: {Number(report.matchScore) || 0}%
                              </span>
                            </span>
                          </span>
                        </button>

                        <div className="flex shrink-0 items-center gap-2 pl-[54px] sm:pl-0">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/interview/${report._id}`)
                            }
                            className="rounded-lg border border-[#dfe9e7] bg-white/60 px-3 py-2 text-xs font-semibold text-[#526b6e] transition hover:border-[#8fc6ba] hover:bg-white"
                          >
                            View report
                          </button>

                          <button
                            type="button"
                            onClick={(event) =>
                              handleDelete(event, report)
                            }
                            disabled={deletingId === report._id}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#a45d63] transition hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${report.title || "report"}`}
                          >
                            <Trash2 size={14} />
                            {deletingId === report._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </section>
        </div>

        {!embedded && (
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section data-reveal className="glass rounded-[20px] p-5">
              <p className="text-sm font-medium text-[#258e87]">
                A useful reminder
              </p>

              <h3 className="mt-2 text-lg font-semibold leading-snug tracking-[-0.02em] text-[#294147]">
                Good interviews start before the interview.
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#718487]">
                Use your report to spot gaps, practise clear answers and make
                your experience easy to explain.
              </p>

              <div className="mt-4 flex items-center gap-2 border-t border-[#e7efed] pt-4 text-xs font-medium text-[#526b6e]">
                <CheckCircle2 size={15} className="text-[#39977c]" />
                One step at a time.
              </div>
            </section>

            <section
              data-reveal
              className="glass rounded-[20px] bg-[#e5f2ee]/60 p-5"
            >
              <p className="text-sm font-medium text-[#258e87]">Quick tip</p>
              <p className="mt-2 text-sm leading-6 text-[#526b6e]">
                Add real project examples and measurable results to your
                self-description. Specific details help make your preparation
                more relevant.
              </p>
            </section>
          </aside>
        )}
      </div>

      {!embedded && (
        <footer className="glass-bar border-b-0 border-t border-white/70 py-5 text-center text-xs text-[#829394]">
          © {new Date().getFullYear()} InterviewAI
        </footer>
      )}
    </main>
  );
};

export default Home;
