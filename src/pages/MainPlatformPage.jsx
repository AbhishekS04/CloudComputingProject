import React, { useState, useEffect, useRef } from 'react';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import CourseSidebar from '../components/learn/CourseSidebar';
import Visualizer from '../components/visualizer/Visualizer';
import StepScrubber from '../components/learn/StepScrubber';
import StudioRightPanel from '../components/layout/StudioRightPanel';
import StudioCommandBar from '../components/controls/StudioCommandBar';
import MetricCard from '../components/dashboard/MetricCard';
import TrafficChart from '../components/dashboard/TrafficChart';
import RequestDistribution from '../components/charts/RequestDistribution';
import ServerStatus from '../components/dashboard/ServerStatus';
import { TrafficCard } from '@/components/ui/traffic-card';
import { TRAFFIC_CHANNELS, TRAFFIC_RANGES } from '../data/trafficCardData';
import DesignLabView from '../components/learn/DesignLabView';
import CheatsheetsView from '../components/learn/CheatsheetsView';
import SearchModal from '../components/layout/SearchModal';
import { useSimulation } from '../hooks/useSimulation';
import { useServers } from '../hooks/useServers';
import { formatNumber, formatMs } from '../utils/formatters';
import { COURSE_MODULES } from '../data/courseData';
import {
  Clock,
  BarChart,
  Layers,
  ChevronRight,
  Activity,
  Zap,
  Server,
  Bell,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ListFilter
} from 'lucide-react';

