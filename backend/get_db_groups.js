const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: String,
  subgroups: [String]
});
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

async function run() {
  await mongoose.connect('mongodb://choudharyji1250:krishna123@ac-abuxtii-shard-00-00.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-01.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-02.h9jlfao.mongodb.net:27017/?ssl=true&replicaSet=atlas-m5ay9i-shard-0&authSource=admin&appName=Cluster0');
  const groups = await Group.find();
  
  const dbGroups = {};
  for (const g of groups) {
    dbGroups[g.name] = g.subgroups;
  }
  
  const fs = require('fs');
  fs.writeFileSync('../temp/db_groups.json', JSON.stringify(dbGroups, null, 2));
  
  console.log('Database groups fetched.');
  process.exit(0);
}
run().catch(console.error);
