const mongoose = require('mongoose');
const fs = require('fs');
const xlsx = require('xlsx');
require('dotenv').config();

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
  
  // 1. Get allowed groups from excel
  const workbook = xlsx.readFile('../temp/group_data1.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const allowedGroupsRaw = new Set();
  for (let i = 1; i < data.length; i++) {
      const groupName = data[i][1];
      if (groupName && typeof groupName === 'string') {
          allowedGroupsRaw.add(groupName.trim());
      }
  }
  
  // 2. Load chemical_groups
  const chemicalGroups = JSON.parse(fs.readFileSync('../temp/chemical_groups.json', 'utf8'));
  const chemGroupKeys = Object.keys(chemicalGroups);

  const normalize = str => str.toLowerCase().replace(/ and /g, ' & ').replace(/[^a-z0-9]/g, '');

  let matchedChemicalGroups = [];

  console.log("Mapping Allowed Groups from Excel to Official Names:");
  for (const raw of allowedGroupsRaw) {
      const normRaw = normalize(raw);
      let matchedKey = null;
      for (const chem of chemGroupKeys) {
          if (normalize(chem) === normRaw) {
              matchedKey = chem;
              break;
          }
      }
      if (matchedKey) {
          if (!matchedChemicalGroups.includes(matchedKey)) {
              matchedChemicalGroups.push(matchedKey);
          }
      } else {
          console.log(`Could not find a match for Excel group: ${raw}`);
      }
  }

  // Also get any groups currently in DB and match them, so we wipe their old names
  const dbGroupsCursor = await ParameterGroup.distinct('group');
  for (const dbGroup of dbGroupsCursor) {
      const normDb = normalize(dbGroup);
      for (const chem of matchedChemicalGroups) {
          if (normalize(chem) === normDb) {
              console.log(`Found existing DB group to wipe: "${dbGroup}" -> will be recreated as "${chem}"`);
              await ParameterGroup.deleteMany({ group: dbGroup });
          }
      }
  }

  let insertedCount = 0;
  
  // 3. Recreate the subgroups for the matched official groups
  for (const officialGroup of matchedChemicalGroups) {
      console.log(`Recreating group: ${officialGroup}`);
      const exactSubgroups = chemicalGroups[officialGroup];
      
      // We already deleted the old variations. Let's make sure the official one is also clean.
      await ParameterGroup.deleteMany({ group: officialGroup });
      
      let hasOthers = false;
      for (const sg of exactSubgroups) {
          await ParameterGroup.create({
            group: officialGroup,
            subGroup: sg
          });
          insertedCount++;
          if (sg.toLowerCase() === 'others') hasOthers = true;
      }
      
      if (!hasOthers) {
          await ParameterGroup.create({
            group: officialGroup,
            subGroup: 'Others'
          });
          insertedCount++;
      }
  }
  
  console.log(`Phase 1 Complete: Re-created ${matchedChemicalGroups.length} normalized groups with ${insertedCount} total subgroups.`);
  process.exit(0);
}

run().catch(console.error);
