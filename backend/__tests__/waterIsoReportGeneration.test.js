const { generateReport } = require('../services/reportGenerator');
const { SPECIAL_PROFILE_CONSTANTS } = require('../utils/specialProfileConstants');

describe('Water ISO 10500 Report Generation', () => {
  const waterIsoParams = SPECIAL_PROFILE_CONSTANTS.find(p => p.key === 'waterIso10500').parameters;

  const sampleJob = {
    _id: 'test-job-water-iso',
    jobCode: '2608211741',
    sample: {
      sample_name: 'Drinking Water',
      sample_quantity: '5 Litre + 1x10 Litre',
      packing_details: 'Packed in green colour jar.',
      received_date: new Date('2026-08-21'),
      marking_seal: 'NA',
      sampling_details: 'Sample provided by the customer',
      condition_on_receipt: 'Satisfactory',
      sample_description: 'Clear colourless liquid without any sediment Packed in jar.',
      nabl_type: 'Nabl',
      ulr_no: 'TC-124342600000242',
    },
    customer: {
      customer_name: "D' Jain Food Products",
      customer_address: '36/2 Indore bhopal highway near jio petrol pump Sonkatch dist. Dewas (MP) 455118',
      contact_person: 'Mr. Mihir Karnawat',
      mobile_number: '7247480551',
      email: 'djainfoodproducts@gmail.com',
    },
    compliance: {
      standard_specification: 'IS 10500:2012',
    },
    groupMetadata: {
      productCategory: 'Drinking water',
    },
    testingPeriod: {
      startDate: new Date('2026-08-21'),
      endDate: new Date('2026-08-25'),
    },
    completedAt: new Date('2026-08-26'),
    specialProfiles: {
      waterIso10500: true,
    },
    parameters: waterIsoParams.map(p => ({
      name: p.name,
      unit: p.unit,
      testMethod: p.testMethod,
      requirement: p.requirement,
      permissibleLimit: p.permissibleLimit,
      isCategoryHeader: p.isCategoryHeader,
      value: p.isCategoryHeader ? '' : (p.name === 'pH' ? '7.23' : 'BLQ (LOQ 0.01)'),
    })),
  };

  it('generates a valid docx buffer for Water ISO 10500 baseline job', async () => {
    const buf = await generateReport(sampleJob, 'nabl');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(10000);
  });

  it('generates a valid docx buffer when customer data variance is present', async () => {
    const varianceJob = {
      ...sampleJob,
      customer: {
        ...sampleJob.customer,
        customer_reference_no: 'APEX/PO/2026/0912',
        batch_no: 'BAT-DW-2026-08',
        brand_name: 'AquaPure Gold',
        dom: '15/08/2026',
        doe: '14/02/2027',
        batch_size: '10000 Litres',
      },
    };

    const buf = await generateReport(varianceJob, 'nabl');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(10000);
  });
});
