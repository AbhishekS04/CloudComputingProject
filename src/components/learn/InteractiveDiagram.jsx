import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, User, Clock, AlertTriangle } from 'reicon-react';
import IsoGridBackground from '../isometric/IsoGridBackground';
import IsoLaptopStation from '../isometric/IsoLaptopStation';
import IsoPrismNode from '../isometric/IsoPrismNode';
import IsoCylinderNode from '../isometric/IsoCylinderNode';
import IsoServerNode from '../isometric/IsoServerNode';
import IsoConnectionPath from '../isometric/IsoConnectionPath';

/**
 * InteractiveDiagram
 * Composition of all isometric components laid out to match the
 * designed-to-scale reference topology.
 *
 * Layout on 960×560 canvas:
 *   Alice laptop ........... (140, 320)
 *   Bot laptop ............. (350, 440)
 *   Load Balancer prism .... (380, 190)
 *   DNS Resolver prism ..... (520, 100)
 *   Database cylinder ...... (640, 80)
 *   Server A ............... (700, 190)
 *   Server B ............... (720, 290)
 *   Server C ............... (690, 380)
 */
export default function InteractiveDiagram({ currentStep, activeLesson }) {
  const stepNumber = currentStep?.stepNumber || 1;

  // Progressive reveal based on lesson step
  const showDns = stepNumber >= 2;
  const showLb = stepNumber >= 3;
  const showServers = stepNumber >= 5;
  const showDb = stepNumber >= 7;
  const showBot =
    stepNumber >= 8 ||
    (activeLesson?.id || '').includes('rate-limit') ||
    (activeLesson?.id || '').includes('ddos');

  return (
    <div className="relative w-full h-[520px] bg-[#F7F4EB] dark:bg-charcoal-950 rounded-2xl border border-[#DDD6C6] dark:border-charcoal-700 overflow-hidden select-none">
      {/* Isometric diamond grid paper */}
      <IsoGridBackground />

      <svg
        viewBox="0 0 960 560"
        className="w-full h-full relative z-10"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ════════════════════════════════════════
            CONNECTIONS LAYER (rendered below nodes)
            ════════════════════════════════════════ */}

        {/* Alice → DNS Resolver */}
        {showDns && (
          <IsoConnectionPath
            points={[
              [180, 290],
              [320, 200],
              [480, 120],
            ]}
            arrow="end"
            animatedPacket={{ color: 'green', duration: 2 }}
          />
        )}

        {/* Alice → Load Balancer */}
        {showLb && (
          <IsoConnectionPath
            points={[
              [190, 300],
              [280, 250],
              [340, 220],
            ]}
            arrow="end"
            animatedPacket={
              stepNumber === 3 || stepNumber === 4
                ? { color: 'amber', duration: 1.6 }
                : stepNumber >= 5
                ? { color: 'blue', duration: 1.4, delay: 0.2 }
                : null
            }
          />
        )}

        {/* Load Balancer → DNS (lookup arrow) */}
        {showDns && showLb && (
          <IsoConnectionPath
            points={[
              [400, 170],
              [490, 130],
            ]}
            arrow="end"
            dashed
            color="#94A3B8"
          />
        )}

        {/* Load Balancer → Database */}
        {showDb && (
          <IsoConnectionPath
            points={[
              [420, 170],
              [480, 140],
              [600, 100],
            ]}
            arrow="end"
            junctionDot={{ index: 1, color: 'green' }}
            animatedPacket={{ color: 'green', duration: 1.6 }}
          />
        )}

        {/* Load Balancer → Server A */}
        {showServers && (
          <IsoConnectionPath
            points={[
              [430, 200],
              [540, 200],
              [660, 200],
            ]}
            arrow="end"
            dashed={stepNumber >= 6}
            color={stepNumber >= 6 ? '#94A3B8' : '#252820'}
          />
        )}

        {/* Load Balancer → Server B (selected path) */}
        {showServers && (
          <IsoConnectionPath
            points={[
              [430, 210],
              [540, 240],
              [680, 300],
            ]}
            arrow="end"
            color={stepNumber >= 6 ? '#059669' : '#252820'}
            strokeWidth={stepNumber >= 6 ? 2.8 : 2.2}
            animatedPacket={
              stepNumber >= 6
                ? { color: 'blue', duration: 1.3 }
                : null
            }
          />
        )}

        {/* Load Balancer → Server C */}
        {showServers && (
          <IsoConnectionPath
            points={[
              [430, 220],
              [540, 300],
              [650, 390],
            ]}
            arrow="end"
            dashed={stepNumber >= 6}
            color={stepNumber >= 6 ? '#94A3B8' : '#252820'}
          />
        )}

        {/* Bot → Load Balancer (stepped path with red tokens) */}
        {showBot && (
          <IsoConnectionPath
            points={[
              [390, 410],
              [460, 380],
              [460, 300],
              [430, 260],
            ]}
            arrow="end"
            tokens={[
              { index: 1, type: 'square', color: 'red' },
              { index: 2, type: 'square', color: 'red' },
            ]}
            badge={{ x: 560, y: 370, text: '429 · challenge', color: 'amber' }}
          />
        )}

        {/* Bot → LB secondary path (from right side, stepped) */}
        {showBot && (
          <IsoConnectionPath
            points={[
              [400, 420],
              [520, 360],
              [520, 280],
              [460, 240],
            ]}
            arrow="end"
            color="#94A3B8"
            dashed
            tokens={[
              { index: 1, type: 'square', color: 'red' },
              { index: 2, type: 'square', color: 'red' },
            ]}
          />
        )}

        {/* ════════════════════════════════════════
            NODES LAYER
            ════════════════════════════════════════ */}

        {/* Alice's Laptop */}
        <IsoLaptopStation
          x={140}
          y={320}
          userLabel="Alice"
          urlBadge={stepNumber <= 3 ? 'https://shop.example' : null}
        />

        {/* Bot's Laptop (visible in later steps) */}
        {showBot && (
          <IsoLaptopStation
            x={350}
            y={440}
            userLabel="bot"
            statusBadge={{ text: 'slowed to a crawl', icon: <AlertTriangle size={12} className="text-amber-950 inline" aria-hidden="true" /> }}
          />
        )}

        {/* DNS Resolver */}
        {showDns && (
          <IsoPrismNode
            x={530}
            y={100}
            title="DNS resolver"
            icon={<Globe size={18} className="text-amber-800" aria-hidden="true" />}
            colorScheme="amber"
            topBadge={stepNumber === 2 ? { text: '→ 203.0.113.7' } : null}
          />
        )}

        {/* Load Balancer (center) */}
        {showLb && (
          <IsoPrismNode
            x={390}
            y={200}
            title="Load Balancer"
            icon={<Shield size={18} className="text-emerald-800" aria-hidden="true" />}
            colorScheme="peach"
            topBadge={{ text: '50k req/s · L7', icon: <Clock size={12} className="text-emerald-900" aria-hidden="true" /> }}
          />
        )}

        {/* Database Cylinder */}
        {showDb && (
          <IsoCylinderNode
            x={650}
            y={68}
            icon={<User size={18} className="text-purple-800" aria-hidden="true" />}
            tableLabel="users table"
            codePill="alice@… : $argon2id$…7Qe"
            colorScheme="purple"
          />
        )}

        {/* Backend Servers */}
        {showServers && (
          <>
            <IsoServerNode
              x={700}
              y={180}
              name="Server A"
              conns={14}
              status="healthy"
              isChosen={false}
            />
            <IsoServerNode
              x={720}
              y={280}
              name="Server B"
              conns={4}
              status="healthy"
              isChosen={stepNumber >= 6}
            />
            <IsoServerNode
              x={690}
              y={370}
              name="Server C"
              conns={9}
              status="healthy"
              isChosen={false}
            />
          </>
        )}
      </svg>

      {/* Floating speech bubble */}
      {currentStep?.speechBubble && (
        <div className="absolute left-[280px] top-[160px] pointer-events-none z-20">
          <motion.div
            key={currentStep.speechBubble}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3.5 py-1.5 bg-white dark:bg-charcoal-800 rounded-full border-2 border-[#252820] text-xs font-bold text-[#252820] dark:text-cream-100 whitespace-nowrap"
          >
            {currentStep.speechBubble}
          </motion.div>
        </div>
      )}

      {/* Bottom legend */}
      <div className="absolute bottom-3 left-5 z-20 flex items-center gap-4 text-[10px] font-bold text-[#252820] dark:text-cream-200 bg-white/90 dark:bg-charcoal-800/90 px-3.5 py-1 rounded-full border-2 border-[#252820]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 border border-[#252820] inline-block" />
          request
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 border border-[#252820] inline-block" />
          response
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-rose-500 border border-[#252820] inline-block" />
          challenge
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border-2 border-amber-500 bg-transparent inline-block" />
          handshake
        </span>
      </div>
    </div>
  );
}
