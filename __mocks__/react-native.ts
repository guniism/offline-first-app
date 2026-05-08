export const Platform = {
  OS: 'ios' as const,
  select: <T extends Record<string, unknown>>(obj: T): T[keyof T] =>
    (obj.ios ?? obj.default) as T[keyof T],
};
