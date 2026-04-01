"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import styles from "./page.module.css";

export default function WelcomeClient() {
  const [hasTapped, setHasTapped] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!hasTapped) {
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.push("/forest");
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasTapped, router]);

  return (
    <main className={styles.page}>
      <div className={styles.heroBackdrop} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <section className={styles.stage}>
        <div className={styles.copyBlock}>
          <p className={styles.eyebrow}>间隙时光</p>
          <h1 className={styles.title}>先摸一下小鱼，再进森林。</h1>
          <p className={styles.description}>
            游客直接进入，记录默认只留在当前设备里。这里不打卡，也不催你变更好，只把碎片时间郑重接住。
          </p>
        </div>

        <motion.button
          type="button"
          className={styles.fishButton}
          whileTap={{ scale: 0.97 }}
          disabled={hasTapped || isPending}
          onClick={() => {
            setHasTapped(true);
          }}
        >
          <motion.span
            className={styles.ripple}
            animate={
              hasTapped
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
              hasTapped
                ? {
                    x: [0, 18, 54],
                    y: [0, -8, -18],
                    rotate: [0, -8, -12],
                  }
                : {
                    x: [0, 6, -4, 0],
                    y: [0, -3, 2, 0],
                    rotate: [0, -4, 3, 0],
                  }
            }
            transition={{
              duration: hasTapped ? 1 : 4.8,
              repeat: hasTapped ? 0 : Number.POSITIVE_INFINITY,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <FishIcon />
          </motion.span>

          <span className={styles.buttonText}>{hasTapped ? "小鱼带你进森林..." : "摸一下小鱼"}</span>
        </motion.button>

        <div className={styles.footer}>
          <p className={styles.hint}>当前版本先走游客闭环，后续再接选择性同步。</p>
          <div className={styles.links}>
            <Link href="/forest" className={styles.secondaryLink}>
              直接进入森林
            </Link>
            <Link href="/operator" className={styles.secondaryLink}>
              运营内容台
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FishIcon() {
  return (
    <svg viewBox="0 0 120 72" aria-hidden="true" className={styles.fishIcon}>
      <path
        d="M25 38c0-12.7 13.6-23 30.5-23 8.8 0 16.8 2.8 22.4 7.3 6.6-2 13.3-6 18.6-12.3 1.5 6.2.7 13.4-2.4 20.2 3.1 6.5 3.8 13.4 2 19.5-5.1-5.7-11.5-9.4-18-11.4-5.7 4.8-14 7.8-22.6 7.8C38.6 61 25 50.7 25 38Z"
        fill="url(#fish-body)"
      />
      <path
        d="M94 30c6 1.1 13.1 4.5 20 10.9-3.1-8.5-10-15-20-18.3v7.4Z"
        fill="url(#fish-tail)"
      />
      <circle cx="49" cy="34" r="3.8" fill="#18323d" />
      <path d="M53 46c5.8 3.2 13 3.3 19.1.2" stroke="#34515d" strokeWidth="3.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="fish-body" x1="24" y1="18" x2="100" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4f3de" />
          <stop offset="0.52" stopColor="#cfe3d8" />
          <stop offset="1" stopColor="#8dbac6" />
        </linearGradient>
        <linearGradient id="fish-tail" x1="94" y1="21" x2="114" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d3b577" />
          <stop offset="1" stopColor="#a77c4c" />
        </linearGradient>
      </defs>
    </svg>
  );
}
