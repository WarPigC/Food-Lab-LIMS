const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const TestInstance = require('./models/TestInstance');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodlab')
  .then(async () => {
    console.log('Connected to MongoDB. Running migration...');
    
    // Update Users role
    const userRes = await User.updateMany(
      { role: 'LAB_HEAD' },
      { $set: { role: 'ADMIN_OFFICER' } }
    );
    console.log(`Updated ${userRes.modifiedCount} users from LAB_HEAD to ADMIN_OFFICER`);

    // Update specific email
    const emailRes = await User.updateOne(
      { email: 'labhead@foodlab.com' },
      { $set: { email: 'adminofficer@foodlab.com' } }
    );
    if (emailRes.modifiedCount > 0) {
      console.log('Updated labhead@foodlab.com to adminofficer@foodlab.com');
    }

    // Update TestInstance roles (if any have LAB_HEAD explicitly saved)
    const testRes = await TestInstance.updateMany(
      { role: 'LAB_HEAD' },
      { $set: { role: 'ADMIN_OFFICER' } }
    );
    console.log(`Updated ${testRes.modifiedCount} TestInstances from LAB_HEAD to ADMIN_OFFICER`);

    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
