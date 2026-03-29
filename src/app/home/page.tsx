import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";
import styles from "./page.module.css";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className={styles.page}>
        <section className={styles.stage}>
          <p className={styles.caption}>未登录</p>
          <h1 className={styles.title}>摸鱼</h1>
          <p className={styles.emptyText}>当前没有有效会话，请先从欢迎页进入登录流程。</p>
          <Link href="/" className={styles.backLink}>
            返回欢迎页
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div className={styles.header}>
          <div>
            <p className={styles.caption}>首页</p>
            <h1 className={styles.title}>摸鱼</h1>
          </div>
          <LogoutButton className={styles.logoutButton} />
        </div>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardLabel}>当前用户</p>
              <h2 className={styles.cardTitle}>{user.displayName}</h2>
            </div>
            <span className={styles.kindBadge}>{user.kind === "GUEST" ? "游客" : "正式用户"}</span>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>用户 ID</span>
              <span className={styles.infoValue}>{user.id}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>状态</span>
              <span className={styles.infoValue}>{user.status}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>角色</span>
              <span className={styles.infoValue}>{user.role}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>接入平台</span>
              <span className={styles.infoValue}>{user.session.platform}</span>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardLabel}>登录方式</p>
              <h2 className={styles.cardTitle}>已绑定身份</h2>
            </div>
          </div>

          <div className={styles.identityList}>
            {user.identities.map((identity) => (
              <article key={`${identity.provider}-${identity.providerUserId}`} className={styles.identityCard}>
                <p className={styles.identityProvider}>{identity.provider}</p>
                <p className={styles.identityValue}>
                  {identity.phone || identity.email || identity.providerUserId}
                </p>
                <p className={styles.identityMeta}>
                  {identity.isPrimary ? "主身份" : "附加身份"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardLabel}>会话信息</p>
              <h2 className={styles.cardTitle}>当前会话</h2>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>注册时间</span>
              <span className={styles.infoValue}>
                {new Intl.DateTimeFormat("zh-CN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(user.registeredAt)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>会话到期</span>
              <span className={styles.infoValue}>
                {new Intl.DateTimeFormat("zh-CN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(user.session.expiresAt)}
              </span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
