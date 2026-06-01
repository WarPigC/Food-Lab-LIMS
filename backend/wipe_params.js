const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
  s_no: { type: Number, unique: true },
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Micro', 'Chemical'], required: true },
  unit: { type: String, required: true },
  group: { type: String, default: null },
  subGroup: { type: String, default: null }
}, { timestamps: true });

const Parameter = mongoose.models.Parameter || mongoose.model('Parameter', parameterSchema);

async function run() {
  await mongoose.connect('mongodb://choudharyji1250:krishna123@ac-abuxtii-shard-00-00.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-01.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-02.h9jlfao.mongodb.net:27017/?ssl=true&replicaSet=atlas-m5ay9i-shard-0&authSource=admin&appName=Cluster0');
  
  // We want to delete ALL parameters because the user said:
  // "Now since group and subgroups have no relation with parameters so you just need to add them with attributes; 'micro' and their unit"
  // Wait, let's delete only the ones we added today just in case?
  // Let's delete all and reinsert the 1191 from extracted_parameters_clean.json. The user seems to be providing this PDF as the single source of truth for the "Global Parameter Library".
  
  await Parameter.deleteMany({});
  
  const fs = require('fs');
  const cleanParams = JSON.parse(fs.readFileSync('../temp/extracted_parameters_clean.json', 'utf8'));

  const getUnit = (name) => {
    const n = name.toLowerCase();
    if (n.includes('detection') || n.includes('salmonella') || n.includes('listeria') || n.includes('vibrio') || n.includes('absent')) return 'Absent/25g';
    if (n.includes('enumeration') || n.includes('count') || n.includes('aerobic') || n.includes('yeast') || n.includes('mould') || n.includes('coliform') || n.includes('bacillus')) return 'CFU/g';
    if (n.includes('moisture') || n.includes('ash') || n.includes('protein') || n.includes('fat') || n.includes('carbohydrate') || n.includes('acid') || n.includes('fibre')) return '%';
    if (n.includes('lead') || n.includes('arsenic') || n.includes('cadmium') || n.includes('mercury') || n.includes('copper') || n.includes('zinc') || n.includes('iron')) return 'mg/kg';
    if (n.includes('pesticide') || n.includes('ddt') || n.includes('aldrin') || n.includes('endosulfan')) return 'mg/kg';
    if (n.includes('energy')) return 'kcal/100g';
    return '-'; // default
  };

  const bulkOps = cleanParams.map((name, idx) => ({
    insertOne: {
      document: {
        s_no: idx + 1,
        name: name,
        type: 'Micro',
        unit: getUnit(name),
        group: null,
        subGroup: null
      }
    }
  }));

  const res = await Parameter.bulkWrite(bulkOps, { ordered: false });
  console.log(`Inserted ${res.insertedCount} completely fresh micro parameters.`);
  process.exit(0);
}

run().catch(console.error);
