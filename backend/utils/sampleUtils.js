/**
 * Sample Handover Utility
 * Determines if physical sample handover between departments is required.
 */

/**
 * Returns true only when both departments are required AND sample_count <= 1.
 * When sample_count > 1, each lab gets its own physical container, so no handover is needed.
 *
 * @param {Object} job - Job object containing distribution and sample
 * @returns {boolean}
 */
function isSampleHandoverRequired(job) {
  const micro = job?.distribution?.micro?.required;
  const chemical = job?.distribution?.chemical?.required;
  const count = job?.sample?.sample_count;
  return !!(micro && chemical && (!count || count <= 1));
}

module.exports = { isSampleHandoverRequired };
