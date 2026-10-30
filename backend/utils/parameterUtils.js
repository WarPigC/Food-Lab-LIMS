/**
 * Utility functions for parameter name normalization and duplicate guarding.
 */

/**
 * Builds a regex that matches a parameter name regardless of internal whitespace variations.
 * Collapses whitespace across characters, so "0.1%" matches "0.1 %", "E.coli" matches "E. coli", etc.
 *
 * @param {string} str - Raw parameter name
 * @returns {RegExp} Regex matching the parameter with optional whitespace between characters
 */
function buildFlexibleParamRegex(str) {
  const chars = (str || '').trim().replace(/\s+/g, '').split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (chars.length === 0) {
    return /^$/;
  }
  return new RegExp('^\\s*' + chars.join('\\s*') + '\\s*$', 'i');
}

/**
 * Normalizes a parameter name for comparison by removing all whitespace and converting to lowercase.
 *
 * @param {string} str
 * @returns {string}
 */
function normalizeParamName(str) {
  return (str || '').toLowerCase().replace(/\s+/g, '');
}

module.exports = {
  buildFlexibleParamRegex,
  normalizeParamName
};

