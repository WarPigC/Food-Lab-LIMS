const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/aiper')
  .then(async () => {
    console.log('Connected to MongoDB');

    const users = [
      {
        name: 'Micro Head',
        email: 'microhead@foodlab.com',
        phone: '1234567890',
        role: 'HEAD',
        department: 'Micro',
        password: 'microhead123',
        requiresPasswordChange: false
      },
      {
        name: 'Chemical Head',
        email: 'chemicalhead@foodlab.com',
        phone: '1234567890',
        role: 'HEAD',
        department: 'Chemical',
        password: 'chemicalhead123',
        requiresPasswordChange: false
      },
      {
        name: 'Micro Analyst',
        email: 'microanalyst@foodlab.com',
        phone: '1234567890',
        role: 'ASSISTANT',
        department: 'Micro',
        password: 'microanalyst123',
        requiresPasswordChange: false
      },
      {
        name: 'Chemical Analyst',
        email: 'chemicalanalyst@foodlab.com',
        phone: '1234567890',
        role: 'ASSISTANT',
        department: 'Chemical',
        password: 'chemicalanalyst123',
        requiresPasswordChange: false
      }
    ];

    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`Created user: ${u.email}`);
      } else {
        console.log(`User already exists: ${u.email}`);
      }
    }

    console.log('Done seeding additional roles.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
