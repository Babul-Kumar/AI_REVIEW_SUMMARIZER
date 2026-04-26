/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  History,
  Info,
  Layers3,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  XCircle,
} from "lucide-react";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { ThemeToggle } from "./components/ThemeToggle";
import { analyzeReview, type AnalysisResult } from "./services/geminiService";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 220, damping: 22 },
  },
};

const EXAMPLES = [
  {
    label: "Detailed Review",
    text: "I bought this camera last week. The image quality is stunning and the autofocus is remarkably fast. However, the battery life is quite disappointing, barely lasting 3 hours of active use. Also, the build quality feels a bit plasticky given the price point. Still, for beginners, it is a great entry-level device.",
  },
  {
    label: "Mixed Review",
    text: "These headphones deliver strong sound quality and impressive battery life, but the Bluetooth connection drops during calls. The noise cancellation is weaker than my Sony headphones, although they stay comfortable for long listening sessions.",
  },
  {
    label: "Out of Scope",
    text: "How do I implement a sorting algorithm in Python? I am struggling with the time complexity of bubble sort vs quicksort.",
  },
];

function getScoreAppearance(score: number) {
  if (score >= 4) {
    return {
      cardClass: "border-emerald-400/30",
      textClass: "text-emerald-600 dark:text-emerald-300",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200",
      label: "Strong",
      helper: "strong overall signal",
    };
  }

  if (score >= 3) {
    return {
      cardClass: "border-amber-400/30",
      textClass: "text-amber-600 dark:text-amber-300",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200",
      label: "Mixed",
      helper: "balanced with tradeoffs",
    };
  }

  return {
    cardClass: "border-rose-400/30",
    textClass: "text-rose-600 dark:text-rose-300",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200",
    label: "Risky",
    helper: "issues dominate the review",
  };
}

function getQualityAppearance(quality: AnalysisResult["review_quality"]) {
  switch (quality) {
    case "high":
      return {
        label: "High",
        helper: "detailed enough for a stronger read",
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200",
      };
    case "low":
      return {
        label: "Low",
        helper: "limited detail may reduce certainty",
        badgeClass: "bg-rose-500/15 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200",
      };
    default:
      return {
        label: "Medium",
        helper: "useful, but not deeply detailed",
        badgeClass: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200",
      };
  }
}

function AnalysisSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <section className="ui-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-28 rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="h-6 w-full rounded-xl bg-slate-200/80 dark:bg-white/10" />
          <div className="h-6 w-5/6 rounded-xl bg-slate-200/70 dark:bg-white/8" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={`metric-skeleton-${index}`} className="ui-card p-5">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-24 rounded-full bg-slate-200/80 dark:bg-white/10" />
              <div className="h-10 w-20 rounded-xl bg-slate-200/80 dark:bg-white/10" />
              <div className="h-3 w-28 rounded-full bg-slate-200/60 dark:bg-white/8" />
            </div>
          </section>
        ))}
      </div>

      <section className="ui-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded-full bg-slate-200/80 dark:bg-white/10" />
          <div className="h-5 w-full rounded-xl bg-slate-200/75 dark:bg-white/10" />
          <div className="h-5 w-11/12 rounded-xl bg-slate-200/60 dark:bg-white/8" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <section key={`list-skeleton-${index}`} className="ui-card p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-24 rounded-full bg-slate-200/80 dark:bg-white/10" />
              <div className="h-3 w-full rounded-full bg-slate-200/70 dark:bg-white/8" />
              <div className="h-3 w-5/6 rounded-full bg-slate-200/70 dark:bg-white/8" />
              <div className="h-3 w-4/6 rounded-full bg-slate-200/70 dark:bg-white/8" />
            </div>
          </section>
        ))}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [reviewText, setReviewText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const serialNumber = useMemo(
    () => Math.random().toString(36).slice(2, 10).toUpperCase(),
    []
  );

  const observationItems = useMemo(() => {
    if (!result) {
      return [];
    }

    const items =
      result.observations.length > 0
        ? result.observations
        : [
            ...result.neutralPoints,
            ...result.comparisons.map((comparison) => `Compared with ${comparison}`),
          ];

    if (items.length < 2 && result.cons.length > 0) {
      items.push(`Primary drawback: ${result.cons[0]}`);
    }

    if (items.length < 3 && result.features.length > 0) {
      items.push(`Feature focus: ${result.features.slice(0, 3).join(", ")}`);
    }

    return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
  }, [result]);

  const bestForItems = useMemo(() => {
    if (!result) {
      return [];
    }

    if (result.bestFor.length > 0) {
      return result.bestFor;
    }

    return result.features.slice(0, 3);
  }, [result]);

  const notIdealForItems = useMemo(() => {
    if (!result) {
      return [];
    }

    if (result.notIdealFor.length > 0) {
      return result.notIdealFor;
    }

    return result.cons.slice(0, 3);
  }, [result]);

  const featureGroups = useMemo(() => {
    if (!result) {
      return [];
    }

    if (result.featureGroups.length > 0) {
      return result.featureGroups;
    }

    return result.features.length > 0
      ? [{ category: "Highlights", items: result.features }]
      : [];
  }, [result]);

  const majorIssues = useMemo(() => {
    if (!result) {
      return [];
    }

    if (result.majorIssues.length > 0) {
      return result.majorIssues;
    }

    return result.cons.slice(0, 1);
  }, [result]);

  const minorIssues = useMemo(() => {
    if (!result) {
      return [];
    }

    if (result.minorIssues.length > 0) {
      return result.minorIssues;
    }

    return result.cons.slice(1);
  }, [result]);

  const sentimentData = [
    {
      label: "Positive",
      value: result?.sentiment?.positive ?? 0,
      barClass: "bg-emerald-400",
      trackClass: "bg-emerald-500/20",
      textClass: "text-emerald-600 dark:text-emerald-300",
    },
    {
      label: "Neutral",
      value: result?.sentiment?.neutral ?? 0,
      barClass: "bg-slate-400",
      trackClass: "bg-slate-400/25",
      textClass: "text-slate-600 dark:text-gray-300",
    },
    {
      label: "Negative",
      value: result?.sentiment?.negative ?? 0,
      barClass: "bg-rose-400",
      trackClass: "bg-rose-500/20",
      textClass: "text-rose-600 dark:text-gray-300",
    },
  ];

  const scoreAppearance = getScoreAppearance(result?.score ?? 0);
  const qualityAppearance = getQualityAppearance(result?.review_quality);

  const handleAnalyze = async (text: string = reviewText) => {
    const nextText = text.trim();

    if (!nextText) {
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setReviewText(nextText);

    try {
      const data = await analyzeReview(nextText);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setReviewText("");
    setResult(null);
    setError(null);

    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      document.getElementById("review-input")?.focus();
    }, 300);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen transition-colors duration-500">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl transition-colors duration-500 dark:border-white/10 dark:bg-slate-950/45">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/40 bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700 transition-colors dark:border-sky-300/25 dark:from-cyan-500/20 dark:to-violet-500/25 dark:text-cyan-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                  ReviewEngine AI
                </h1>
                <p className="text-[11px] font-medium text-slate-500 dark:text-gray-300">
                  Product review intelligence at SaaS speed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 dark:text-gray-300 sm:flex">
                <a className="transition-colors hover:text-sky-600 dark:hover:text-cyan-300" href="#">
                  Docs
                </a>
                <a className="transition-colors hover:text-sky-600 dark:hover:text-cyan-300" href="#">
                  API Keys
                </a>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-7">
              <motion.section
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ui-card ui-card-primary overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/45 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white">
                    <MessageSquare className="h-4 w-4" />
                    <span>Review Input</span>
                  </div>
                  {reviewText && (
                    <button
                      type="button"
                      onClick={() => setReviewText("")}
                      disabled={isAnalyzing}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-rose-300"
                      title="Clear text"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-5">
                  <textarea
                    id="review-input"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    disabled={!!result || isAnalyzing}
                    placeholder="Paste product review text here..."
                    className="ui-input custom-scrollbar h-56 w-full resize-none p-4 text-base leading-relaxed placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-75 dark:placeholder:text-gray-400"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/70 bg-white/45 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
                    {reviewText.length} characters
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAnalyze()}
                    disabled={isAnalyzing || !reviewText.trim()}
                    className="ui-button inline-flex items-center gap-2 px-6 py-2.5 text-sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Analyze Review
                      </>
                    )}
                  </button>
                </div>
              </motion.section>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm dark:text-rose-200"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p className="font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {isAnalyzing && <AnalysisSkeleton />}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {!isAnalyzing && result && (
                  <motion.div
                    key={reviewText}
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-5"
                  >
                    {result.out_of_scope ? (
                      <motion.section
                        variants={itemVariants}
                        className="ui-card rounded-2xl border-amber-400/25 bg-amber-400/10 p-6 text-center"
                      >
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-300/30 text-amber-700 dark:text-amber-200">
                          <Info className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">
                          Out of Scope Detected
                        </h3>
                        <p className="mt-2 text-sm font-medium text-amber-700/90 dark:text-amber-100/85">
                          This input does not appear to be a product review.
                        </p>
                        <p className="mt-1 text-sm text-amber-700/85 dark:text-amber-100/80">
                          Detected category:{" "}
                          <span className="font-bold">
                            {result.detected_category ?? "Uncategorized"}
                          </span>
                        </p>
                        <p className="mt-4 text-sm text-amber-700/85 dark:text-amber-100/80">
                          {result.aiInsight}
                        </p>
                      </motion.section>
                    ) : (
                      <>
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                          <motion.section variants={itemVariants} className="ui-card p-6">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-sky-100/75 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:border-cyan-300/25 dark:bg-cyan-400/10 dark:text-cyan-200">
                              <Sparkles className="h-3.5 w-3.5" />
                              Executive Summary
                            </div>
                            <p className="mt-3 border-l-2 border-sky-400/60 pl-4 text-base leading-relaxed text-slate-700 dark:border-cyan-300/50 dark:text-gray-300">
                              {result.summary}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                              {result.detected_category && (
                                <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-gray-200">
                                  Category: {result.detected_category}
                                </span>
                              )}
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${qualityAppearance.badgeClass}`}
                              >
                                Review Quality: {qualityAppearance.label}
                              </span>
                            </div>
                          </motion.section>

                          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                            <motion.div
                              variants={itemVariants}
                              className={`ui-card flex flex-col items-center justify-center p-5 text-center ${scoreAppearance.cardClass}`}
                            >
                              <div className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-300">
                                <Star className="h-3.5 w-3.5 text-amber-400" />
                                Score
                              </div>
                              <div className={`text-4xl font-black ${scoreAppearance.textClass}`}>
                                {result.score?.toFixed(1) ?? "0.0"}
                              </div>
                              <span
                                className={`mt-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${scoreAppearance.badgeClass}`}
                              >
                                {scoreAppearance.label}
                              </span>
                              <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                                {scoreAppearance.helper}
                              </div>
                            </motion.div>

                            <motion.div
                              variants={itemVariants}
                              className="ui-card flex flex-col items-center justify-center p-5 text-center"
                            >
                              <div className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-300">
                                <Target className="h-3.5 w-3.5 text-sky-400" />
                                Confidence
                              </div>
                              <div className="text-4xl font-black text-slate-900 dark:text-white">
                                {result.confidence ?? 0}%
                              </div>
                              <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                                based on review depth and extraction coverage
                              </div>
                            </motion.div>

                            <motion.div
                              variants={itemVariants}
                              className="ui-card flex flex-col items-center justify-center p-5 text-center"
                            >
                              <div className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-300">
                                <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                                Review Quality
                              </div>
                              <div className="text-3xl font-black text-slate-900 dark:text-white">
                                {qualityAppearance.label}
                              </div>
                              <div className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                                {qualityAppearance.helper}
                              </div>
                            </motion.div>
                          </div>
                        </div>

                        <motion.section variants={itemVariants} className="ui-card overflow-hidden">
                          <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/45 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white">
                              <BrainCircuit className="h-4 w-4 text-sky-500 dark:text-cyan-300" />
                              AI Insight
                            </div>
                            <span className="rounded-full bg-sky-100/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                              action-oriented
                            </span>
                          </div>
                          <div className="p-6">
                            <p className="text-base leading-relaxed text-slate-700 dark:text-gray-300">
                              {result.aiInsight}
                            </p>
                          </div>
                        </motion.section>

                        <div className="grid gap-4 md:grid-cols-2">
                          <motion.section
                            variants={itemVariants}
                            className="ui-card overflow-hidden border-emerald-400/25"
                          >
                            <div className="flex items-center gap-2 border-b border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-200">
                              <Target className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Best For
                              </span>
                            </div>
                            <ul className="space-y-3 p-4">
                              {bestForItems.length > 0 ? (
                                bestForItems.map((item, index) => (
                                  <li
                                    key={`best-for-${index}`}
                                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-gray-300"
                                  >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500 dark:text-emerald-300" />
                                    <span>{item}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-sm italic text-slate-500 dark:text-gray-400">
                                  No strong use-case recommendation detected.
                                </li>
                              )}
                            </ul>
                          </motion.section>

                          <motion.section
                            variants={itemVariants}
                            className="ui-card overflow-hidden border-rose-400/25"
                          >
                            <div className="flex items-center gap-2 border-b border-rose-500/25 bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-200">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Not Ideal For
                              </span>
                            </div>
                            <ul className="space-y-3 p-4">
                              {notIdealForItems.length > 0 ? (
                                notIdealForItems.map((item, index) => (
                                  <li
                                    key={`not-ideal-${index}`}
                                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-gray-300"
                                  >
                                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500 dark:text-rose-300" />
                                    <span>{item}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-sm italic text-slate-500 dark:text-gray-400">
                                  No clear cautionary use-case detected.
                                </li>
                              )}
                            </ul>
                          </motion.section>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <motion.section
                            variants={itemVariants}
                            className="ui-card overflow-hidden border-emerald-400/25"
                          >
                            <div className="flex items-center gap-2 border-b border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-200">
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Positive Aspects
                              </span>
                            </div>
                            <ul className="space-y-3 p-4">
                              {result.pros.length > 0 ? (
                                result.pros.map((pro, index) => (
                                  <li
                                    key={`pro-${index}`}
                                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-gray-300"
                                  >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500 dark:text-emerald-300" />
                                    <span>{pro}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-sm italic text-slate-500 dark:text-gray-400">
                                  No significant positives detected.
                                </li>
                              )}
                            </ul>
                          </motion.section>

                          <motion.section
                            variants={itemVariants}
                            className="ui-card overflow-hidden border-rose-400/25"
                          >
                            <div className="flex items-center gap-2 border-b border-rose-500/25 bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-200">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Issue Severity
                              </span>
                            </div>
                            <div className="space-y-5 p-4">
                              <div>
                                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-200">
                                  Major Issues
                                </p>
                                <ul className="space-y-3">
                                  {majorIssues.length > 0 ? (
                                    majorIssues.map((issue, index) => (
                                      <li
                                        key={`major-issue-${index}`}
                                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-gray-300"
                                      >
                                        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500 dark:text-rose-300" />
                                        <span>{issue}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-sm italic text-slate-500 dark:text-gray-400">
                                      No major issues identified.
                                    </li>
                                  )}
                                </ul>
                              </div>

                              <div className="border-t border-slate-200/70 pt-4 dark:border-white/10">
                                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-200">
                                  Minor Issues
                                </p>
                                <ul className="space-y-3">
                                  {minorIssues.length > 0 ? (
                                    minorIssues.map((issue, index) => (
                                      <li
                                        key={`minor-issue-${index}`}
                                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-gray-300"
                                      >
                                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400 dark:bg-amber-300" />
                                        <span>{issue}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-sm italic text-slate-500 dark:text-gray-400">
                                      No minor issues identified.
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </motion.section>

                          <motion.section
                            variants={itemVariants}
                            className="ui-card overflow-hidden border-violet-400/25"
                          >
                            <div className="flex items-center gap-2 border-b border-violet-500/25 bg-violet-500/10 px-4 py-3 text-violet-700 dark:text-violet-200">
                              <Layers3 className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Key Features
                              </span>
                            </div>
                            <div className="min-h-[188px] space-y-4 p-4">
                              {featureGroups.length > 0 ? (
                                featureGroups.map((group, index) => (
                                  <div key={`feature-group-${index}`} className="space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-200">
                                      {group.category}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {group.items.map((item, itemIndex) => (
                                        <span
                                          key={`feature-${index}-${itemIndex}`}
                                          className="inline-flex h-fit items-center rounded-full border border-violet-300/35 bg-violet-100/80 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-300/20 dark:bg-violet-400/10 dark:text-violet-200"
                                        >
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm italic text-slate-500 dark:text-gray-400">
                                  No clear feature mentions detected.
                                </p>
                              )}
                            </div>
                          </motion.section>

                          <motion.section
                            variants={itemVariants}
                            className="ui-card overflow-hidden border-sky-400/25"
                          >
                            <div className="flex items-center gap-2 border-b border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sky-700 dark:text-sky-200">
                              <Info className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Observations
                              </span>
                            </div>
                            <ul className="space-y-3 p-4">
                              {observationItems.length > 0 ? (
                                observationItems.map((point, index) => (
                                  <li
                                    key={`observation-${index}`}
                                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-gray-300"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(59,130,246,0.7)] dark:bg-sky-300" />
                                    <span>{point}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-sm italic text-slate-500 dark:text-gray-400">
                                  No additional observations detected.
                                </li>
                              )}
                            </ul>
                          </motion.section>
                        </div>

                        <motion.section variants={itemVariants} className="ui-card p-6">
                          <div className="mb-5 flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                              <BarChart3 className="h-4 w-4" />
                              Sentiment Distribution
                            </div>
                            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-gray-300">
                              Evidence Total: {result.sentiment?.total ?? 0}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {sentimentData.map((item) => (
                              <div key={item.label} className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                                  <span className={item.textClass}>{item.label}</span>
                                  <span className="text-slate-600 dark:text-gray-300">
                                    {item.value}%
                                  </span>
                                </div>
                                <div className={`h-2.5 overflow-hidden rounded-full ${item.trackClass}`}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.value}%` }}
                                    transition={{
                                      duration: 1,
                                      ease: [0.16, 1, 0.3, 1],
                                      delay: 0.15,
                                    }}
                                    className={`h-full ${item.barClass}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.section>
                      </>
                    )}

                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:brightness-110 active:scale-95"
                      >
                        Analyze Another Review
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-5"
            >
              <section className="ui-card ui-card-side p-5">
                <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                  <History className="h-4 w-4" />
                  Quick Examples
                </div>
                <div className="space-y-3">
                  {EXAMPLES.map((example, index) => (
                    <button
                      key={`example-${index}`}
                      type="button"
                      onClick={() => handleAnalyze(example.text)}
                      disabled={isAnalyzing}
                      className="ui-example-button group"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-white">
                          {example.label}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-sky-500 dark:text-gray-400 dark:group-hover:text-cyan-300" />
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-gray-300">
                        {example.text}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="ui-card p-5">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                  <BrainCircuit className="h-4 w-4" />
                  What Improved
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
                  <p>Sharper summaries using strengths, issues, and comparisons.</p>
                  <p>Confidence capped below 100 for more believable outputs.</p>
                  <p>Observations, use-case recommendations, and review quality are now surfaced in the UI.</p>
                </div>
              </section>

              <section className="flex flex-col items-center gap-1.5 py-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm dark:bg-white/5 dark:text-gray-300">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-300" />
                  Enterprise Ready
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-gray-400">
                  All Copyright Reserved 2026 
                </p>
                <p className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-[10px] font-semibold tracking-wider text-white shadow-[0_0_14px_rgba(99,102,241,0.45)]">
                  developed by BotBros(Babul,Harsh&Apoorv)
                </p>
              </section>
            </motion.aside>
          </div>
        </main>
      </div>
    </div>
  );
}
