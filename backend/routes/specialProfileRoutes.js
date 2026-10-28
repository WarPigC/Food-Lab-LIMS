const express = require('express');
const router = express.Router();
const SpecialProfile = require('../models/SpecialProfile');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { cacheMiddleware, invalidateByPrefix } = require('../utils/serverCache');

// GET /api/special-profiles
// Returns summary of all profiles (key, label, description, isExclusive, parameterCount, variants summary)
router.get('/', protect, cacheMiddleware('specialProfiles'), async (req, res) => {
  try {
    const docs = await SpecialProfile.find().sort({ createdAt: 1 });
    const summary = docs.map(p => ({
      _id: p._id,
      key: p.key,
      label: p.label,
      description: p.description,
      isExclusive: p.isExclusive,
      parameterCount: p.parameters ? p.parameters.length : 0,
      variants: (p.variants || []).map(v => ({
        key: v.key,
        label: v.label,
        parameterCount: v.parameters ? v.parameters.length : 0
      }))
    }));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching special profiles', error: err.message });
  }
});

// GET /api/special-profiles/:key
// Full profile including all parameters (for editor)
router.get('/:key', protect, authorize('ADMIN_OFFICER', 'HEAD', 'ADMIN'), async (req, res) => {
  try {
    const profile = await SpecialProfile.findOne({ key: req.params.key });
    if (!profile) return res.status(404).json({ message: `Special profile "${req.params.key}" not found` });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching special profile', error: err.message });
  }
});

// PUT /api/special-profiles/:key/parameters
// Update top-level parameters array (waterIso10500)
router.put('/:key/parameters', protect, authorize('ADMIN_OFFICER', 'HEAD', 'ADMIN'), async (req, res) => {
  try {
    if (req.params.key === 'waterIso10500') {
      return res.status(403).json({ message: 'Water ISO 10500 is a locked standard profile and cannot be modified.' });
    }
    const { parameters } = req.body;
    if (!Array.isArray(parameters)) {
      return res.status(400).json({ message: 'parameters must be an array' });
    }
    const profile = await SpecialProfile.findOne({ key: req.params.key });
    if (!profile) return res.status(404).json({ message: `Special profile "${req.params.key}" not found` });

    profile.parameters = parameters;
    await profile.save();

    invalidateByPrefix('specialProfiles');
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Error updating special profile parameters', error: err.message });
  }
});

// PUT /api/special-profiles/:key/variants/:variantKey/parameters
// Update parameters array for a specific variant (fattyAcids or pesticides)
router.put('/:key/variants/:variantKey/parameters', protect, authorize('ADMIN_OFFICER', 'HEAD', 'ADMIN'), async (req, res) => {
  try {
    const { parameters } = req.body;
    if (!Array.isArray(parameters)) {
      return res.status(400).json({ message: 'parameters must be an array' });
    }
    const profile = await SpecialProfile.findOne({ key: req.params.key });
    if (!profile) return res.status(404).json({ message: `Special profile "${req.params.key}" not found` });

    const variant = (profile.variants || []).find(v => v.key === req.params.variantKey);
    if (!variant) {
      return res.status(404).json({ message: `Variant "${req.params.variantKey}" not found in special profile "${req.params.key}"` });
    }

    variant.parameters = parameters;
    await profile.save();

    invalidateByPrefix('specialProfiles');
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Error updating variant parameters', error: err.message });
  }
});

module.exports = router;
