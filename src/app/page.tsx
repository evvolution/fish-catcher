import { Suspense } from "react";

import styles from "./page.module.css";
import WelcomeClient from "./welcome-client";

function WelcomeFallback() {
  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div className={styles.brand}>
          <h1 className={styles.title}>摸鱼</h1>
        </div>
        <div className={styles.space} aria-hidden="true" />
        <div className={styles.loginDock}>
          <button type="button" className={styles.primaryAction}>
            登录
          </button>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<WelcomeFallback />}>
      <WelcomeClient />
    </Suspense>
  );
}
