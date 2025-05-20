import { normalizeUsername, parsePositiveIntOrDefault } from '../../../service/tools/utils';

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

  describe('parsePositiveIntOrDefault', () => {
    test('return undefined if no params provided', () => {
      // when
      const result = parsePositiveIntOrDefault();
      // then
      expect(result).toBeUndefined();
    });

    test.each([
      [''],
      ['abc'],
      ['-1'],
      ['0'],
    ])('return undefined if invalid %p value and default value not provided', (value) => {
      // when
      const result = parsePositiveIntOrDefault(value);
      // then
      expect(result).toBeUndefined();
    });

    test.each([
      [''],
      ['abc'],
      ['-1'],
      ['0'],
    ])('return default value when invalid %p value provided', (value) => {
      // when
      const result = parsePositiveIntOrDefault(value, 10);
      // then
      expect(result).toEqual(10);
    });

    test('return parsed value, default value not provided', () => {
      // when
      const result = parsePositiveIntOrDefault('123');
      // then
      expect(result).toEqual(123);
    });

    test('return parsed value, default value provided', () => {
      // when
      const result = parsePositiveIntOrDefault('123', 10);
      // then
      expect(result).toEqual(123);
    });
  });
});
