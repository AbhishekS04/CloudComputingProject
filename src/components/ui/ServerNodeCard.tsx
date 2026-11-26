'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronUp,
  Globe,
  Cursor,
  Flame,
  Tag,
  Shield,
  Power,
  Clock,
  Link,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
} from 'reicon-react';
import { DuotoneIcon } from './DuotoneIcon';

interface ServerNodeCardProps {
  server: {
    id: string;
    name: string;
    ip?: string;
    publicIp?: string;
    privateIp?: string;
    url?: string;
    healthy: boolean;
    cpu?: number;
    connections?: number;
    avgLatency?: number;
  };
  index: number;
  onToggleHealth: (index: number) => void;
  defaultExpanded?: boolean;
}

export const ServerNodeCard: React.FC<ServerNodeCardProps> = ({
  server,
  index,
  onToggleHealth,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const springConfig = { type: 'spring', stiffness: 320, damping: 32 } as const;

  const isHealthy = server.healthy;
  const cpu = isHealthy ? (server.cpu ?? (35 + ((index * 13) % 35))) : 0;
  const connections = isHealthy ? (server.connections ?? (10 + index * 3)) : 0;
  const latency = isHealthy ? (server.avgLatency ?? (20 + index * 4)) : 0;
  const publicIp = server.publicIp || server.ip || (server.url ? server.url.replace(/^https?:\/\//, "") : ["52.172.229.225:5001", "20.193.245.71:5001", "52.172.255.132:5001"][index] || `52.172.229.225:5001`);
  const privateIp = server.privateIp || ["10.0.1.10", "10.0.1.11", "10.0.1.12"][index] || `10.0.1.${10 + index}`;
  const ip = publicIp;
  const letter = server.name.replace(/^server-/i, '').replace(/^Server\s*/i, '').slice(0, 2) || String(index + 1);
  const isHighLoad = cpu > 50;

  return (
    <motion.div
      layout
      transition={springConfig}
      className={`w-full overflow-hidden rounded-2xl border transition-all duration-200 select-none shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] ${
        isHealthy
          ? 'bg-white dark:bg-[#242426] border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.16]'
          : 'bg-[#FFFBFB] dark:bg-[#251D1D] border-red-500/20 dark:border-red-500/20 opacity-90'
      }`}
    >
      {/* 1. Header & Overview Section */}
      <div
        className="p-3.5 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-2.5 mb-2.5">
          {/* Node Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Apple Squircle Avatar */}
            <div
              className={`w-7 h-7 rounded-[8px] font-mono font-semibold text-xs flex items-center justify-center shrink-0 transition-colors ${
                isHealthy
                  ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158] dark:bg-[#30D158]/15 border border-[#34C759]/20'
                  : 'bg-[#FF3B30]/12 text-[#C41C14] dark:text-[#FF453A] dark:bg-[#FF453A]/15 border border-[#FF3B30]/20'
              }`}
            >
              {letter}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-sans font-semibold text-[13px] text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                  {server.name}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isHealthy ? 'bg-[#34C759] shadow-[0_0_6px_rgba(52,199,89,0.5)]' : 'bg-[#FF3B30]'
                  }`}
                />
              </div>
              <div className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 mt-1 leading-none flex items-center gap-1.5 flex-wrap">
                <span className="text-blue-600 dark:text-blue-400 font-medium">Pub: {publicIp}</span>
                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Priv: {privateIp}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Apple Status Pill & Chevron */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Apple HIG Status Capsule */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleHealth(index);
              }}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                isHealthy
                  ? 'bg-[#34C759]/10 hover:bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158] dark:bg-[#30D158]/15 border border-[#34C759]/25'
                  : 'bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 text-[#C41C14] dark:text-[#FF453A] dark:bg-[#FF453A]/15 border border-[#FF3B30]/25'
              }`}
              title={isHealthy ? 'Click to trigger node failover' : 'Click to restore node'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isHealthy ? 'bg-[#34C759]' : 'bg-[#FF3B30]'
                }`}
              />
              <span>{isHealthy ? 'ACTIVE' : 'DRAINED'}</span>
            </button>

            {/* Subtle Chevron Icon */}
            <motion.div
              animate={{ rotate: isExpanded ? 0 : 180 }}
              className="w-5 h-5 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
            >
              <ChevronUp size={14} strokeWidth={2.2} />
            </motion.div>
          </div>
        </div>

        {/* CPU Load Progress Meter (Apple Gauge Style) */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-[11px] leading-none">
            <span className="text-neutral-500 dark:text-neutral-400 font-normal">CPU Load</span>
            <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
              {isHealthy ? `${cpu}%` : '0%'}
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                !isHealthy
                  ? 'bg-neutral-300 dark:bg-neutral-700'
                  : isHighLoad
                  ? 'bg-[#FF9500]'
                  : 'bg-[#34C759]'
              }`}
              style={{ width: `${isHealthy ? Math.max(3, cpu) : 0}%` }}
            />
          </div>
        </div>

        {/* Telemetry Summary Row */}
        <div className="flex items-center justify-between text-[10.5px] font-mono text-neutral-500 dark:text-neutral-400 pt-0.5">
          <div>
            <span className="text-neutral-400 dark:text-neutral-500">Conns: </span>
            <strong className="text-neutral-800 dark:text-neutral-200 font-medium">
              {connections}
            </strong>
          </div>
          <div>
            <span className="text-neutral-400 dark:text-neutral-500">Latency: </span>
            <strong className="text-neutral-800 dark:text-neutral-200 font-medium">
              {isHealthy ? `${latency} ms` : '—'}
            </strong>
          </div>
          <div className="font-medium text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {isHealthy ? 'IN ROTATION' : 'STANDBY'}
          </div>
        </div>
      </div>

      {/* 2. Expanded Deep Stats Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springConfig}
            className="border-t border-black/[0.05] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.02] overflow-hidden"
          >
            <div className="space-y-2.5 p-3.5">
              {/* Virtual IP Row */}
              <DataRow icon={<DuotoneIcon icon={Globe} size={13} secondaryOpacity={0.16} />} label="Virtual IP & Port">
                <div className="flex items-center gap-1.5 truncate rounded-md border border-black/[0.06] dark:border-white/[0.08] px-2 py-0.5 text-[11px] font-mono text-neutral-700 dark:text-neutral-300 bg-white dark:bg-[#2C2C2E]">
                  <Link size={11} className="shrink-0 text-neutral-400" />
                  <span className="truncate">{publicIp}</span>
                </div>
              </DataRow>

              {/* Operational State Row */}
              <DataRow icon={<DuotoneIcon icon={Power} size={13} secondaryOpacity={0.18} />} label="Operational State">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHealth(index);
                  }}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[10.5px] font-sans font-medium transition-all cursor-pointer active:scale-95 ${
                    isHealthy
                      ? 'border-[#34C759]/25 bg-[#34C759]/10 text-[#248A3D] dark:text-[#30D158] hover:bg-[#34C759]/15'
                      : 'border-[#FF3B30]/25 bg-[#FF3B30]/10 text-[#C41C14] dark:text-[#FF453A] hover:bg-[#FF3B30]/15'
                  }`}
                >
                  <Power size={11} />
                  <span>{isHealthy ? 'ACTIVE (Online)' : 'DRAINED (Offline)'}</span>
                </button>
              </DataRow>

              {/* CPU Utilization Row */}
              <DataRow icon={<DuotoneIcon icon={Flame} size={13} secondaryOpacity={0.2} />} label="CPU Utilization">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHealthy
                          ? cpu < 50
                            ? 'bg-[#34C759]'
                            : cpu < 75
                            ? 'bg-[#FF9500]'
                            : 'bg-[#FF3B30]'
                          : 'bg-neutral-400'
                      }`}
                      style={{ width: `${cpu}%` }}
                    />
                  </div>
                  <div
                    className={`flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10.5px] font-mono font-medium ${
                      isHealthy
                        ? 'border-[#34C759]/25 bg-[#34C759]/10 text-[#248A3D] dark:text-[#30D158]'
                        : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.04] text-neutral-500'
                    }`}
                  >
                    {cpu}% <ArrowUpRight size={11} />
                  </div>
                </div>
              </DataRow>

              {/* Endpoints */}
              <DataRow icon={<DuotoneIcon icon={Globe} size={13} secondaryOpacity={0.16} />} label="Public Endpoint">
                <span className="text-[11px] font-mono font-medium text-blue-600 dark:text-blue-400">
                  {publicIp}
                </span>
              </DataRow>

              <DataRow icon={<DuotoneIcon icon={Shield} size={13} secondaryOpacity={0.18} />} label="Azure VNet Private IP">
                <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {privateIp}
                </span>
              </DataRow>

              {/* Active Connections */}
              <DataRow icon={<DuotoneIcon icon={Cursor} size={13} secondaryOpacity={0.16} />} label="Active TCP Conns">
                <span className="text-[11px] font-mono font-medium text-neutral-800 dark:text-neutral-200">
                  {connections} sockets
                </span>
              </DataRow>

              {/* Response Latency */}
              <DataRow icon={<DuotoneIcon icon={Clock} size={13} secondaryOpacity={0.16} />} label="Measured Latency">
                <span className="text-[11px] font-mono font-medium text-neutral-800 dark:text-neutral-200">
                  {isHealthy ? `${latency} ms` : '—'}
                </span>
              </DataRow>

              {/* Routing State Tags */}
              <DataRow icon={<DuotoneIcon icon={Tag} size={13} secondaryOpacity={0.16} />} label="Routing State">
                <div className="flex items-center gap-1.5">
                  <span className="rounded border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#2C2C2E] px-1.5 py-0.5 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
                    L7 Node
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-sans font-medium ${
                      isHealthy
                        ? 'border-[#34C759]/25 bg-[#34C759]/10 text-[#248A3D] dark:text-[#30D158]'
                        : 'border-[#FF3B30]/25 bg-[#FF3B30]/10 text-[#C41C14] dark:text-[#FF453A]'
                    }`}
                  >
                    {isHealthy ? 'In Rotation' : 'Bypassed'}
                  </span>
                </div>
              </DataRow>

              {/* Health Check Probe */}
              <DataRow icon={<DuotoneIcon icon={Shield} size={13} secondaryOpacity={0.18} />} label="Health Probe">
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  {isHealthy ? (
                    <>
                      <DuotoneIcon icon={CheckCircle} size={13} className="text-[#34C759]" secondaryOpacity={0.26} />
                      <span className="text-[#248A3D] dark:text-[#30D158] font-medium">
                        HTTP 200 OK (2s interval)
                      </span>
                    </>
                  ) : (
                    <>
                      <DuotoneIcon icon={AlertCircle} size={13} className="text-[#FF3B30]" secondaryOpacity={0.26} />
                      <span className="text-[#C41C14] dark:text-[#FF453A] font-medium">
                        Failover Active (Bypassed)
                      </span>
                    </>
                  )}
                </div>
              </DataRow>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const DataRow = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 py-0.5">
    <div className="flex shrink-0 items-center gap-2 text-neutral-400 dark:text-neutral-500">
      {icon}
      <span className="text-[12px] font-normal text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
        {label}
      </span>
    </div>
    <div className="flex min-w-0 flex-1 justify-end">{children}</div>
  </div>
);

export default ServerNodeCard;

