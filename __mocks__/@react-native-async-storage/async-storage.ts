export const _store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => _store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    _store[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete _store[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(_store).forEach((k) => delete _store[k]);
  }),
  getAllKeys: jest.fn(async () => Object.keys(_store)),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((k) => [k, _store[k] ?? null] as [string, string | null]),
  ),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([k, v]) => (_store[k] = v));
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => delete _store[k]);
  }),
};

export default AsyncStorage;
