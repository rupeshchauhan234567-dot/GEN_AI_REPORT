
import { useEffect, useState } from "react";
import {
  BrainCircuit,
  FileText,
  Search,
  Target,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  LoaderCircle
} from "lucide-react";

const steps = [
  {
    title: "Reading your resume",
    description: "Extracting your skills and experience",
    icon: FileText
  },
  {
    title: "Analyzing your skills",
    description: "Understanding your technical strengths",
    icon: Search
  },
  {
    title: "Matching job requirements",
    description: "Comparing your profile with the role",
    icon: Target
  },
  {
    title: "Generating interview questions",
    description: "Preparing personalized questions and answers",
    icon: MessageSquare
  },
  {
    title: "Creating preparation plan",
    description: "Building your personalized learning roadmap",
    icon: CheckCircle2
  }
];

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Visual progress only; actual completion is controlled by the API.
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return Math.min(prev + Math.random() * 3 + 1, 95);
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const activeStep = Math.min(
    Math.floor((progress / 100) * steps.length),
    steps.length - 1
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b18] text-white flex items-center justify-center px-5 py-12">

      {/* Background effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />

      <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)",
          backgroundSize: "45px 45px"
        }}
      />

      <div className="relative z-10 w-full max-w-2xl">

        {/* Brand */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-purple-400/20 bg-purple-400/10">
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span className="text-sm font-medium tracking-wide text-purple-200">
              AI INTERVIEW ANALYZER
            </span>
          </div>
        </div>

        {/* AI Orb */}
        <div className="flex justify-center mb-9">
          <div className="relative w-44 h-44 flex items-center justify-center">

            <div className="absolute inset-0 rounded-full border border-purple-400/30 animate-spin [animation-duration:12s]" />

            <div className="absolute inset-3 rounded-full border border-blue-400/30 border-dashed animate-spin [animation-duration:18s] [animation-direction:reverse]" />

            <div className="absolute inset-7 rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 blur-2xl opacity-60 animate-pulse" />

            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 shadow-[0_0_60px_rgba(139,92,246,0.55)]">
              <BrainCircuit className="w-12 h-12 text-white animate-pulse" />
            </div>

            <div className="absolute top-5 right-7 w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_15px_#67e8f9] animate-ping" />
            <div className="absolute bottom-7 left-5 w-2 h-2 rounded-full bg-purple-300 shadow-[0_0_15px_#c4b5fd]" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Your career,{" "}
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
              powered by AI.
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base">
            We're analyzing your profile to create your personalized
            interview preparation report.
          </p>
        </div>

        {/* Progress Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 sm:p-7 shadow-2xl">

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">
              Analysis in progress
            </span>

            <span className="text-lg font-bold text-purple-300 tabular-nums">
              {Math.floor(progress)}%
            </span>
          </div>

          <div
            className="w-full h-2 rounded-full bg-white/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.floor(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Visual analysis progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-400 to-blue-400 transition-all duration-500 shadow-[0_0_15px_rgba(168,85,247,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="mt-7 space-y-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const completed = index < activeStep;
              const active = index === activeStep;

              return (
                <div key={step.title} className="flex items-center gap-4">

                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                    completed
                      ? "bg-green-400/10 border-green-400/30 text-green-400"
                      : active
                      ? "bg-purple-500/20 border-purple-400/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                      : "bg-white/5 border-white/10 text-gray-500"
                  }`}>
                    {completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : active ? (
                      <LoaderCircle className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold ${
                      completed
                        ? "text-green-300"
                        : active
                        ? "text-white"
                        : "text-gray-500"
                    }`}>
                      {step.title}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </p>
                  </div>

                  {active && (
                    <span className="text-xs text-purple-300 animate-pulse">
                      Processing
                    </span>
                  )}

                  {completed && (
                    <span className="text-xs text-green-400">
                      Done
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-7">
          <Sparkles className="inline w-3 h-3 mr-1 text-purple-400" />
          Please don't refresh or close this page while your report is being generated.
        </p>

      </div>
    </div>
  );
}
