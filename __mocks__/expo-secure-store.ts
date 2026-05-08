export const _store: Record<string, string> = {};

export const setItemAsync = jest.fn(async (key: string, value: string) => {
  _store[key] = value;
});

export const getItemAsync = jest.fn(async (key: string) => {
  return _store[key] ?? null;
});

export const deleteItemAsync = jest.fn(async (key: string) => {
  delete _store[key];
});

export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
