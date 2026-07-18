import Image from "next/image";
import Link from "next/link";

import { getOperatorConsoleData } from "@/lib/gap-content";
import styles from "./operator.module.css";
import {
  createBackgroundAction,
  createCopyEntryAction,
  deleteBackgroundAction,
  deleteCopyEntryAction,
  updateBackgroundAction,
  updateCopyEntryAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function OperatorPage() {
  const { catalog, activities, backgrounds, copyEntries, cities } = await getOperatorConsoleData();

  const optionLabelById = new Map(
    catalog.dimensionGroups.flatMap((group) =>
      group.options.map((option) => [option.id, `${group.label} · ${option.label}`] as const),
    ),
  );
  const activityLabelById = new Map(activities.map((activity) => [activity.id, activity.name]));
  const dimensionUsage = new Map<string, number>();

  copyEntries.forEach((entry) => {
    entry.dimensions.forEach((item) => {
      dimensionUsage.set(item.optionId, (dimensionUsage.get(item.optionId) ?? 0) + 1);
    });
  });
  backgrounds.forEach((entry) => {
    entry.dimensions.forEach((item) => {
      dimensionUsage.set(item.optionId, (dimensionUsage.get(item.optionId) ?? 0) + 1);
    });
  });

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Operator Console</p>
          <h1 className={styles.title}>间隙时光内容台</h1>
        </div>
        <div className={styles.heroLinks}>
          <Link href="/forest" className={styles.linkButton}>
            回到森林
          </Link>
          <Link href="/" className={styles.linkButton}>
            欢迎页
          </Link>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <StatCard label="行为" value={String(activities.length)} />
        <StatCard label="维度组选项" value={String(catalog.dimensionGroups.reduce((sum, group) => sum + group.options.length, 0))} />
        <StatCard label="文案" value={String(copyEntries.length)} />
        <StatCard label="背景图" value={String(backgrounds.length)} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Dimension Map</p>
            <h2 className={styles.sectionTitle}>当前维度总览</h2>
          </div>
        </div>

        <div className={styles.dimensionGrid}>
          {catalog.dimensionGroups.map((group) => (
            <article key={group.id} className={styles.dimensionCard}>
              <h3 className={styles.dimensionTitle}>{group.label}</h3>
              <p className={styles.dimensionDescription}>{group.description}</p>
              <div className={styles.dimensionPills}>
                {group.options.map((option) => (
                  <span key={option.id} className={styles.dimensionPill}>
                    {option.label}
                    <em>{dimensionUsage.get(option.id) ?? 0}</em>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Copywriting</p>
            <h2 className={styles.sectionTitle}>新增文案</h2>
          </div>
        </div>

        <form action={createCopyEntryAction} className={styles.formCard}>
          <CopyEntryFields
            activities={activities}
            dimensionGroups={catalog.dimensionGroups}
            submitLabel="创建文案"
          />
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Copywriting</p>
            <h2 className={styles.sectionTitle}>文案库</h2>
          </div>
        </div>

        <div className={styles.stack}>
          {copyEntries.map((entry) => (
            <details key={entry.id} className={styles.record}>
              <summary className={styles.recordSummary}>
                <div>
                  <p className={styles.recordMeta}>
                    {entry.kind} {entry.isActive ? "· 启用" : "· 已停用"}
                  </p>
                  <h3 className={styles.recordTitle}>{entry.title}</h3>
                  <p className={styles.recordPreview}>{entry.content}</p>
                </div>
                <div className={styles.summaryTags}>
                  {entry.activityId ? <span>{activityLabelById.get(entry.activityId) ?? "通用"}</span> : null}
                  {entry.dimensions.slice(0, 3).map((dimension) => (
                    <span key={dimension.optionId}>{optionLabelById.get(dimension.optionId) ?? dimension.optionId}</span>
                  ))}
                </div>
              </summary>

              <form action={updateCopyEntryAction} className={styles.editForm}>
                <input type="hidden" name="id" value={entry.id} />
                <CopyEntryFields
                  activities={activities}
                  dimensionGroups={catalog.dimensionGroups}
                  submitLabel="保存文案"
                  defaults={{
                    slug: entry.slug,
                    kind: entry.kind,
                    activityId: entry.activityId ?? "",
                    title: entry.title,
                    content: entry.content,
                    notes: entry.notes ?? "",
                    minDurationSec: entry.minDurationSec?.toString() ?? "",
                    maxDurationSec: entry.maxDurationSec?.toString() ?? "",
                    weight: String(entry.weight),
                    dropRate: String(entry.dropRate),
                    isActive: entry.isActive,
                    dimensionOptionIds: entry.dimensions.map((item) => item.optionId),
                  }}
                />
              </form>

              <form action={deleteCopyEntryAction} className={styles.deleteForm}>
                <input type="hidden" name="id" value={entry.id} />
                <button type="submit" className={styles.deleteAction}>
                  删除这条文案
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Backgrounds</p>
            <h2 className={styles.sectionTitle}>新增背景图记录</h2>
          </div>
        </div>

        <form action={createBackgroundAction} className={styles.formCard}>
          <BackgroundFields
            activities={activities}
            dimensionGroups={catalog.dimensionGroups}
            submitLabel="创建背景图"
          />
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Backgrounds</p>
            <h2 className={styles.sectionTitle}>背景图库</h2>
          </div>
        </div>

        <div className={styles.backgroundGrid}>
          {backgrounds.map((background) => (
            <details key={background.id} className={styles.backgroundCard}>
              <summary className={styles.backgroundSummary}>
                <div className={styles.backgroundPreview}>
                  <Image
                    src={background.imagePath}
                    alt={background.title}
                    fill
                    sizes="(min-width: 768px) 260px, 100vw"
                    className={styles.backgroundImage}
                  />
                </div>
                <div className={styles.backgroundMeta}>
                  <p className={styles.recordMeta}>
                    {background.isActive ? "启用中" : "已停用"} · {background.sourceName}
                  </p>
                  <h3 className={styles.recordTitle}>{background.title}</h3>
                  <p className={styles.recordPreview}>{background.imagePath}</p>
                </div>
              </summary>

              <form action={updateBackgroundAction} className={styles.editForm}>
                <input type="hidden" name="id" value={background.id} />
                <BackgroundFields
                  activities={activities}
                  dimensionGroups={catalog.dimensionGroups}
                  submitLabel="保存背景图"
                  defaults={{
                    slug: background.slug,
                    title: background.title,
                    imagePath: background.imagePath,
                    sourceName: background.sourceName,
                    sourcePageUrl: background.sourcePageUrl,
                    photographerName: background.photographerName ?? "",
                    licenseLabel: background.licenseLabel ?? "",
                    blurColor: background.blurColor ?? "",
                    description: background.description ?? "",
                    activityId: background.activityId ?? "",
                    sortOrder: String(background.sortOrder),
                    isActive: background.isActive,
                    dimensionOptionIds: background.dimensions.map((item) => item.optionId),
                  }}
                />
              </form>

              <form action={deleteBackgroundAction} className={styles.deleteForm}>
                <input type="hidden" name="id" value={background.id} />
                <button type="submit" className={styles.deleteAction}>
                  删除这张背景图
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Supporting Data</p>
            <h2 className={styles.sectionTitle}>行为与城市换算样例</h2>
          </div>
        </div>

        <div className={styles.supportGrid}>
          <article className={styles.sideCard}>
            <h3 className={styles.sideTitle}>行为集合</h3>
            <ul className={styles.simpleList}>
              {activities.map((activity) => (
                <li key={activity.id}>
                  <strong>{activity.name}</strong>
                  <span>{activity.prompt ?? "暂无提示"}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.sideCard}>
            <h3 className={styles.sideTitle}>城市小吃换算</h3>
            <ul className={styles.simpleList}>
              {cities.map((city) => (
                <li key={city.id}>
                  <strong>{city.name}</strong>
                  <span>{city.snacks.map((snack) => snack.name).join(" / ")}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </article>
  );
}

function CopyEntryFields({
  activities,
  dimensionGroups,
  submitLabel,
  defaults,
}: {
  activities: Array<{ id: string; name: string }>;
  dimensionGroups: Awaited<ReturnType<typeof getOperatorConsoleData>>["catalog"]["dimensionGroups"];
  submitLabel: string;
  defaults?: {
    slug: string;
    kind: string;
    activityId: string;
    title: string;
    content: string;
    notes: string;
    minDurationSec: string;
    maxDurationSec: string;
    weight: string;
    dropRate: string;
    isActive: boolean;
    dimensionOptionIds: string[];
  };
}) {
  const allOptions = dimensionGroups.flatMap((group) =>
    group.options.map((option) => ({
      id: option.id,
      label: `${group.label} · ${option.label}`,
    })),
  );

  return (
    <>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Slug</span>
          <input name="slug" defaultValue={defaults?.slug ?? ""} className={styles.input} placeholder="可留空，自动生成" />
        </label>

        <label className={styles.field}>
          <span>类型</span>
          <select name="kind" defaultValue={defaults?.kind ?? "RESULT"} className={styles.input}>
            <option value="RESULT">RESULT</option>
            <option value="CARD">CARD</option>
            <option value="GREETING">GREETING</option>
            <option value="GUIDE">GUIDE</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>行为</span>
          <select name="activityId" defaultValue={defaults?.activityId ?? ""} className={styles.input}>
            <option value="">通用</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.checkboxRow}>
          <input type="checkbox" name="isActive" defaultChecked={defaults?.isActive ?? true} />
          <span>启用这条文案</span>
        </label>
      </div>

      <label className={styles.field}>
        <span>标题</span>
        <input name="title" defaultValue={defaults?.title ?? ""} className={styles.input} required />
      </label>

      <label className={styles.field}>
        <span>正文</span>
        <textarea name="content" defaultValue={defaults?.content ?? ""} className={styles.textarea} rows={4} required />
      </label>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>最短时长（秒）</span>
          <input name="minDurationSec" defaultValue={defaults?.minDurationSec ?? ""} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>最长时长（秒）</span>
          <input name="maxDurationSec" defaultValue={defaults?.maxDurationSec ?? ""} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>权重</span>
          <input name="weight" defaultValue={defaults?.weight ?? "100"} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>掉落率（卡片用）</span>
          <input name="dropRate" defaultValue={defaults?.dropRate ?? "20"} className={styles.input} />
        </label>
      </div>

      <label className={styles.field}>
        <span>备注</span>
        <input name="notes" defaultValue={defaults?.notes ?? ""} className={styles.input} />
      </label>

      <label className={styles.field}>
        <span>维度标签</span>
        <select
          name="dimensionOptionIds"
          multiple
          defaultValue={defaults?.dimensionOptionIds ?? []}
          className={styles.multiSelect}
        >
          {allOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className={styles.submitButton}>
        {submitLabel}
      </button>
    </>
  );
}

function BackgroundFields({
  activities,
  dimensionGroups,
  submitLabel,
  defaults,
}: {
  activities: Array<{ id: string; name: string }>;
  dimensionGroups: Awaited<ReturnType<typeof getOperatorConsoleData>>["catalog"]["dimensionGroups"];
  submitLabel: string;
  defaults?: {
    slug: string;
    title: string;
    imagePath: string;
    sourceName: string;
    sourcePageUrl: string;
    photographerName: string;
    licenseLabel: string;
    blurColor: string;
    description: string;
    activityId: string;
    sortOrder: string;
    isActive: boolean;
    dimensionOptionIds: string[];
  };
}) {
  const allOptions = dimensionGroups.flatMap((group) =>
    group.options.map((option) => ({
      id: option.id,
      label: `${group.label} · ${option.label}`,
    })),
  );

  return (
    <>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Slug</span>
          <input name="slug" defaultValue={defaults?.slug ?? ""} className={styles.input} placeholder="可留空，自动生成" />
        </label>

        <label className={styles.field}>
          <span>行为归属</span>
          <select name="activityId" defaultValue={defaults?.activityId ?? ""} className={styles.input}>
            <option value="">通用</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>排序</span>
          <input name="sortOrder" defaultValue={defaults?.sortOrder ?? "0"} className={styles.input} />
        </label>

        <label className={styles.checkboxRow}>
          <input type="checkbox" name="isActive" defaultChecked={defaults?.isActive ?? true} />
          <span>启用这张背景图</span>
        </label>
      </div>

      <label className={styles.field}>
        <span>标题</span>
        <input name="title" defaultValue={defaults?.title ?? ""} className={styles.input} required />
      </label>

      <label className={styles.field}>
        <span>图片路径</span>
        <input name="imagePath" defaultValue={defaults?.imagePath ?? ""} className={styles.input} required />
      </label>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>来源平台</span>
          <input name="sourceName" defaultValue={defaults?.sourceName ?? "Pixabay"} className={styles.input} required />
        </label>

        <label className={styles.field}>
          <span>作者</span>
          <input name="photographerName" defaultValue={defaults?.photographerName ?? ""} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>许可标签</span>
          <input
            name="licenseLabel"
            defaultValue={defaults?.licenseLabel ?? "Pixabay Content License"}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>主色</span>
          <input name="blurColor" defaultValue={defaults?.blurColor ?? ""} className={styles.input} placeholder="#7c94a0" />
        </label>
      </div>

      <label className={styles.field}>
        <span>来源页链接</span>
        <input name="sourcePageUrl" defaultValue={defaults?.sourcePageUrl ?? ""} className={styles.input} required />
      </label>

      <label className={styles.field}>
        <span>描述</span>
        <textarea
          name="description"
          defaultValue={defaults?.description ?? ""}
          className={styles.textarea}
          rows={3}
        />
      </label>

      <label className={styles.field}>
        <span>维度标签</span>
        <select
          name="dimensionOptionIds"
          multiple
          defaultValue={defaults?.dimensionOptionIds ?? []}
          className={styles.multiSelect}
        >
          {allOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className={styles.submitButton}>
        {submitLabel}
      </button>
    </>
  );
}
