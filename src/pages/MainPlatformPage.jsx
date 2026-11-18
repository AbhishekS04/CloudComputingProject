import React, { useState, useEffect, useRef } from 'react';
import SystemDesignNavbar from '../components/layout/SystemDesignNavbar';
import CourseSidebar from '../components/learn/CourseSidebar';
import Visualizer from '../components/visualizer/Visualizer';
import StepScrubber from '../components/learn/StepScrubber';
import StudioRightPanel from '../components/layout/StudioRightPanel';
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
  ChartBar,
  Layers,
  ChevronRight,
  Activity,
  Flash,
  Server,
  Bell,
  CheckCircle,
  AlertCircle,
  Chart,
  Filter,
  SidebarLeft
} from 'reicon-react';

export default function MainPlatformPage() {
  const [activeTab, setActiveTab] = useState('learn'); // 'learn' | 'practice' | 'design-lab' | 'cheatsheets'
  const [activeLessonId, setActiveLessonId] = useState('how-a-request-travels');
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelectLesson={(lessonId) => {
            setActiveLessonId(lessonId);
            setCurrentStepIndex(0);
          }}
        />

        {/* Center & Right Master Workspace */}
        {(activeTab === 'learn' || activeTab === 'practice') && (
          <main className="flex-1 overflow-y-auto p-3.5 md:p-5">
            <div className="max-w-[1720px] mx-auto flex flex-col xl:flex-row gap-5 items-start">
              {/* ========================================================
                  CENTER COLUMN: Visualizer + Telemetry
                 ======================================================== */}
              <div className="flex-1 min-w-0 space-y-3 w-full">
                {/* A. Quiet Lesson Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
                  <div className="flex items-center gap-2">
                    {sidebarCollapsed && (
                      <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="p-1.5 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 text-charcoal-600 dark:text-cream-300 hover:bg-[#EBE6DA] transition-colors shadow-2xs mr-1"
                        title="Expand Curriculum Sidebar"
                        aria-label="Expand Curriculum Sidebar"
                      >
                        <SidebarLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <div>
                      {/* Breadcrumbs */}
                      <div className="flex items-center gap-1.5 text-xs text-charcoal-500 font-mono mb-0.5">
                        <span>01. Foundations</span>
                        <ChevronRight className="w-3 h-3 text-charcoal-400" aria-hidden="true" />
                        <span className="text-charcoal-700 dark:text-cream-300 font-medium">Lesson 1 of 4</span>
                      </div>

                      <h1 className="text-xl md:text-2xl font-extrabold text-charcoal-900 dark:text-cream-100 font-sans tracking-tight">
                        {activeLesson.title}
                      </h1>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[10px] text-charcoal-600 dark:text-cream-300 shadow-2xs">
                      <Clock className="w-3 h-3 text-charcoal-500" aria-hidden="true" />
                      <span>{activeLesson.duration || '10 min'}</span>
                    </span>

                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 font-mono text-[10px] text-charcoal-600 dark:text-cream-300 shadow-2xs">
                      <ChartBar className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      <span>{activeLesson.level || 'Beginner'}</span>
                    </span>

                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBE6DA] dark:bg-charcoal-700 border border-[#DDD6C6] font-mono text-[10px] font-bold text-charcoal-800 dark:text-cream-100 shadow-2xs">
                      <Layers className="w-3 h-3 text-charcoal-600" aria-hidden="true" />
                      <span>{steps.length} hops</span>
                    </span>
                  </div>
                </div>

                {/* B. The Visualizer (The Hero Stage with Integrated Master Toolbar) */}
                <Visualizer
                  currentStep={currentStep}
                  activeLesson={activeLesson}
                  onReplay={handleReplay}
                />

                {/* C. Step Scrubber Timeline */}
                <StepScrubber
                  steps={steps}
                  currentStepIndex={currentStepIndex}
                  onSelectStep={(idx) => {
                    setCurrentStepIndex(idx);
                    setIsPlaying(false);
                  }}
                />

                {/* D. Compact Telemetry Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard
                    title="Incoming Requests"
                    value={formatNumber(metrics.totalRequests)}
                    subtitle="Dispatched by simulation"
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
                    icon={Flash}
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

                {/* E. Decluttered Telemetry Drawer */}
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
                        <span>Edge Ingress</span>
                      </button>

                      <button
                        onClick={() => setTelemetryView('charts')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          telemetryView === 'charts'
                            ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                            : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
                        }`}
                      >
                        <Chart className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                        <span>Throughput & Charts</span>
                      </button>

                      <button
                        onClick={() => setTelemetryView('fleet')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          telemetryView === 'fleet'
                            ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                            : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
                        }`}
                      >
                        <Server className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Server Fleet</span>
                      </button>

                      <button
                        onClick={() => setTelemetryView('logs')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          telemetryView === 'logs'
                            ? 'bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-cream-100 font-bold shadow-xs border border-[#DDD6C6] dark:border-charcoal-600'
                            : 'text-charcoal-600 dark:text-cream-300 hover:text-charcoal-900'
                        }`}
                      >
                        <Filter className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                        <span>Audit Log</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-mono text-charcoal-400">
                      Real-time telemetry stream
                    </span>
                  </div>

                  {/* View 0: Edge Ingress Gateway Telemetry */}
                  {telemetryView === 'traffic' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-5">
                        <TrafficCard
                          title="Ingress Traffic"
                          unit="reqs"
                          channels={TRAFFIC_CHANNELS}
                          ranges={TRAFFIC_RANGES}
                          defaultRange="day"
                          className="w-full shadow-md"
                        />
                      </div>
                      <div className="lg:col-span-7 bg-[#FAF8F2] dark:bg-charcoal-900 border border-[#DDD6C6] dark:border-charcoal-700 rounded-2xl p-4 md:p-5 shadow-subtle flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-[#DDD6C6]/60 dark:border-charcoal-700">
                            <div>
                              <h4 className="text-sm font-bold text-charcoal-900 dark:text-cream-100 font-sans">
                                Edge Ingress Gateway Telemetry
                              </h4>
                              <p className="text-xs text-charcoal-500 dark:text-cream-400 mt-0.5">
                                Real-time packet ingestion, edge proxy protocol distribution, and TLS termination statistics
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#C5E5C9] text-[#1E3A24] border border-[#A3D2A7]">
                              VIP: 203.0.113.7:443
                            </span>
                          </div>

                          {/* Metric Tiles */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                            <div className="p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
                              <span className="text-[10px] font-mono text-charcoal-400 uppercase tracking-wider">Edge Protocol</span>
                              <p className="text-base font-black text-charcoal-800 dark:text-cream-100 mt-0.5">HTTP/2 + TLS 1.3</p>
                              <p className="text-[10px] text-emerald-600 font-medium">Session Keep-Alive: ON</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700">
                              <span className="text-[10px] font-mono text-charcoal-400 uppercase tracking-wider">Edge Cache Hit</span>
                              <p className="text-base font-black text-charcoal-800 dark:text-cream-100 mt-0.5">94.6% Hit Rate</p>
                              <p className="text-[10px] text-charcoal-500 dark:text-cream-400">CDN Edge Anycast</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-[#DDD6C6] dark:border-charcoal-700 col-span-2 sm:col-span-1">
                              <span className="text-[10px] font-mono text-charcoal-400 uppercase tracking-wider">Ingress Channels</span>
                              <p className="text-base font-black text-charcoal-800 dark:text-cream-100 mt-0.5">5 Ingress Paths</p>
                              <p className="text-[10px] text-charcoal-500 dark:text-cream-400">Direct, CDN, Edge, API, WS</p>
                            </div>
                          </div>

                          {/* Protocol & Ingress Channel Health List */}
                          <div className="space-y-2 text-xs text-charcoal-600 dark:text-cream-300">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-charcoal-800/60 border border-[#DDD6C6]/60 dark:border-charcoal-700/60">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span><strong>Direct HTTP & REST:</strong> Low-latency client API endpoints</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-charcoal-700 dark:text-cream-200">~24 ms p50</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-charcoal-800/60 border border-[#DDD6C6]/60 dark:border-charcoal-700/60">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span><strong>CDN & Static Assets:</strong> Geo-distributed edge POP nodes</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-charcoal-700 dark:text-cream-200">~8 ms p50</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-charcoal-800/60 border border-[#DDD6C6]/60 dark:border-charcoal-700/60">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                                <span><strong>Persistent WebSockets:</strong> Stateful bi-directional streaming</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-charcoal-700 dark:text-cream-200">0 reconnect drops</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#DDD6C6]/60 dark:border-charcoal-700 flex items-center justify-between text-[11px] text-charcoal-400 mt-4 font-mono">
                          <span>L7 Reverse Proxy: Active</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Health Probes: 100% Passing</span>
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
                              {evt.type === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />}
                              {evt.type === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />}
                              {evt.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />}
                              {!['success', 'warning', 'error'].includes(evt.type) && (
                                <Activity className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
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
