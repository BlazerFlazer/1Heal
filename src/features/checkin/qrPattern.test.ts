import { memberShortId, qrModules } from './qrPattern';

describe('qrPattern', () => {
  it('is stable within a minute and changes with the next one', () => {
    expect(qrModules('u1', 100)).toEqual(qrModules('u1', 100));
    expect(qrModules('u1', 101)).not.toEqual(qrModules('u1', 100));
    expect(qrModules('u2', 100)).not.toEqual(qrModules('u1', 100));
  });

  it('formats a short member id', () => {
    expect(memberShortId('u1')).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
  });
});
