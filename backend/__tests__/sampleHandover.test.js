/**
 * Sample Handover Unit Tests (SP-2 P12)
 *
 * Verifies that multi-department jobs with sample_count > 1 bypass
 * the physical sample handover pipeline.
 */

const { isSampleHandoverRequired } = require('../utils/sampleUtils');

describe('isSampleHandoverRequired', () => {
  test('returns false for single-department Micro job', () => {
    const job = {
      distribution: {
        micro: { required: true },
        chemical: { required: false }
      },
      sample: { sample_count: 1 }
    };
    expect(isSampleHandoverRequired(job)).toBe(false);
  });

  test('returns false for single-department Chemical job', () => {
    const job = {
      distribution: {
        micro: { required: false },
        chemical: { required: true }
      },
      sample: { sample_count: 1 }
    };
    expect(isSampleHandoverRequired(job)).toBe(false);
  });

  test('returns true for multi-department job when sample_count is 1', () => {
    const job = {
      distribution: {
        micro: { required: true },
        chemical: { required: true }
      },
      sample: { sample_count: 1 }
    };
    expect(isSampleHandoverRequired(job)).toBe(true);
  });

  test('returns true for multi-department job when sample_count is missing or undefined', () => {
    const job = {
      distribution: {
        micro: { required: true },
        chemical: { required: true }
      },
      sample: {}
    };
    expect(isSampleHandoverRequired(job)).toBe(true);
  });

  test('returns false for multi-department job when sample_count > 1', () => {
    const job2 = {
      distribution: {
        micro: { required: true },
        chemical: { required: true }
      },
      sample: { sample_count: 2 }
    };
    expect(isSampleHandoverRequired(job2)).toBe(false);

    const job5 = {
      distribution: {
        micro: { required: true },
        chemical: { required: true }
      },
      sample: { sample_count: 5 }
    };
    expect(isSampleHandoverRequired(job5)).toBe(false);
  });
});

