const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/aiper')
  .then(async () => {
    const Parameter = mongoose.model('Parameter', new mongoose.Schema({ name: String, type: String, unit: String }));
    const params = await Parameter.find();
    console.log(`Total parameters found: ${params.length}`);
    console.log(params.slice(0, 15).map(p => ({ id: p._id, name: p.name, type: p.type, unit: p.unit })));
    process.exit(0);
  });
