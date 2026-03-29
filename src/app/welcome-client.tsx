"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { authProviders } from "@/lib/auth-blueprint";
import styles from "./page.module.css";

const loginOptions = [
  {
    ...authProviders[0],
    tone: "wechat",
    icon: WechatIcon,
  },
  {
    ...authProviders[1],
    tone: "google",
    icon: GoogleIcon,
  },
  {
    ...authProviders[2],
    tone: "phone",
    icon: PhoneIcon,
  },
] as const;

export default function WelcomeClient() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [hideQueryError, setHideQueryError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = hideQueryError ? null : searchParams.get("authError");
  const queryErrorMessage = authError
    ? (() => {
        const [type, extra] = authError.split(":");

        if (type === "wechat_config") {
          return "微信登录暂不可用，请稍后再试。";
        }

        if (type === "google_config") {
          return "Google 登录暂不可用，请稍后再试。";
        }

        if (extra) {
          return "授权过程没有完成，请重新发起登录。";
        }

        return "授权过程没有完成，请重新发起登录。";
      })()
    : "";
  const effectiveErrorMessage = errorMessage || queryErrorMessage;
  const isSheetOpen = isLoginOpen || Boolean(queryErrorMessage);

  async function handleProviderStart(provider: "wechat" | "google") {
    setErrorMessage("");
    setStatusMessage("");

    const response = await fetch(`/api/auth/${provider}/start`, {
      method: "POST",
    });

    const result = (await response.json()) as {
      ok: boolean;
      authorizeUrl?: string;
      message?: string;
    };

    if (!response.ok || !result.ok || !result.authorizeUrl) {
      setErrorMessage(
        provider === "wechat"
          ? "微信登录暂不可用，请稍后再试。"
          : "Google 登录暂不可用，请稍后再试。",
      );
      return;
    }

    setStatusMessage("正在跳转授权页面...");
    window.location.assign(result.authorizeUrl);
  }

  async function handleGuestLogin() {
    setErrorMessage("");
    setStatusMessage("");

    const response = await fetch("/api/auth/guest", {
      method: "POST",
    });
    const result = (await response.json()) as {
      ok: boolean;
      redirectTo?: string;
      message?: string;
    };

    if (!response.ok || !result.ok || !result.redirectTo) {
      setErrorMessage(result.message ?? "游客登录失败。");
      return;
    }

    setStatusMessage("正在进入首页...");
    router.push(result.redirectTo);
    router.refresh();
  }

  async function handleSendCode() {
    setErrorMessage("");
    setStatusMessage("");

    const response = await fetch("/api/auth/phone/send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
    });
    const result = (await response.json()) as {
      ok: boolean;
      message?: string;
      provider?: string;
      debugCode?: string;
    };

    if (!response.ok || !result.ok) {
      setErrorMessage(result.message ?? "验证码发送失败。");
      return;
    }

    setStatusMessage(
      result.provider === "mock"
        ? "测试环境验证码已生成，请查看浏览器控制台。"
        : "验证码已发送，请注意查收短信。",
    );

    if (result.debugCode) {
      console.info("Mock verification code:", result.debugCode);
    }
  }

  async function handlePhoneLogin() {
    setErrorMessage("");
    setStatusMessage("");

    const response = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, code }),
    });
    const result = (await response.json()) as {
      ok: boolean;
      redirectTo?: string;
      message?: string;
    };

    if (!response.ok || !result.ok || !result.redirectTo) {
      setErrorMessage(result.message ?? "手机号登录失败。");
      return;
    }

    setStatusMessage("登录成功，正在进入首页...");
    router.push(result.redirectTo);
    router.refresh();
  }

  function resetPanel() {
    setIsPhoneMode(false);
    setPhone("");
    setCode("");
    setStatusMessage("");
    setErrorMessage("");
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />

      <section className={styles.stage}>
        <motion.div
          className={styles.brand}
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className={styles.title}>摸鱼</h1>
        </motion.div>

        <div className={styles.space} aria-hidden="true" />

        <motion.div
          className={styles.loginDock}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.button
            type="button"
            className={styles.primaryAction}
            whileTap={{ scale: 0.96 }}
            disabled={isPending}
            onClick={() => {
              resetPanel();
              setIsLoginOpen(true);
            }}
          >
            登录
          </motion.button>
        </motion.div>
      </section>

      <AnimatePresence>
        {isSheetOpen ? (
          <>
            <motion.button
              type="button"
              className={styles.backdrop}
              aria-label="关闭登录弹窗"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setIsLoginOpen(false);
                setHideQueryError(true);
              }}
            />

            <motion.section
              className={styles.sheet}
              aria-label="登录方式"
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.8 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.sheetHandle} />
              <div className={styles.sheetHeader}>
                <div>
                  <h2 className={styles.sheetTitle}>登录</h2>
                </div>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="关闭"
                  onClick={() => {
                    setIsLoginOpen(false);
                    setHideQueryError(true);
                    resetPanel();
                  }}
                >
                  ×
                </button>
              </div>

              {!isPhoneMode ? (
                <div className={styles.loginList} aria-label="Login options">
                  {loginOptions.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <motion.button
                        key={item.label}
                        type="button"
                        className={`${styles.loginButton} ${styles[item.tone]}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{
                          duration: 0.26,
                          delay: 0.05 + index * 0.04,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileTap={{ scale: 0.985 }}
                        disabled={isPending}
                        onClick={() => {
                          if (item.key === "phone") {
                            setIsPhoneMode(true);
                            setErrorMessage("");
                            setStatusMessage("");
                            return;
                          }

                          startTransition(() => {
                            void handleProviderStart(item.key);
                          });
                        }}
                      >
                        <span className={styles.loginLeft}>
                          <span className={styles.iconWrap}>
                            <Icon />
                          </span>
                          <span className={styles.loginMeta}>
                            <span className={styles.loginText}>{item.label}</span>
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  className={styles.phonePanel}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className={styles.inputWrap}>
                    <span className={styles.inputLabel}>手机号</span>
                    <input
                      className={styles.input}
                      inputMode="tel"
                      placeholder="请输入手机号"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </label>

                  <div className={styles.codeRow}>
                    <label className={styles.inputWrap}>
                      <span className={styles.inputLabel}>验证码</span>
                      <input
                        className={styles.input}
                        inputMode="numeric"
                        placeholder="6 位验证码"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className={styles.codeButton}
                      disabled={isPending}
                      onClick={() => {
                        startTransition(() => {
                          void handleSendCode();
                        });
                      }}
                    >
                      发验证码
                    </button>
                  </div>

                  <div className={styles.phoneActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={isPending}
                      onClick={() => {
                        setIsPhoneMode(false);
                        setCode("");
                        setStatusMessage("");
                        setErrorMessage("");
                      }}
                    >
                      返回
                    </button>
                    <button
                      type="button"
                      className={styles.submitButton}
                      disabled={isPending}
                      onClick={() => {
                        startTransition(() => {
                          void handlePhoneLogin();
                        });
                      }}
                    >
                      验证登录
                    </button>
                  </div>
                </motion.div>
              )}

              {statusMessage ? <p className={styles.statusMessage}>{statusMessage}</p> : null}
              {effectiveErrorMessage ? (
                <p className={styles.errorMessage}>{effectiveErrorMessage}</p>
              ) : null}
              <motion.button
                type="button"
                className={styles.guestButton}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.24, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.98 }}
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    void handleGuestLogin();
                  });
                }}
              >
                <span className={styles.guestLeft}>
                  <span className={`${styles.iconWrap} ${styles.guestIconWrap}`}>
                    <GuestIcon />
                  </span>
                  <span className={styles.guestText}>游客模式</span>
                </span>
              </motion.button>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M8.3 5C4.82 5 2 7.43 2 10.42c0 1.72.95 3.23 2.43 4.22L3.7 17l2.72-1.39c.6.16 1.22.24 1.88.24 3.47 0 6.3-2.43 6.3-5.43S11.77 5 8.3 5Zm-2.47 4.63a.84.84 0 1 1 0-1.68.84.84 0 0 1 0 1.68Zm4.95 0a.84.84 0 1 1 0-1.68.84.84 0 0 1 0 1.68Zm6 1.12c-2.88 0-5.22 1.95-5.22 4.35 0 1.33.72 2.5 1.87 3.3l-.58 1.74 1.98-1.01c.62.16 1.28.25 1.95.25 2.88 0 5.22-1.94 5.22-4.34 0-2.4-2.34-4.29-5.22-4.29Zm-1.72 3.44a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Zm3.44 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.33-.17-1.95H12v3.69h5.38a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.88-1.73 2.99-4.29 2.99-7.26Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.22-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.75-5.6-4.11H3.08v2.58A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9A5.96 5.96 0 0 1 6.09 12c0-.66.11-1.3.31-1.9V7.52H3.08A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.48l3.32-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.8.5 3.84 1.49l2.88-2.88C16.95 2.97 14.7 2 12 2a10 10 0 0 0-8.92 5.52L6.4 10.1c.79-2.36 3-4.12 5.6-4.12Z"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M8 2.5A2.5 2.5 0 0 0 5.5 5v14A2.5 2.5 0 0 0 8 21.5h8a2.5 2.5 0 0 0 2.5-2.5V5A2.5 2.5 0 0 0 16 2.5H8Zm0 2h8a.5.5 0 0 1 .5.5V17h-9V5a.5.5 0 0 1 .5-.5Zm4 15.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"
      />
    </svg>
  );
}

function GuestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        fill="currentColor"
        d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.08 0-7.5 2.05-7.5 4.5 0 .83.67 1.5 1.5 1.5h12c.83 0 1.5-.67 1.5-1.5 0-2.45-3.42-4.5-7.5-4.5Z"
      />
    </svg>
  );
}
