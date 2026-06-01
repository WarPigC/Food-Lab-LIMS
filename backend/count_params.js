const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
  name: String,
  type: String,
  unit: String
});

const Parameter = mongoose.models.Parameter || mongoose.model('Parameter', parameterSchema);

async function run() {
  await mongoose.connect('mongodb://choudharyji1250:krishna123@ac-abuxtii-shard-00-00.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-01.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-02.h9jlfao.mongodb.net:27017/?ssl=true&replicaSet=atlas-m5ay9i-shard-0&authSource=admin&appName=Cluster0');
  
  const count = await Parameter.countDocuments();
  console.log('Total parameters in DB:', count);
  process.exit(0);
}

run().catch(console.error);
