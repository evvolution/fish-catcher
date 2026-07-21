export function shuffleFishOrder<T extends { slug: string }>(items: readonly T[], previousSlug?: string) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[next]] = [shuffled[next], shuffled[index]];
  }

  if (previousSlug && shuffled.length > 1 && shuffled[0]?.slug === previousSlug) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}
