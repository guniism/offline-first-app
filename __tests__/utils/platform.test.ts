import * as platform from '../../utils/platform';

describe('platform', () => {
  it('exports all platform flags as booleans', () => {
    expect(typeof platform.isWeb).toBe('boolean');
    expect(typeof platform.isIOS).toBe('boolean');
    expect(typeof platform.isAndroid).toBe('boolean');
    expect(typeof platform.isWindows).toBe('boolean');
    expect(typeof platform.supportsSecureStore).toBe('boolean');
  });

  it('supportsSecureStore equals isIOS || isAndroid', () => {
    expect(platform.supportsSecureStore).toBe(platform.isIOS || platform.isAndroid);
  });

  it('at most one platform flag is true', () => {
    const flags = [platform.isIOS, platform.isAndroid, platform.isWeb, platform.isWindows];
    const trueCount = flags.filter(Boolean).length;
    expect(trueCount).toBeLessThanOrEqual(1);
  });
});
