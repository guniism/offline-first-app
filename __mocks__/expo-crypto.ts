export const getRandomValues = jest.fn(<T extends ArrayBufferView>(array: T): T => {
  const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < view.length; i++) {
    view[i] = i % 256;
  }
  return array;
});
