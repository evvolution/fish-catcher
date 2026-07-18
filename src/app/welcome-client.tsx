"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import styles from "./page.module.css";

export default function WelcomeClient() {
  const [hasTapped, setHasTapped] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!hasTapped) {
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.push("/forest");
      });
    }, shouldReduceMotion ? 180 : 980);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasTapped, router, shouldReduceMotion]);

  return (
    <main className={styles.page}>
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.heroBackdrop} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <section className={styles.stage}>
        <header className={styles.topBar}>
          <span className={styles.wordmark}>间隙时光</span>
        </header>

        <div className={styles.copyBlock}>
          <h1 className={styles.title}>先摸一下小鱼，<br />再进森林。</h1>
        </div>

        <motion.button
          type="button"
          className={styles.fishButton}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
          disabled={hasTapped || isPending}
          aria-label={hasTapped ? "正在进入森林" : "摸一下小鱼，进入森林"}
          onClick={() => {
            setHasTapped(true);
          }}
        >
          <span className={styles.waterline} aria-hidden="true" />
          <motion.span
            className={styles.ripple}
            animate={
              shouldReduceMotion
                ? { opacity: 0.18 }
                : hasTapped
                ? {
                    scale: [1, 1.4, 1.8],
                    opacity: [0.35, 0.16, 0],
                  }
                : {
                    scale: [1, 1.12, 1],
                    opacity: [0.24, 0.34, 0.24],
                  }
            }
            transition={{
              duration: hasTapped ? 0.9 : 3.2,
              repeat: hasTapped ? 0 : Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.span
            className={styles.fish}
            animate={
              shouldReduceMotion
                ? { x: 0, y: 0, rotate: 0 }
                : hasTapped
                ? {
                    x: [0, 24, 78],
                    y: [0, -5, -14],
                    rotate: [0, -5, -9],
                  }
                : {
                    x: [0, 7, -3, 0],
                    y: [0, -2, 1, 0],
                    rotate: [0, -2, 1, 0],
                  }
            }
            transition={{
              duration: hasTapped ? 1 : 4.8,
              repeat: hasTapped ? 0 : Number.POSITIVE_INFINITY,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Image src="/assets/icons/fish.svg" alt="" width={240} height={240} className={styles.fishIcon} priority />
          </motion.span>

          <span className={styles.buttonText}>{hasTapped ? "去往森林" : "轻触"}</span>
        </motion.button>
      </section>
    </main>
  );
}
