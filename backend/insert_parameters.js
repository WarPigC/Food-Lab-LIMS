const mongoose = require('mongoose');
const fs = require('fs');

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
  
  const rawParams = JSON.parse(fs.readFileSync('../temp/extracted_parameters.json', 'utf8'));

  let cleanParams = new Set();
  for (let p of rawParams) {
    p = p.trim();
    p = p.replace(/^(FSSAI|FTL\/AI|FSSA|FTL)\s*/i, '');
    p = p.replace(/\{CAS\s*#.*$/i, '');
    p = p.replace(/\s+Issue\s+Date:.*$/i, '');
    p = p.replace(/\s+Date:.*$/i, '');
    p = p.replace(/^(Issu|Issue)\s+/i, '');
    p = p.replace(/\}[\s]*$/, '');
    p = p.replace(/^\([\w.]+\)\s*/, ''); 
    if (p.includes('s not require any signature')) continue;
    if (p.includes('characteristic tested')) continue;
    if (p.includes('Speciﬁc Test')) continue;
    if (p.length < 3) continue;
    p = p.trim();
    if (p) cleanParams.add(p);
  }

  const getUnit = (name) => {
    const n = name.toLowerCase();
    if (n.includes('detection') || n.includes('salmonella') || n.includes('listeria') || n.includes('vibrio')) return 'Absent/25g';
    if (n.includes('enumeration') || n.includes('count') || n.includes('aerobic') || n.includes('yeast') || n.includes('mould') || n.includes('coliform') || n.includes('bacillus')) return 'CFU/g';
    if (n.includes('moisture') || n.includes('ash') || n.includes('protein') || n.includes('fat') || n.includes('carbohydrate') || n.includes('acid') || n.includes('fibre')) return '%';
    if (n.includes('lead') || n.includes('arsenic') || n.includes('cadmium') || n.includes('mercury') || n.includes('copper') || n.includes('zinc') || n.includes('iron')) return 'mg/kg';
    if (n.includes('pesticide') || n.includes('ddt') || n.includes('aldrin') || n.includes('endosulfan')) return 'mg/kg';
    if (n.includes('energy')) return 'kcal/100g';
    return '-'; // default
  };

  const finalParams = Array.from(cleanParams);
  const lastParam = await Parameter.findOne().sort('-s_no');
  let currentSno = lastParam && lastParam.s_no ? lastParam.s_no + 1 : 1;

  const bulkOps = finalParams.map(name => ({
    updateOne: {
      filter: { name: name },
      update: {
        $setOnInsert: {
          s_no: currentSno++,
          name: name,
          type: 'Micro',
          unit: getUnit(name),
          group: null,
          subGroup: null
        }
      },
      upsert: true
    }
  }));

  const res = await Parameter.bulkWrite(bulkOps, { ordered: false });
  console.log(`Inserted ${res.upsertedCount} new micro parameters.`);
  process.exit(0);
}

run().catch(console.error);
