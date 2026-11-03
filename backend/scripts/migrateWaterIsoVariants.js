const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const SpecialProfile = require('../models/SpecialProfile');
const Job = require('../models/Job');
const { WATER_ISO_SHORT_PARAMS } = require('../utils/specialProfileConstants');

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aiper';
  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);

  console.log('Migrating waterIso10500 in specialprofiles collection...');
  const waterProfile = await SpecialProfile.findOne({ key: 'waterIso10500' });
  if (waterProfile) {
    waterProfile.variants = [
      {
        key: 'full',
        label: 'Full 60+ Parameters',
        parameters: waterProfile.parameters || []
      },
      {
        key: 'short',
        label: 'Short / 3 Parameters',
        parameters: WATER_ISO_SHORT_PARAMS
      }
    ];
    await waterProfile.save();
    console.log('Updated waterIso10500 profile variants successfully.');
  } else {
    console.log('waterIso10500 profile not found in database.');
  }

  console.log('Migrating jobs with waterIso10500 enabled...');
  // Update jobs where waterIso10500 is boolean true
  const resTrue = await Job.updateMany(
    { 'specialProfiles.waterIso10500': true },
    { $set: { 'specialProfiles.waterIso10500': { enabled: true, variant: 'full' } } }
  );
  console.log(`Updated ${resTrue.modifiedCount} jobs with waterIso10500: true to { enabled: true, variant: 'full' }`);

  // Update jobs where waterIso10500 is boolean false
  const resFalse = await Job.updateMany(
    { 'specialProfiles.waterIso10500': false },
    { $set: { 'specialProfiles.waterIso10500': { enabled: false, variant: null } } }
  );
  console.log(`Updated ${resFalse.modifiedCount} jobs with waterIso10500: false to { enabled: false, variant: null }`);

  console.log('Migration completed successfully.');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

