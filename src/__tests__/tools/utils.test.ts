import { normalizeUsername } from '../../tools/utils';

describe('utils tests', () => {
  describe('nameNormalizer', () => {
    test.each([
      ['TeSt', 'test'],
      ['te.st', 'test'],
      ['test+123', 'test'],
      ['te.st+123', 'test'],
    ])('normalizing %p and expecting %p', (input, expected) => {
      // when:
      const result = normalizeUsername(input);
      // then:
      expect(result).toEqual(expected);
    });
  });
});
