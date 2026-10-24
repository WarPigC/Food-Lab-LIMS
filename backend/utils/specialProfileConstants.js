// Hardcoded baseline seed constants for Special Profiles
// Used for database initialization and seeding.

const SPECIAL_PROFILE_CONSTANTS = [
  {
    key: 'waterIso10500',
    label: 'Water ISO 10500',
    description: 'Standard specification for drinking water according to IS 10500:2012 (Reaff. 2023)',
    isExclusive: true,
    parameters: [
    {
        "name": "Organoleptic and Physicals Parameters",
        "unit": "-",
        "testMethod": "",
        "specification": "",
        "requirement": "",
        "permissibleLimit": "",
        "isCategoryHeader": true
    },
    {
        "name": "Odour",
        "unit": "-",
        "testMethod": "IS  3025 (Part 5):2018",
        "specification": "",
        "requirement": "Agreeable",
        "permissibleLimit": "Agreeable",
        "isCategoryHeader": false
    },
    {
        "name": "Colour",
        "unit": "CU",
        "testMethod": "IS  3025 (Part 4):2021",
        "specification": "",
        "requirement": "Max. 5",
        "permissibleLimit": "Max .15",
        "isCategoryHeader": false
    },
    {
        "name": "Taste",
        "unit": "-",
        "testMethod": "IS 3025 (Part 8): 2023",
        "specification": "",
        "requirement": "Agreeable",
        "permissibleLimit": "Agreeable",
        "isCategoryHeader": false
    },
    {
        "name": "Turbidity",
        "unit": "NTU",
        "testMethod": "IS 3025 (part 10) Nephelometric Turbidity Unit (NTU)method:2023",
        "specification": "",
        "requirement": "Max 1",
        "permissibleLimit": "Max. 5",
        "isCategoryHeader": false
    },
    {
        "name": "pH",
        "unit": "-",
        "testMethod": "IS : 3025 (Part 11):2022",
        "specification": "",
        "requirement": "6.5 - 8.5",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Total Dissolved Solid",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 16): 2023",
        "specification": "",
        "requirement": "Max.500",
        "permissibleLimit": "Max. 2000",
        "isCategoryHeader": false
    },
    {
        "name": "General Parameters",
        "unit": "-",
        "testMethod": "",
        "specification": "",
        "requirement": "",
        "permissibleLimit": "",
        "isCategoryHeader": true
    },
    {
        "name": "Total Hardness  (as CaCO3)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (part 21) EDTA method:2009",
        "specification": "",
        "requirement": "Max.200",
        "permissibleLimit": "Max. 600",
        "isCategoryHeader": false
    },
    {
        "name": "Magnesum(asMg)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 46):2019",
        "specification": "",
        "requirement": "Max. 30",
        "permissibleLimit": "Max. 100",
        "isCategoryHeader": false
    },
    {
        "name": "Copper (as Cu)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.05",
        "permissibleLimit": "Max. 1.5",
        "isCategoryHeader": false
    },
    {
        "name": "Iron (as Fe)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.3",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Manganese(asMn)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.1",
        "permissibleLimit": "Max. 0.3",
        "isCategoryHeader": false
    },
    {
        "name": "Nitrate( as NO3 )",
        "unit": "mg/L",
        "testMethod": "APHA 24th edition. :4500- NO3 -B Ultra Spectrophotometric Screening method, 2023",
        "specification": "",
        "requirement": "Max 45",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Fluoride(as F)",
        "unit": "mg/L",
        "testMethod": "APHA 24 edition:4500-F,D SPADNS Method 2023",
        "specification": "",
        "requirement": "Max 1.0",
        "permissibleLimit": "Max. 1.5",
        "isCategoryHeader": false
    },
    {
        "name": "Zinc (as Zn)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 5",
        "permissibleLimit": "Max. 15",
        "isCategoryHeader": false
    },
    {
        "name": "Aluminium (as Al)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.03",
        "permissibleLimit": "Max. 0.2",
        "isCategoryHeader": false
    },
    {
        "name": "Ammonical Nitrogen(as NH3-N)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 34/Sec,1): 2023",
        "specification": "",
        "requirement": "Max 0.5",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Anionic detergents (as MBAS)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 68):2025",
        "specification": "",
        "requirement": "Max 0.2",
        "permissibleLimit": "Max. 1.0",
        "isCategoryHeader": false
    },
    {
        "name": "Chloride (as Cl)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 32)(ArgentometricMethod) : 1988",
        "specification": "",
        "requirement": "Max 250",
        "permissibleLimit": "Max. 1000",
        "isCategoryHeader": false
    },
    {
        "name": "Selenium (as Se)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.01",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Phenolic compounds (as  C6H5OH)",
        "unit": "mg/L",
        "testMethod": "IS 3025 Part 43 : Sec1: 2022",
        "specification": "",
        "requirement": "Max. 0.001",
        "permissibleLimit": "Max. 0.002",
        "isCategoryHeader": false
    },
    {
        "name": "Sulphate (as SO4 )",
        "unit": "mg/L",
        "testMethod": "IS 3025 (part 24)Turbidity method: 2022",
        "specification": "",
        "requirement": "Max 200",
        "permissibleLimit": "Max. 400",
        "isCategoryHeader": false
    },
    {
        "name": "Sulphide (as H2S)",
        "unit": "mg/L",
        "testMethod": "IS 3025 Part 29 clause-7 Methylene bluemethod: 2022)",
        "specification": "",
        "requirement": "Max .0.05",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Total Alkalinity (as CaCO3 )",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 23):2023",
        "specification": "",
        "requirement": "Max 200",
        "permissibleLimit": "Max. 600",
        "isCategoryHeader": false
    },
    {
        "name": "Calcium (as Ca)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 40 /Sec.5)EDTA Titrimetric method: 2024",
        "specification": "",
        "requirement": "Max 75",
        "permissibleLimit": "Max. 200",
        "isCategoryHeader": false
    },
    {
        "name": "Chloramines (as Cl2)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 26)clause -6 : 2021",
        "specification": "",
        "requirement": "Max. 4.0",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Residual free chlorine",
        "unit": "mg/L",
        "testMethod": "IS 3025 ( Part 26):2021",
        "specification": "",
        "requirement": "Max 0.2",
        "permissibleLimit": "Max. 1",
        "isCategoryHeader": false
    },
    {
        "name": "Mineral oil",
        "unit": "mg/L",
        "testMethod": "IS 3025(PART 39/ Clause 5 Liquid-Liquid Partition Gravimetric Method:2021",
        "specification": "",
        "requirement": "Max.0.5",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Boron (as B)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.5",
        "permissibleLimit": "Max. 1.0",
        "isCategoryHeader": false
    },
    {
        "name": "Barium (as Ba)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.7",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Silver (as Ag)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max.0.1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Parameters Concerning Toxic Substances",
        "unit": "-",
        "testMethod": "",
        "specification": "",
        "requirement": "",
        "permissibleLimit": "",
        "isCategoryHeader": true
    },
    {
        "name": "Cadmium (as Cd)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.003",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Cyanide as CN",
        "unit": "mg/L",
        "testMethod": "APHA 24th edition 4500-CN-E Colorimetric :2023",
        "specification": "",
        "requirement": "Max.0.05",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Lead (as Pb)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max 0.01",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Chromium (as Cr)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max.0.05",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Molybdenum (as Mo)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max.0.07",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Mercury (as Hg)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max.0.001",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Total Arsenic (as As)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max.0.01",
        "permissibleLimit": "Max. 0.05",
        "isCategoryHeader": false
    },
    {
        "name": "Nickel (as Ni)",
        "unit": "mg/L",
        "testMethod": "IS 3025 (Part 65):2025",
        "specification": "",
        "requirement": "Max.0.02",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Parameters Concerning Toxic Substances",
        "unit": "-",
        "testMethod": "",
        "specification": "",
        "requirement": "",
        "permissibleLimit": "",
        "isCategoryHeader": true
    },
    {
        "name": "Polychlorinated Biphenyl (PCB)",
        "unit": "-",
        "testMethod": "",
        "specification": "",
        "requirement": "",
        "permissibleLimit": "",
        "isCategoryHeader": true
    },
    {
        "name": "PCB 118",
        "unit": "\u00b5g/L",
        "testMethod": "APHA24thEdition,Method 6630 D (By GC MSMS)",
        "specification": "",
        "requirement": "0.0005mg/L (0.5 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "PCB 101",
        "unit": "\u00b5g/L",
        "testMethod": "APHA24thEdition,Method 6630 D (By GC MSMS)",
        "specification": "",
        "requirement": "0.0005mg/L (0.5 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "PCB 138",
        "unit": "\u00b5g/L",
        "testMethod": "APHA24thEdition,Method 6630 D (By GC MSMS)",
        "specification": "",
        "requirement": "0.0005mg/L (0.5 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "PCB 153",
        "unit": "\u00b5g/L",
        "testMethod": "APHA24thEdition,Method 6630 D (By GC MSMS)",
        "specification": "",
        "requirement": "0.0005mg/L (0.5 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "PCB 180",
        "unit": "\u00b5g/L",
        "testMethod": "APHA24thEdition,Method 6630 D (By GC MSMS)",
        "specification": "",
        "requirement": "0.0005mg/L (0.5 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "PCB 28",
        "unit": "\u00b5g/L",
        "testMethod": "APHA24thEdition,Method 6630 D (By GC MSMS)",
        "specification": "",
        "requirement": "0.0005mg/L (0.5 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "PCB 52",
        "unit": "\u00b5g/L",
        "testMethod": "APHA24thEdition,Method 6630 D (By GC MSMS)",
        "specification": "",
        "requirement": "0.0005mg/L (0.5 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Acenaphthene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Acenaphtylene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Anthracene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Benz(a)anthracene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Benzo (a)pyrene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Benzo (b)fluoranthene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Benzo (k)fluoranthene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Benzo[g,h,i]perylene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Chrysene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Dibenz[a'h]anthracen",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Fluoranthrene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Fluorene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Indeno[123-c,]pyrene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Napthalene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Phenanthrene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Pyrene",
        "unit": "\u00b5g/L",
        "testMethod": "APHA 6440B 24 Ed. 2023",
        "specification": "",
        "requirement": "0.0001mg/L (0.1 \u00b5g/L)",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Pesticides Residue",
        "unit": "-",
        "testMethod": "",
        "specification": "",
        "requirement": "",
        "permissibleLimit": "",
        "isCategoryHeader": true
    },
    {
        "name": "Alpha -HCH",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 0.01",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Beta-HCH",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 0.04",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Gamma -HCH",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 2.0",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Delta - HCH",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 0.04",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Alpha- Endosulfan",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 0.4",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Beta endosulfan",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 0.4",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Endosulfan-sulfate",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 0.4",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Monocrotophos",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA8141 A: 1994",
        "specification": "",
        "requirement": "Max. 1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Ethion",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA1657 A: 2000",
        "specification": "",
        "requirement": "Max. 3",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Chlorpyrifos",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 30",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Phorate",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA8141 A: 1994",
        "specification": "",
        "requirement": "Max. 2",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Phorate sulfoxide",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA8141 A: 1994",
        "specification": "",
        "requirement": "Max. 2",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Phorate-sulfone",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA8141 : 1994",
        "specification": "",
        "requirement": "Max. 2",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Butachlor",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 125",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Isoproturon",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 9",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Alachlor",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 20",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Atrazine",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 2",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Parathion-methyl",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA8141: 1995",
        "specification": "",
        "requirement": "Max. 0.3",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Malathion",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA8141 : 1995",
        "specification": "",
        "requirement": "Max. 190",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Malaoxon",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA8141: 1995",
        "specification": "",
        "requirement": "Max. 190",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Aldrin",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 0.03",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Dieldrin",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA525.2: 1995",
        "specification": "",
        "requirement": "Max. 0.03",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "2,4-DDT",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "4,4-DDT",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "p,p-DDE",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "2,4-DDD",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "4,4- DDD",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA 525.2",
        "specification": "",
        "requirement": "Max. 1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "2,4- D",
        "unit": "\u00b5g/L",
        "testMethod": "EPA 515.1",
        "specification": "",
        "requirement": "Max. 30",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "2,4-DDE",
        "unit": "\u00b5g/L",
        "testMethod": "USEPA508 Rev 3.1: 1995",
        "specification": "",
        "requirement": "Max. 1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Bromoform",
        "unit": "mg/L",
        "testMethod": "APHA 24th Edition,6232 B : 2023",
        "specification": "",
        "requirement": "Max.0.1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Bromodichloromethane",
        "unit": "mg/L",
        "testMethod": "APHA 24th Edition,6232 B : 2023",
        "specification": "",
        "requirement": "Max. 0.06",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Chloroform",
        "unit": "mg/L",
        "testMethod": "APHA 24th Edition,6232 B : 2023",
        "specification": "",
        "requirement": "Max. 0.2",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Dibromochloromethane",
        "unit": "mg/L",
        "testMethod": "APHA 24th Edition,6232 B : 2023",
        "specification": "",
        "requirement": "Max. 0.1",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "Total  Coliform",
        "unit": "Per 100ml",
        "testMethod": "IS 15185:2016",
        "specification": "",
        "requirement": "Shall not be Detected",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    },
    {
        "name": "E. coli",
        "unit": "Per 100ml",
        "testMethod": "IS 15185:2016",
        "specification": "",
        "requirement": "Shall not be Detected",
        "permissibleLimit": "No relaxation",
        "isCategoryHeader": false
    }
],
    variants: []
  },
  {
    key: 'pesticides',
    label: 'Food Pesticides',
    description: 'Food pesticide residue testing panels (GCMSMS and LCMSMS)',
    isExclusive: false,
    parameters: [],
    variants: [
      {
        key: 'GCMSMS',
        label: 'GCM Panel (GCMSMS)',
        parameters: [
      {
            "name": "Alachlor",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Atrazine",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Bifenthrin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Butachlor",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlorfenapyr",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlorothalonil",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlorpropham",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlorpyrifos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "cis-1,2,3,6-Tetrahydrophthalimide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Clomazone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyfluthrin I",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyfluthrin II {CAS # 68359-37-5}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyfluthrin III {CAS # 68359-37-5}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyfluthrin IV {CAS # 68359-37-5}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyhalothrin (Lambda)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cypermethrin I",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cypermethrin II {CAS # 52315-07-8}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cypermethrin III {CAS # 52315-07-8}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cypermethrin IV {CAS # 52315-07-8}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Deltamethrin II {CAS # 52918-63-5}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Deltamethrin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dichlorvos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Diclofop-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dicofol",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dimethomorph I",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dimethomorph II {CAS # 110488-70-5}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ethion",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ethofenprox",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Famoxadone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenarimol",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenpropathrin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenvalerate I",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenvalerate II {CAS # 51630-58-1}",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fipronil",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fluchloralin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Iprodione",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Isoprothiolane",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Malaoxon",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Malathion",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Monocrotophos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Oxyfluorfen",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Parathion-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Permethrin, (1R)-cis-",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Permethrin, (1R)-trans-",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Phorate sulfone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Phorate Sulfoxide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Phorate",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pretilachlor",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Profenofos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pyridalyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tebuconazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tetraconazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Triallate",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Trifluralin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dithiocarbamates_ as CS2",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      }
]
      },
      {
        key: 'LCMSMS',
        label: 'LCM Panel (LCMSMS)',
        parameters: [
      {
            "name": "2,4-D",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "3-Hydroxy Carbofuran",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "4-Nitrophenol sodium",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Acephate",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Acetamiprid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Acifluorfen",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ametoctradin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ametryn",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Anilofos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Azimsulfuron (IN A8947)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Azoxystrobin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Benfuracarb",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Benomyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Bensulfuron-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Bentazone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Bispyribac",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Bitertanol",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Boscalid (Nicobifen)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Buprofezin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Carbaryl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Carbendazim (Azole)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Carbofuran, - 3 hydroxy",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Carbofuran",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Carbosulfan",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Carfentrazone-ethyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Carpropamide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlorantraniliprole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlorfluazuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlorimuron-ethyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chromafenozide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cinmethylin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Clodinafop-Propargyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Clothianidin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyantraniliprole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyazofamid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cyhalofop butyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cymoxanil (Curzate)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Demeton-S-methylsulfoxide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Diafenthiuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Diclofop acid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Diclosulum",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Difenconazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Diflubenzuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dimethoate",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dinocap",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dinotefuran",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Diuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Dodine",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Edifenphos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Emamectin B1a",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Emamectin B1b",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Epoxiconazole (BAS 480F)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ethoxysulfuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Etoxazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenamidone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenazaquin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenobucarb (Baycarb)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenoxaprop-ethyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fenpyroximate(E)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Flonicamid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fluazifop-butyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Flubendiamide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Flucetosulfuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Flufenacet (Fluthiamide)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fluopicolid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fluopyram",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Flupyradifurone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Flusilazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fluxapyroxad",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fomesafen",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Forchlorfenuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Halosulfuron-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Haloxyfop-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Hexaconazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Hexazinone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Hexythiazox",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Imazamox",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Imazethapyr",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Imidacloprid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Indoxacarb",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Iodosulfuron-Methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Iprobenfos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Isoproturon",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Kresoxim methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Linuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Lufenuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Mandipropamid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "MCPA",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Mesosulfuron-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Metaflumizone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Metalaxyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Metalaxyl-M",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Methabenzthiazuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Methamidophos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Methomyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Metrafenone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Metribuzin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Metsulfuron-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Milbemectin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Myclobutanil",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Novaluron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Orthosulfamuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Oxadiargyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Oxadiazon",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Paclobutrazol",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Penconazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pencycuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pendimethalin (Penoxalin)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Penoxsulam (Penoxalim)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Phenthoate (Fenthoate)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Phosalone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Picoxystrobin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pinoxaden",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pirimifos-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Prohexadione calcium",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Propanil",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Propaquizafop",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Propargite",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Propiconazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pymetrozine",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pyraclostrobin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pyrazosulfuron-Ethyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pyriproxyfen",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Quinalphos (Diethquinalphione)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Quizalofop-ethyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Quizalofop-P-Terfuryl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Spinetoram",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Spinosyn A",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Spinosyn D",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Spiromesifen",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Sulfentrazone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Sulfosulfuron",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Sulfoxaflor",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tembotrione",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiacloprid",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiamethoxam",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thifluzamide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiodicarb",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiometon",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiometon-sulfone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiometon-sulfoxide",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiophanate-methyl",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tolfenpyrade",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Topramezone",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Triadimefon",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Triasulfuron (Logran)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Triazophos",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Trichlorfon (DEP)",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tricyclazole",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Trifloxystrobin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Validamycin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "abamectin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cartap",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cartap Hydrochloride",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Chlormequat",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ethephon",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Fosetyl al",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Kasugamycin",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Mepiquat",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Thiocyclam",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tridemorph",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Glyphosate",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Glufonisate ammonium",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Paraquat Dichloride",
            "unit": "mg/kg",
            "testMethod": "",
            "specification": "",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      }
]
      }
    ]
  },
  {
    key: 'fattyAcids',
    label: 'Fatty Acids',
    description: 'Fatty acid profile testing panels (4 compiled compounds or 37 full parameters)',
    isExclusive: false,
    parameters: [],
    variants: [
      {
        key: 'compiled',
        label: '4 Compiled Compounds',
        parameters: [
      {
            "name": "Saturated Fatty acid",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Mono Unsaturated Fatty acid",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Poly Unsaturated Fatty Acid",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Trans Fatty Acid",
            "unit": "%",
            "testMethod": "AOAC 985.21:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      }
]
      },
      {
        key: 'full',
        label: '37 Full Parameters',
        parameters: [
      {
            "name": "Butyric acid (C4:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Caproic Acid (C6:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Caprylic Acid (C8:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Capric Acid (C10:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Undecanoic Acid (C11:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Lauric Acid (C12:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tridecanoic Acid (C13:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Myristic Acid (C14:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Myristoleic Acid (C14:1)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cis-10-Pentadeconic Acid (C15:1)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Pentadeconic Acid (C15:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Palmetic Acid (C16:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Palmitoleic Acid (C16:1)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Heptadecanoic Acid (C17:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cis-10-Heptadeconic Acid (C17:1)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Stearic Acid (C18:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Oleic Acid (C18:1n9c)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Elaidic Acid (C18:1n9t)",
            "unit": "%",
            "testMethod": "AOAC 985.21:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Linoleic Acid (C18:2n6c)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Linolelaidic Acid (C18:2n6t)",
            "unit": "%",
            "testMethod": "AOAC 985.21:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Alpha-Linoleic Acid (C18:3n3)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Gamma_Linoleic Acid (C18:3n6)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ecosadienoic Acid (C20:2)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Arachidic Acid (C20:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cis-11-Eicosenoic Acid (C20:1)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Heneicosanoic Acid (C21:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Behenic Acid (C22:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ecosatrienoic Acid (C20:3n6)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Ecosatrienoic Acid (C20:3n3)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Erucic Acid (C22:1n9)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Arachidonic Acid (C20:4n6)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Tricosanoic Acid (C23:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Cis-13-16-Docosadienoic Acid (C22:2)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Eicosapentanoic Acid (C20:5n3)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Lignoceric Acid (C24:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Nervonic Acid (C24:0)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Docosahexanoic Acid (C22:6n3)",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Saturated Fatty acid",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Mono Unsaturated Fatty acid",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Poly Unsaturated Fatty Acid",
            "unit": "%",
            "testMethod": "AOAC 996.06:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      },
      {
            "name": "Trans Fatty Acid",
            "unit": "%",
            "testMethod": "AOAC 985.21:2023",
            "specification": "-",
            "requirement": "",
            "permissibleLimit": "",
            "isCategoryHeader": false
      }
]
      }
    ]
  }
];

module.exports = { SPECIAL_PROFILE_CONSTANTS };
