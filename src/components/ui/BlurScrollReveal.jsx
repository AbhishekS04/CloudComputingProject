"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

function BlurItem({
  text,
  itemIndex,
  totalItems,
  scrollYProgress,
  itemClassName,
  staggerFactor = 0.85,
  animationDuration = 0.12,
  opacityRange,
  blurRange,
  yRange,
  scaleRange,
}) {
  const safeTotal = Math.max(1, totalItems);
  const start = Math.min(0.95, (itemIndex / safeTotal) * staggerFactor);
  const end = Math.min(1, Math.max(start + 0.01, start + animationDuration));

  const opacityVal = useTransform(scrollYProgress, [start, end], opacityRange);

  const blurVal = useTransform(
    scrollYProgress,
    [start, end],
    [`blur(${blurRange[0]})`, `blur(${blurRange[1]})`],
  );

  const yVal = useTransform(scrollYProgress, [start, end], [
    typeof yRange[0] === "number" ? `${yRange[0]}px` : yRange[0],
    typeof yRange[1] === "number" ? `${yRange[1]}px` : yRange[1],
  ]);

  const scaleVal = useTransform(scrollYProgress, [start, end], scaleRange);

  return (
    <motion.span
      style={{ opacity: opacityVal, filter: blurVal, y: yVal, scale: scaleVal }}
      className={cn(
        "inline-block text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl lg:text-6xl dark:text-white",
        itemClassName,
      )}
    >
      {text}
    </motion.span>
  );
}

export function BlurScrollReveal({
  text = "Grinding Hard",
  variant = "word",
  itemClassName,
  containerClassName,
  scrollContainerRef,
  offset = ["start end", "end 60%"],
  className,
  staggerFactor = 0.85,
  animationDuration = 0.12,
  opacity = [0, 1],
  blur = ["12px", "0px"],
  y = ["10px", "0px"],
  scale = [1, 1],
  ...props
}) {
  const containerRef = useRef(null);
  const wordsRef = useRef([]);
  const [lineIndices, setLineIndices] = useState([]);
  const [numLines, setNumLines] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainerRef,
    offset: offset,
  });

  const content = text || "";
  const words = content.split(" ").filter((w) => w.trim().length > 0);
  const isLineVariant = variant === "line";

  useEffect(() => {
    wordsRef.current = [];
  }, [content]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLineVariant && words.length > 0) {
      const calculateLines = () => {
        if (!wordsRef.current || wordsRef.current.length === 0) return;
        let currentOffset = -1;
        let currentLine = -1;
        const newIndices = [];
        wordsRef.current.forEach((el, i) => {
          if (!el) { newIndices[i] = 0; return; }
          const off = el.offsetTop;
          if (Math.abs(off - currentOffset) > 5) { currentLine++; currentOffset = off; }
          newIndices[i] = currentLine;
        });
        setLineIndices(newIndices);
        setNumLines(currentLine + 1);
      };
      calculateLines();
      const tid = setTimeout(calculateLines, 100);
      window.addEventListener("resize", calculateLines);
      return () => { window.removeEventListener("resize", calculateLines); clearTimeout(tid); };
    }
  }, [isLineVariant, words.length]);

  let itemsArray = [];
  if (isLineVariant) {
    const linesMap = {};
    words.forEach((word, idx) => {
      const lineIdx = lineIndices[idx] ?? 0;
      if (!linesMap[lineIdx]) linesMap[lineIdx] = [];
      linesMap[lineIdx].push(word);
    });
    itemsArray = Object.keys(linesMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((key) => linesMap[key].join(" "));
  } else {
    itemsArray = words;
  }

  const showStatic = isLineVariant && (!isMounted || numLines === 0);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-[50dvh] w-full flex-col items-center justify-center overflow-hidden select-none",
        className,
      )}
      {...props}
    >
      {isLineVariant && words.length > 0 && (
        <div
          className={cn(
            "flex w-full max-w-5xl flex-wrap justify-center gap-x-[0.3em] gap-y-2 text-center md:gap-y-4",
            showStatic
              ? "opacity-100"
              : "pointer-events-none invisible absolute inset-0 opacity-0",
            containerClassName,
          )}
          aria-hidden="true"
        >
          {words.map((item, i) => (
            <span
              key={i}
              ref={(el) => { wordsRef.current[i] = el; }}
              className={cn(
                "inline-block text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl lg:text-6xl dark:text-white",
                itemClassName,
              )}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {(!isLineVariant || !showStatic) && (
        <div
          className={cn(
            "max-w-5xl overflow-visible text-center",
            isLineVariant
              ? "flex w-full flex-col items-center gap-2 md:gap-4"
              : "flex flex-wrap justify-center gap-x-[0.3em] gap-y-2 md:gap-y-4",
            containerClassName,
          )}
        >
          {itemsArray.map((item, i) => (
            <BlurItem
              key={i}
              text={item}
              itemIndex={i}
              totalItems={itemsArray.length}
              scrollYProgress={scrollYProgress}
              itemClassName={itemClassName}
              staggerFactor={staggerFactor}
              animationDuration={animationDuration}
              opacityRange={opacity}
              blurRange={blur}
              yRange={y}
              scaleRange={scale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BlurScrollReveal;