export default function MainPlatformPage() {
  const [activeTab, setActiveTab] = useState('learn'); // 'learn' | 'practice' | 'design-lab' | 'cheatsheets'
  const [activeLessonId, setActiveLessonId] = useState('how-a-request-travels');
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [telemetryView, setTelemetryView] = useState('traffic'); // 'traffic' | 'charts' | 'fleet' | 'logs'

  const analyticsRef = useRef(null);

  // Simulation store hooks
  const { metrics, events, targetRps, algorithm } = useSimulation();
  const { servers, activeServersCount, totalServers } = useServers();

  // Find active lesson object
  const allLessons = COURSE_MODULES.flatMap((m) => m.lessons || []);
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) || allLessons[0];
  const steps = activeLesson.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0];
  const nextStep = steps[currentStepIndex + 1];

  // Auto-play stepper timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setCurrentStepIndex(0);
        setIsPlaying(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length]);

  const handleReplay = () => {
    setCurrentStepIndex(0);
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'practice' && analyticsRef.current) {
      setTimeout(() => {
        analyticsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F5F2EA] dark:bg-charcoal-950 text-charcoal-800 dark:text-cream-100 font-sans">
      {/* 1. Top Navbar */}
      <SystemDesignNavbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* 2. Main Studio Grid */}
      <div className="flex flex-1 h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Side: Course Curriculum & Scenarios Navigator */}
        <CourseSidebar
          modules={COURSE_MODULES}
          activeLessonId={activeLessonId}
          onSelectLesson={(lessonId) => {
            setActiveLessonId(lessonId);
            setCurrentStepIndex(0);
          }}
        />

        {/* Center & Right Master Workspace */}
        {(activeTab === 'learn' || activeTab === 'practice') && (
          <main className="flex-1 overflow-y-auto p-4 md:p-5">
            <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row gap-5 items-start">
              {/* ========================================================
                  CENTER COLUMN: Visualizer + Telemetry
                 ======================================================== */}
              <div className="flex-1 min-w-0 space-y-3.5 w-full">
                {/* A. Quiet Lesson Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
                  <div>
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-500 font-mono mb-0.5">
                      <span>01. Foundations</span>
                      <ChevronRight className="w-3 h-3 text-charcoal-400" />
                      <span className="text-charcoal-700 dark:text-cream-300 font-medium">Lesson 1 of 4</span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
                      {activeLesson.title}
                    </h1>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[10px] text-charcoal-600 dark:text-cream-300 shadow-2xs">
                      <Clock className="w-3 h-3 text-charcoal-500" />
                      <span>{activeLesson.duration || '10 min'}</span>
                    </span>

                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[10px] text-charcoal-600 dark:text-cream-300 shadow-2xs">
                      <BarChart className="w-3 h-3 text-emerald-600" />
                      <span>{activeLesson.level || 'Beginner'}</span>
                    </span>

                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBE6DA] dark:bg-charcoal-700 border border-[#DDD6C6] font-mono text-[10px] font-bold text-charcoal-800 dark:text-cream-100 shadow-2xs">
                      <Layers className="w-3 h-3 text-charcoal-600" />
                      <span>{steps.length} steps</span>
                    </span>
                  </div>
                </div>

                {/* B. Unified Studio Command Bar (Replaces 2 separate bulky bars with ONE sleek toolbar) */}
                <StudioCommandBar
                  timings={currentStep.timings || {}}
                  onReplay={handleReplay}
                />

                {/* C. The Visualizer (The Hero Stage) */}
                <Visualizer
                  currentStep={currentStep}
                  activeLesson={activeLesson}
                />

                {/* D. Step Scrubber Timeline */}
                <StepScrubber
                  steps={steps}
                  currentStepIndex={currentStepIndex}
                  onSelectStep={(idx) => {
                    setCurrentStepIndex(idx);
                    setIsPlaying(false);
                  }}
                />

                {/* E. Compact Telemetry Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard
                    title="Incoming Requests"
                    value={formatNumber(metrics.totalRequests)}
                    subtitle="Total dispatched by simulation"
                    icon={Layers}
                    trend="+100%"
                    trendLabel="Session"
                    trendDirection="up"
                    sparklineData={[12, 19, 25, 32, 45, 58, 70, 95]}
                  />

                  <MetricCard
                    title="Requests Per Second"
                    value={`${metrics.currentRps} RPS`}
                    subtitle={`Target capacity: ${targetRps} req/s`}
                    icon={Zap}
                    trend={metrics.currentRps >= targetRps ? 'Nominal' : 'Pacing'}
                    trendDirection={metrics.currentRps > 0 ? 'up' : 'neutral'}
                    sparklineData={[4, 6, 8, 7, 12, 10, 8, metrics.currentRps]}
                  />

                  <MetricCard
                    title="Average Latency"
                    value={formatMs(metrics.avgLatency)}
                    subtitle="Round-trip network time"
                    icon={Clock}
                    trend={metrics.avgLatency < 40 ? 'Optimal' : 'Elevated'}
                    trendDirection={metrics.avgLatency < 40 ? 'up' : 'down'}
                    sparklineData={[28, 25, 23, 22, 21, 24, 22, metrics.avgLatency]}
                  />

                  <MetricCard
                    title="Active Server Pool"
                    value={`${activeServersCount} / ${totalServers}`}
                    subtitle={`${servers.filter((s) => s.status === 'healthy').length} healthy, ${servers.filter((s) => s.status === 'degraded').length} degraded`}
                    icon={Server}
                    trend={`${Math.round((activeServersCount / (totalServers || 1)) * 100)}% Avail`}
                    trendDirection={activeServersCount === totalServers ? 'up' : 'down'}
                    sparklineData={[3, 3, 3, 3, 2, 3, activeServersCount]}
                  />
                </div>

                {/* F. Decluttered Telemetry Drawer (Tabbed clean view instead of endless stacked scrolling) */}
                <div ref={analyticsRef} className="pt-1 space-y-3">
                  {/* Segmented Switcher for Deep Analytics */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDD6C6] dark:border-charcoal-700 pb-2.5">
                    <div className="flex items-center gap-1.5 bg-[#EBE6DA]/70 dark:bg-charcoal-800 p-1 rounded-xl border border-[#DDD6C6] dark:border-charcoal-700 text-xs font-semibold">
                      <button
                        onClick={() => setTelemetryView('traffic')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          telemetryView === 'traffic'
                            ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                            : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                        <span>Traffic Card</span>
                      </button>

                      <button
                        onClick={() => setTelemetryView('charts')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          telemetryView === 'charts'
                            ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                            : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Throughput & Load Charts</span>
                      </button>

                      <button
                        onClick={() => setTelemetryView('fleet')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          telemetryView === 'fleet'
                            ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                            : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
                        }`}
                      >
                        <Server className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Backend Server Fleet</span>
                      </button>

                      <button
                        onClick={() => setTelemetryView('logs')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          telemetryView === 'logs'
                            ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                            : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
                        }`}
                      >
                        <ListFilter className="w-3.5 h-3.5 text-amber-600" />
                        <span>Cluster Event Audit</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-mono text-charcoal-400">
                      Real-time telemetry stream
                    </span>
                  </div>

                  {/* View 0: Dedicated EasyUI Traffic Card Showcase */}
                  {telemetryView === 'traffic' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <div className="lg:col-span-5">
                        <TrafficCard
                          title="Ingress Traffic"
                          unit="visits"
                          channels={TRAFFIC_CHANNELS}
                          ranges={TRAFFIC_RANGES}
                          defaultRange="day"
                          className="w-full shadow-md"
                        />
                      </div>
                      <div className="lg:col-span-7 bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-[#DDD6C6]/60 dark:border-charcoal-700">
                            <div>
                              <h4 className="text-sm font-bold text-charcoal-900 dark:text-cream-100 font-sans">
                                EasyUI Traffic Card Analytics
                              </h4>
                              <p className="text-xs text-charcoal-500 dark:text-cream-400 mt-0.5">
                                Micro-animated stacked capsule SVG visualization with real-time ingress telemetry
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              Surajmaurya1/easyui
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                            <div className="p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
                              <span className="text-[10px] font-mono text-charcoal-400">CHANNELS</span>
                              <p className="text-lg font-black text-charcoal-800 dark:text-cream-100 mt-0.5">5 Ingress</p>
                              <p className="text-[10px] text-charcoal-500 dark:text-cream-400">Direct, CDN, Edge, API, WS</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
                              <span className="text-[10px] font-mono text-charcoal-400">INTERVALS</span>
                              <p className="text-lg font-black text-charcoal-800 dark:text-cream-100 mt-0.5">Day & Week</p>
                              <p className="text-[10px] text-charcoal-500 dark:text-cream-400">22 sample columns</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 col-span-2 sm:col-span-1">
                              <span className="text-[10px] font-mono text-charcoal-400">INTERACTIONS</span>
                              <p className="text-lg font-black text-charcoal-800 dark:text-cream-100 mt-0.5">Capsule Tooltips</p>
                              <p className="text-[10px] text-charcoal-500 dark:text-cream-400">Arrow keys + hover</p>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs text-charcoal-600 dark:text-cream-300">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span><strong>Hand-written SVG Capsules:</strong> Stacked channel pills with 2px gap spacing and rounded borders.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span><strong>Cubic Count-Up Animation:</strong> Animated count-up headline responding smoothly to Day / Week switches.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span><strong>Interactive Legend Filter:</strong> Click any channel in the footer legend to isolate or highlight it.</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#DDD6C6]/60 dark:border-charcoal-700 flex items-center justify-between text-[11px] text-charcoal-400 mt-4">
                          <span>Component: <code>@/components/ui/traffic-card</code></span>
                          <span className="font-mono">Category: Feedback</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View 1: Throughput & Distribution Charts */}
                  {telemetryView === 'charts' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1">
                          <TrafficCard
                            title="Ingress Traffic"
                            unit="reqs"
                            channels={TRAFFIC_CHANNELS}
                            ranges={TRAFFIC_RANGES}
                            defaultRange="day"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <TrafficChart />
                        </div>
                      </div>
                      <div>
                        <RequestDistribution />
                      </div>
                    </div>
                  )}

                  {/* View 2: Server Fleet Status */}
                  {telemetryView === 'fleet' && (
                    <div className="w-full">
                      <ServerStatus />
                    </div>
                  )}

                  {/* View 3: Cluster Routing Audit Trail */}
                  {telemetryView === 'logs' && (
                    <div className="bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-5 shadow-subtle">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-emerald-600" />
                          <div>
                            <h4 className="text-sm font-bold text-charcoal-800 dark:text-cream-100 font-sans">
                              Cluster Routing Audit Trail
                            </h4>
                            <p className="text-xs text-charcoal-400">Audit log of simulated routing events and load distribution</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-charcoal-400 font-bold">
                          {events.length} events logged
                        </span>
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {events.slice(0, 10).map((evt) => (
                          <div
                            key={evt.id}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-xs shadow-xs"
                          >
                            <div className="mt-0.5">
                              {evt.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                              {evt.type === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                              {evt.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                              {!['success', 'warning', 'error'].includes(evt.type) && (
                                <Activity className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-charcoal-800 dark:text-cream-100 truncate">
                                  {evt.title}
                                </span>
                                <span className="text-[9px] font-mono text-charcoal-400 shrink-0 ml-1">
                                  {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-charcoal-500 dark:text-cream-300 mt-0.5 text-[11px] leading-snug">
                                {evt.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================
                  RIGHT COLUMN: Unified Step Explainer + Node Inspector
                 ======================================================== */}
              <StudioRightPanel
                step={currentStep}
                stepIndex={currentStepIndex}
                totalSteps={steps.length}
                nextStepTitle={nextStep ? nextStep.title : null}
                onPrev={handlePrev}
                onNext={handleNext}
                whatYouLearn={activeLesson.whatYouLearn}
              />
            </div>
          </main>
        )}

        {/* Design Lab Tab */}
        {activeTab === 'design-lab' && (
          <main className="flex-1 overflow-y-auto p-5 md:p-6">
            <DesignLabView />
          </main>
        )}

        {/* Cheatsheets Tab */}
        {activeTab === 'cheatsheets' && (
          <main className="flex-1 overflow-y-auto p-5 md:p-6">
            <CheatsheetsView />
          </main>
        )}
      </div>

      {/* Ctrl + K Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectLesson={(lessonId) => {
          setActiveLessonId(lessonId);
          setCurrentStepIndex(0);
          setActiveTab('learn');
        }}
      />
    </div>
  );
}
