const mongoose = require('mongoose');
const fs = require('fs');

const parameterGroupSchema = new mongoose.Schema({
  group: { type: String, required: true },
  subGroup: { type: String, required: true },
  productCategories: [{ type: String }],
  parameters: [{
    parameterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parameter' },
    name: { type: String }
  }],
  isPesticidePanel: { type: Boolean, default: false },
  pesticidePanelType: { type: String, enum: ['food', null], default: null },
  pesticideSubPanels: [{
    panelName: { type: String },
    parameters: [{
      parameterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parameter' },
      name: { type: String }
    }]
  }]
}, { timestamps: true });

parameterGroupSchema.index({ group: 1, subGroup: 1 }, { unique: true });
const ParameterGroup = mongoose.models.ParameterGroup || mongoose.model('ParameterGroup', parameterGroupSchema);

async function run() {
  await mongoose.connect('mongodb://choudharyji1250:krishna123@ac-abuxtii-shard-00-00.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-01.h9jlfao.mongodb.net:27017,ac-abuxtii-shard-00-02.h9jlfao.mongodb.net:27017/?ssl=true&replicaSet=atlas-m5ay9i-shard-0&authSource=admin&appName=Cluster0');
  
  const chemicalGroups = JSON.parse(fs.readFileSync('../temp/chemical_groups.json', 'utf8'));
  
  // Normalize function
  const normalize = str => str.toLowerCase().replace(/ and /g, ' & ').replace(/[^a-z0-9]/g, '');

  const dbGroupsCursor = await ParameterGroup.distinct('group');
  const dbGroups = Array.from(new Set(dbGroupsCursor));
  
  const chemGroupKeys = Object.keys(chemicalGroups);
  
  let insertedCount = 0;
  
  for (const dbGroup of dbGroups) {
    const normDb = normalize(dbGroup);
    
    // Find matching group in chemical_groups
    let matchedKey = null;
    for (const chem of chemGroupKeys) {
      if (normalize(chem) === normDb) {
        matchedKey = chem;
        break;
      }
    }
    
    if (matchedKey) {
      console.log(`Matched DB Group "${dbGroup}" with "${matchedKey}"`);
      // Get exact subgroups
      const exactSubgroups = chemicalGroups[matchedKey];
      
      // Delete existing for this group
      await ParameterGroup.deleteMany({ group: dbGroup });
      
      // Insert new ones
      for (const sg of exactSubgroups) {
        await ParameterGroup.create({
          group: dbGroup,
          subGroup: sg
        });
        insertedCount++;
      }
      
      // Ensure "Others"
      if (!exactSubgroups.some(s => s.toLowerCase() === 'others')) {
         await ParameterGroup.create({
          group: dbGroup,
          subGroup: 'Others'
        });
        insertedCount++;
      }
      
    } else {
      console.log(`NO MATCH FOUND FOR DB GROUP: "${dbGroup}"`);
    }
  }
  
  console.log(`Deleted all existing subgroups for matched groups. Inserted ${insertedCount} corrected subgroups.`);
  process.exit(0);
}
run().catch(console.error);
