import { normalizeUsername } from '../../tools/utils';

describe('utils tests', () => {
  describe('nameNormalizer', () => {
    test.each([
      ['TeSt', 'test'],
      ['te.st', 'test'],
      ['test+123', 'test'],
      ['te.st+123', 'test'],
      ['t.e.s.t+123', 'test'],
      ['t.e.s.t%2B123', 'test'],
      ['t.e.s.t+123+234', 'test'],
      ["t.e.s.t+12'3+234", 'test'],
    ])('normalizing %p and expecting %p', (input, expected) => {
      // when:
      const result = normalizeUsername(input);
      // then:
      expect(result).toEqual(expected);
    });
  });
});
