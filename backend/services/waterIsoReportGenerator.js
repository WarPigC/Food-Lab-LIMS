const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  VerticalAlign,
  Header,
  Footer,
  TabStopType,
} = require('docx');

const SpecialProfile = require('../models/SpecialProfile');
const { SPECIAL_PROFILE_CONSTANTS } = require('../utils/specialProfileConstants');
const {
  createCell,
  deriveReportFields,
  buildHeaderTable,
  buildSampleInfoTable,
  formatDate,
  PAGE_WIDTH_DXA,
  BORDERS_ALL,
  BORDERS_NONE,
  TABLE_BORDERS_NONE,
} = require('./reportGenerator');

// Height estimation constants (in twips)
const PAGE_HEIGHT_DXA = 15840;
const MARGIN_TOP = 720;
const MARGIN_BOTTOM = 720;
const FOOTER_RESERVE = 400;
const USABLE_HEIGHT = PAGE_HEIGHT_DXA - MARGIN_TOP - MARGIN_BOTTOM - FOOTER_RESERVE;

const AVG_CHAR_WIDTH = 100;
const LINE_HEIGHT = 260;
const ROW_PADDING = 50;

const HEADER_HEIGHT = 1600;
const FTL_REF_HEIGHT = 340;
const TEST_REPORT_TITLE = 360;
const REPORT_ULR_LINE = 280;
const TEST_RESULT_TITLE = 400;
const DUAL_HEADER_HEIGHT = 650;
const SINGLE_HEADER_HEIGHT = 350;
const CONT_BANNER_HEIGHT = 700;
const FOOTER_BLOCK_HEIGHT = 3400;

// Specific markers for Water ISO 10500 parameters matching sample docx
const SR_NO_MAP = {
  'PCB 118': 'i',
  'PCB 101': 'ii.',
  'PCB 138': 'iii.',
  'PCB 153': 'iv.',
  'PCB 180': 'v.',
  'PCB 28': 'vi.',
  'PCB 52': 'Vii.',
  'Polynuclear Aromatic Hydrocarbons (PAH)': '10.',
  'Trihalomethanes': '31',
};

const CATEGORY_EXACT_MAP = {
  'Organoleptic and Physicals Parameters': ' Organoleptic and Physicals Parameters   ',
  'General Parameters': 'General Parameters ',
  'Parameters Concerning Toxic Substances': 'Parameters Concerning Toxic Substances ',
  'Pesticides Residue': 'Pesticides Residue',
  'Microbiology Test Parameters': 'Microbiology Test Parameters',
};

const PARAM_EXACT_MAP = {
  'Total Coliform': 'Total  Coliform ',
  'Total  Coliform': 'Total  Coliform ',
};

// Estimate lines for wrapped text
const estimateLines = (text, colWidthDxa) => {
  if (!text) return 1;
  const charsPerLine = Math.max(1, Math.floor(colWidthDxa / AVG_CHAR_WIDTH));
  let total = 0;
  for (const line of String(text).split('\n')) {
    total += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return total;
};

// Estimate height of a row in the results table
const estimateWaterRowHeight = (row) => {
  if (row.type === 'discipline') {
    return 2 * LINE_HEIGHT + ROW_PADDING;
  }
  if (row.type === 'category') {
    return LINE_HEIGHT + ROW_PADDING;
  }
  // Data row: Col 1 (name, 2160 dxa) and Col 4 (method, 2376 dxa) are typically longest
  const nameLines = estimateLines(row.name, 2160);
  const methodLines = estimateLines(row.testMethod, 2376);
  const maxLines = Math.max(nameLines, methodLines, 1);
  return maxLines * LINE_HEIGHT + ROW_PADDING;
};

// Estimate height of Table 0 (sample info table)
const estimateSampleInfoHeight = (job) => {
  const customer = job.customer || {};
  const sample = job.sample || {};
  let height = 3 * LINE_HEIGHT + ROW_PADDING; // customer info
  height += 7 * (LINE_HEIGHT + ROW_PADDING);  // 7 standard rows

  const hasCustomerData = Boolean(
    customer.customer_reference_no ||
    customer.batch_no ||
    customer.dom ||
    customer.brand_name ||
    customer.any_other_info ||
    customer.batch_size ||
    customer.doe
  );
  if (hasCustomerData) {
    height += 6 * (LINE_HEIGHT + ROW_PADDING);
  } else if (job.compliance?.special_handling_instructions) {
    height += 1 * (LINE_HEIGHT + ROW_PADDING);
  }

  const descLines = estimateLines(sample.sample_description, 8000);
  height += descLines * LINE_HEIGHT + ROW_PADDING;
  return height;
};

// Build sample info table matching Water ISO 10500.docx Table 0
const buildWaterIsoSampleInfoTable = (job, registrationNo, issueDate) => {
  const customer = job.customer || {};
  const sample = job.sample || {};
  const compliance = job.compliance || {};
  const fallbackDate = sample.received_date || job.createdAt;
  const receiptDate = formatDate(fallbackDate);
  const tp = job.testingPeriod || {};
  const testingPeriodStr = tp.startDate && tp.endDate
    ? `${formatDate(tp.startDate)} to ${formatDate(tp.endDate)}`
    : 'N/A';

  const customerInfoChildren = [
    new Paragraph({
      children: [
        new TextRun({ text: 'Customer Name :  ', bold: true, font: 'Times New Roman', size: 20 }),
        new TextRun({ text: `${customer.customer_name || job.clientName || 'N/A'}  `, font: 'Times New Roman', size: 20 }),
      ],
      spacing: { before: 0, after: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Address :                ', bold: true, font: 'Times New Roman', size: 20 }),
        new TextRun({ text: customer.customer_address || 'N/A', font: 'Times New Roman', size: 20 }),
      ],
      spacing: { before: 0, after: 0 },
    }),
  ];

  if (customer.contact_person || customer.mobile_number) {
    const personStr = customer.contact_person && customer.contact_person !== 'N/A' ? customer.contact_person : '';
    const mobileStr = customer.mobile_number && customer.mobile_number !== 'N/A' ? customer.mobile_number : '';
    const contactLine = personStr && mobileStr ? `${personStr} , ${mobileStr}` : (personStr || mobileStr);
    customerInfoChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Contact Person:\t', bold: true, font: 'Times New Roman', size: 20 }),
          new TextRun({ text: contactLine, font: 'Times New Roman', size: 20 }),
        ],
        spacing: { before: 0, after: 0 },
      })
    );
  }

  if (customer.email && customer.email !== 'N/A') {
    customerInfoChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Email  :                   ', bold: true, font: 'Times New Roman', size: 20 }),
          new TextRun({ text: customer.email, font: 'Times New Roman', size: 20 }),
        ],
        spacing: { before: 0, after: 0 },
      })
    );
  }

  const rows = [];

  // Row 0: Customer info (colspan: 4)
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: customerInfoChildren,
          columnSpan: 4,
          borders: BORDERS_ALL,
          margins: { top: 20, bottom: 20, left: 40, right: 40 },
          width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
        }),
      ],
    })
  );

  // Row 1: Sample Name & Registration No.
  rows.push(
    new TableRow({
      children: [
        createWaterIsoCell('Sample Name\n( as stated by customer )', { bold: true, widthDxa: 2836 }),
        createWaterIsoCell((sample.sample_name || 'Drinking Water') + '  ', { widthDxa: 2977 }),
        createWaterIsoCell('Registration No.', { bold: true, widthDxa: 2551 }),
        createWaterIsoCell(registrationNo, { widthDxa: 2410 }),
      ],
    })
  );

  // Row 2: Product Category & Issue Date
  rows.push(
    new TableRow({
      children: [
        createWaterIsoCell('Product Category ', { bold: true, widthDxa: 2836 }),
        createWaterIsoCell(job.groupMetadata?.productCategory || 'Drinking water', { widthDxa: 2977 }),
        createWaterIsoCell('Issue Date ', { bold: true, widthDxa: 2551 }),
        createWaterIsoCell(issueDate, { widthDxa: 2410 }),
      ],
    })
  );

  // Row 3: Sample Quantity & Date of Receipt
  const rawQty = sample.sample_quantity || 'N/A';
  const displayQty = rawQty.startsWith('01x') || rawQty.startsWith('1x') ? rawQty : `01x ${rawQty}`;
  rows.push(
    new TableRow({
      children: [
        createWaterIsoCell('Sample Quantity', { bold: true, widthDxa: 2836 }),
        createWaterIsoCell(displayQty, { widthDxa: 2977 }),
        createWaterIsoCell('Date of Receipt', { bold: true, widthDxa: 2551 }),
        createWaterIsoCell(receiptDate, { widthDxa: 2410 }),
      ],
    })
  );

  // Row 4: Packing Details & Testing period
  rows.push(
    new TableRow({
      children: [
        createWaterIsoCell('Packing Details ', { bold: true, widthDxa: 2836 }),
        createWaterIsoCell(sample.packing_details || 'Packed in green colour jar.', { widthDxa: 2977 }),
        createWaterIsoCell('Testing period', { bold: true, widthDxa: 2551 }),
        createWaterIsoCell(testingPeriodStr, { widthDxa: 2410 }),
      ],
    })
  );

  // Row 5: Marking Seal & Standard Specification
  rows.push(
    new TableRow({
      children: [
        createWaterIsoCell('Marking Seal ( if any)', { bold: true, widthDxa: 2836 }),
        createWaterIsoCell(sample.marking_seal || 'NA', { widthDxa: 2977 }),
        createWaterIsoCell('Standard Specification', { bold: true, widthDxa: 2551 }),
        createWaterIsoCell(compliance.standard_specification || 'IS 10500:2012', { widthDxa: 2410 }),
      ],
    })
  );

  // Row 6: Sampling Details & Condition on receipt
  rows.push(
    new TableRow({
      children: [
        createWaterIsoCell('Sampling Details', { bold: true, widthDxa: 2836 }),
        createWaterIsoCell(sample.sampling_details || 'Sample provided by the customer', { widthDxa: 2977 }),
        createWaterIsoCell('Sample condition on receipt', { bold: true, widthDxa: 2551 }),
        createWaterIsoCell(sample.condition_on_receipt || 'Satisfactory', { widthDxa: 2410 }),
      ],
    })
  );

  // Optional customer provided data
  const hasCustomerData = Boolean(
    customer.customer_reference_no ||
    customer.batch_no ||
    customer.dom ||
    customer.brand_name ||
    customer.any_other_info ||
    customer.batch_size ||
    customer.doe
  );

  if (hasCustomerData) {
    rows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Any data provided by customer;', { bold: true, colSpan: 4, widthDxa: PAGE_WIDTH_DXA }),
        ],
      })
    );
    rows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Customer ref.', { bold: true, widthDxa: 2836 }),
          createWaterIsoCell(customer.customer_reference_no || 'NA', { widthDxa: 2977 }),
          createWaterIsoCell('Brand Name', { bold: true, widthDxa: 2551 }),
          createWaterIsoCell(customer.brand_name || 'NA', { widthDxa: 2410 }),
        ],
      })
    );
    rows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Batch No.', { bold: true, widthDxa: 2836 }),
          createWaterIsoCell(customer.batch_no || 'NA', { widthDxa: 2977 }),
          createWaterIsoCell('Any Other Information', { bold: true, widthDxa: 2551 }),
          createWaterIsoCell(customer.any_other_info || 'NA', { widthDxa: 2410 }),
        ],
      })
    );
    rows.push(
      new TableRow({
        children: [
          createWaterIsoCell('DOM', { bold: true, widthDxa: 2836 }),
          createWaterIsoCell(customer.dom || 'NA', { widthDxa: 2977 }),
          createWaterIsoCell('Batch Size', { bold: true, widthDxa: 2551 }),
          createWaterIsoCell(customer.batch_size || 'NA', { widthDxa: 2410 }),
        ],
      })
    );
    rows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Any Handling Instructions provided : Yes/NO ( if yes ; Short details)', {
            bold: true,
            colSpan: 2,
            widthDxa: 5813,
          }),
          createWaterIsoCell('DOE', { bold: true, widthDxa: 2551 }),
          createWaterIsoCell(customer.doe || 'NA', { widthDxa: 2410 }),
        ],
      })
    );
  } else if (compliance.special_handling_instructions) {
    rows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Any Handling Instructions provided : Yes/NO ( if yes ; Short details)', {
            bold: true,
            colSpan: 4,
            widthDxa: PAGE_WIDTH_DXA,
          }),
        ],
      })
    );
  }

  // Row 7 (or final row): Sample Description (colSpan 3 for value)
  rows.push(
    new TableRow({
      children: [
        createWaterIsoCell('Sample Description', { bold: true, widthDxa: 2836 }),
        createWaterIsoCell((sample.sample_description || 'N/A') + ' \n', { colSpan: 3, widthDxa: 7938 }),
      ],
    })
  );

  return new Table({ rows, width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA } });
};

// Create cell with exact dxa width
const createWaterIsoCell = (text, options = {}) => {
  const {
    bold = false,
    alignment = AlignmentType.LEFT,
    colSpan = 1,
    rowSpan = 1,
    borders = BORDERS_ALL,
    shading = null,
    size = 20,
    verticalAlign = VerticalAlign.CENTER,
    widthDxa,
  } = options;

  const textString = text !== undefined && text !== null ? String(text) : '';
  const lines = textString.split('\n');
  const children = lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, bold, font: 'Times New Roman', size })],
        alignment,
        spacing: { line: 240, before: 0, after: 0 },
      })
  );

  const cellOptions = {
    children,
    columnSpan: colSpan,
    rowSpan,
    borders,
    verticalAlign,
    margins: { top: 20, bottom: 20, left: 40, right: 40 },
  };

  if (widthDxa) {
    cellOptions.width = { size: widthDxa, type: WidthType.DXA };
  }
  if (shading) {
    cellOptions.shading = { fill: shading };
  }
  return new TableCell(cellOptions);
};

// Build continuation banner table (2 rows matching sample docx)
const buildContinuationBanner = (job, registrationNo, issueDate) => {
  return new Table({
    rows: [
      new TableRow({
        children: [
          createWaterIsoCell('Sample Name\n( as stated by customer )', {
            bold: true,
            widthDxa: 2835,
          }),
          createWaterIsoCell((job.sample?.sample_name || 'Drinking Water') + '  ', {
            widthDxa: 2847,
          }),
          createWaterIsoCell('Registration No.', {
            bold: true,
            widthDxa: 2242,
          }),
          createWaterIsoCell(registrationNo, {
            widthDxa: 2850,
          }),
        ],
      }),
      new TableRow({
        children: [
          createWaterIsoCell('Product Category ', {
            bold: true,
            widthDxa: 2835,
          }),
          createWaterIsoCell(job.groupMetadata?.productCategory || 'Drinking water', {
            widthDxa: 2847,
          }),
          createWaterIsoCell('Issue Date ', {
            bold: true,
            widthDxa: 2242,
          }),
          createWaterIsoCell(issueDate, {
            widthDxa: 2850,
          }),
        ],
      }),
    ],
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
  });
};

// Build Water ISO results table for a given page chunk
const buildWaterIsoResultsTable = (pageRows, isFirstPage) => {
  const tableRows = [];

  const W_COL0 = 976;   // Sr. No. (453 / 5000 = 9.06%)
  const W_COL1 = 1976;  // Test Parameters (917 / 5000 = 18.34%)
  const W_COL2 = 832;   // UoM (386 / 5000 = 7.72%)
  const W_COL3 = 1692;  // Result (785 / 5000 = 15.7%)
  const W_COL4 = 2273;  // Test Method (1055 / 5000 = 21.1%)
  const W_COL5 = 1482;  // Requirement (688 / 5000 = 13.76%)
  const W_COL6 = 1543;  // Permissible Limit (716 / 5000 = 14.32%)

  if (isFirstPage) {
    // Dual-column header on Page 1
    tableRows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Sr. No.', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL0, rowSpan: 2 }),
          createWaterIsoCell('Test Parameters', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL1, rowSpan: 2 }),
          createWaterIsoCell('UoM', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL2, rowSpan: 2 }),
          createWaterIsoCell('Result', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL3, rowSpan: 2 }),
          createWaterIsoCell('Test Method', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL4, rowSpan: 2 }),
          createWaterIsoCell(
            'Limit as per IS: 10500:2012 (Reaff.2023) with Amendment  No: 4 November 2021 ',
            { bold: true, alignment: AlignmentType.CENTER, colSpan: 2, widthDxa: W_COL5 + W_COL6 }
          ),
        ],
      })
    );
    tableRows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Requirement (Acceptable Limit)', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL5 }),
          createWaterIsoCell('Permissible Limit in the absence of Alternate Source ', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL6 }),
        ],
      })
    );
  } else {
    // Single header row on continuation pages
    tableRows.push(
      new TableRow({
        children: [
          createWaterIsoCell('Sr. No.', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL0 }),
          createWaterIsoCell('Test Parameters', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL1 }),
          createWaterIsoCell('UoM', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL2 }),
          createWaterIsoCell('Result', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL3 }),
          createWaterIsoCell('Test Method', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL4 }),
          createWaterIsoCell('Requirement (Acceptable Limit)', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL5 }),
          createWaterIsoCell('Permissible Limit in the absence of Alternate Source ', { bold: true, alignment: AlignmentType.CENTER, widthDxa: W_COL6 }),
        ],
      })
    );
  }

  // Render rows for this page chunk
  for (const r of pageRows) {
    if (r.type === 'discipline') {
      const isChem = r.discipline === 'Chemical';
      tableRows.push(
        new TableRow({
          children: [
            createWaterIsoCell(
              isChem ? 'Discipline- Chemical\nChemical Test Parameter' : 'Discipline- Biological \nMicrobiology Test Parameters',
              { bold: true, colSpan: 5, widthDxa: W_COL0 + W_COL1 + W_COL2 + W_COL3 + W_COL4 }
            ),
            createWaterIsoCell(
              isChem
                ? 'Group \u2013 Water                                     Sub Group \u2013 Drinking water'
                : 'Group - Water\nSub Group \u2013 Drinking water',
              { bold: true, colSpan: 2, widthDxa: W_COL5 + W_COL6 }
            ),
          ],
        })
      );
    } else if (r.type === 'category') {
      const catText = CATEGORY_EXACT_MAP[r.name] || r.name;
      tableRows.push(
        new TableRow({
          children: [
            createWaterIsoCell(catText, {
              bold: true,
              colSpan: 7,
              widthDxa: PAGE_WIDTH_DXA,
            }),
          ],
        })
      );
    } else {
      // Data row
      const srNo = r.srNo || SR_NO_MAP[r.name] || '';
      const displayName = PARAM_EXACT_MAP[r.name] || r.name;
      tableRows.push(
        new TableRow({
          children: [
            createWaterIsoCell(srNo, { alignment: AlignmentType.CENTER, widthDxa: W_COL0 }),
            createWaterIsoCell(displayName, { widthDxa: W_COL1 }),
            createWaterIsoCell(r.unit || '-', { alignment: AlignmentType.CENTER, widthDxa: W_COL2 }),
            createWaterIsoCell(r.value || 'BLQ (LOQ 0.01)', { alignment: AlignmentType.CENTER, widthDxa: W_COL3 }),
            createWaterIsoCell(r.testMethod || '--', { alignment: AlignmentType.CENTER, widthDxa: W_COL4 }),
            createWaterIsoCell(r.requirement || '--', { alignment: AlignmentType.CENTER, widthDxa: W_COL5 }),
            createWaterIsoCell(r.permissibleLimit || '--', { alignment: AlignmentType.CENTER, widthDxa: W_COL6 }),
          ],
        })
      );
    }
  }

  return new Table({ rows: tableRows, width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA } });
};

/**
 * generateWaterIso10500Report
 * Generates the complete dual-column Water ISO 10500:2012 compliance report.
 */
const generateWaterIso10500Report = async (job, reportType, providedProfile = null) => {
  const isNabl = reportType === 'nabl' || job.sample?.nabl_type === 'Nabl';
  const { testReportNo, registrationNo, isAmended, baseReportNo } = deriveReportFields(job.jobCode);

  const fallbackDate = job.sample?.received_date || job.createdAt;
  const completedAt = job.completedAt || fallbackDate;
  const issueDate = formatDate(completedAt);

  // 1. Fetch SpecialProfile parameters
  let profile = providedProfile;
  if (!profile) {
    try {
      profile = await SpecialProfile.findOne({ key: 'waterIso10500' });
    } catch {
      profile = null;
    }
  }
  const baselineParams = profile?.parameters?.length
    ? profile.parameters
    : SPECIAL_PROFILE_CONSTANTS.find((p) => p.key === 'waterIso10500')?.parameters || [];

  // Create lookup map of results submitted on job
  const jobParamMap = {};
  for (const p of job.parameters || []) {
    if (p.name) {
      jobParamMap[p.name.trim().toLowerCase()] = p;
    }
  }

  // 2. Build complete linear sequence of rows
  const allRows = [];

  // Chemical discipline starts
  allRows.push({ type: 'discipline', discipline: 'Chemical' });

  let enteredBio = false;
  for (const bp of baselineParams) {
    const isBio = bp.name === 'Total  Coliform' || bp.name === 'E. coli';

    // Inject biological discipline header right before the first microbiology item
    if (isBio && !enteredBio) {
      allRows.push({ type: 'discipline', discipline: 'Biological' });
      enteredBio = true;
    }

    if (bp.isCategoryHeader) {
      allRows.push({
        type: 'category',
        name: bp.name,
      });
    } else {
      const match = jobParamMap[bp.name?.trim().toLowerCase()];
      allRows.push({
        type: 'data',
        name: bp.name,
        unit: match?.unit || bp.unit,
        value: match?.value || bp.value || 'BLQ (LOQ 0.01)',
        testMethod: match?.testMethod || bp.testMethod,
        requirement: match?.requirement || bp.requirement,
        permissibleLimit: match?.permissibleLimit || bp.permissibleLimit,
        srNo: SR_NO_MAP[bp.name] || '',
      });
    }
  }

  // 3. Dynamic Height Calculation and Pagination
  const pages = [];
  let rowIdx = 0;

  const firstPageOverhead =
    FTL_REF_HEIGHT +
    HEADER_HEIGHT +
    TEST_REPORT_TITLE +
    REPORT_ULR_LINE +
    estimateSampleInfoHeight(job) +
    TEST_RESULT_TITLE +
    DUAL_HEADER_HEIGHT;

  const contPageOverhead =
    FTL_REF_HEIGHT +
    HEADER_HEIGHT +
    TEST_REPORT_TITLE +
    REPORT_ULR_LINE +
    CONT_BANNER_HEIGHT +
    SINGLE_HEADER_HEIGHT;

  while (rowIdx < allRows.length || pages.length === 0) {
    const isFirst = pages.length === 0;
    const overhead = isFirst ? firstPageOverhead : contPageOverhead;
    let usedHeight = overhead;
    const pageRows = [];

    while (rowIdx < allRows.length) {
      const row = allRows[rowIdx];
      const rHeight = estimateWaterRowHeight(row);
      const isLastRow = rowIdx === allRows.length - 1;
      const footerH = isLastRow ? FOOTER_BLOCK_HEIGHT : 0;

      if (usedHeight + rHeight + footerH > USABLE_HEIGHT && pageRows.length > 0) {
        break; // Flow to next page
      }

      pageRows.push(row);
      usedHeight += rHeight;
      rowIdx++;
    }

    pages.push({ rows: pageRows });
    if (pageRows.length === 0 && rowIdx >= allRows.length) break;
  }

  // 4. Assemble Word Document Sections
  const sections = [];

  for (let i = 0; i < pages.length; i++) {
    const isFirst = i === 0;
    const isLast = i === pages.length - 1;
    const pageObj = pages[i];
    const children = [];

    // FTL reference
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'FTL/AIPER/F/7.8-01', bold: true, font: 'Times New Roman', size: 16 })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
      })
    );

    // Header Table (Logos and Address)
    children.push(buildHeaderTable(isNabl));

    // TEST REPORT title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'TEST REPORT', bold: true, font: 'Times New Roman', size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 40 },
      })
    );

    // Report No. + ULR No. on same line with tab stop
    const reportUlrRuns = [
      new TextRun({ text: 'Report  No. ', bold: true, font: 'Times New Roman', size: 20 }),
      new TextRun({ text: testReportNo, font: 'Times New Roman', size: 20 }),
    ];
    if (isNabl && job.sample?.ulr_no) {
      reportUlrRuns.push(new TextRun({ text: '\t', font: 'Times New Roman', size: 20 }));
      reportUlrRuns.push(new TextRun({ text: 'ULR No. ', bold: true, font: 'Times New Roman', size: 20 }));
      reportUlrRuns.push(new TextRun({ text: job.sample.ulr_no, font: 'Times New Roman', size: 20 }));
    }
    children.push(
      new Paragraph({
        children: reportUlrRuns,
        tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH_DXA }],
        spacing: { before: 40, after: 40 },
      })
    );

    if (isFirst) {
      // Full Sample Info Table
      children.push(buildWaterIsoSampleInfoTable(job, registrationNo, issueDate));

      // TEST RESULT title
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'TEST RESULT', bold: true, font: 'Times New Roman', size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 60 },
        })
      );
    } else {
      // 2-row continuation banner
      children.push(buildContinuationBanner(job, registrationNo, issueDate));
      children.push(new Paragraph({ children: [], spacing: { before: 80, after: 40 } }));
    }

    // Results table for this chunk
    children.push(buildWaterIsoResultsTable(pageObj.rows, isFirst));

    if (isLast) {
      // Remarks (2 paragraphs matching sample docx)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Remark :', bold: true, font: 'Times New Roman', size: 20 }),
            new TextRun({
              text: ' It is recommended that the acceptable limit is to be implemented. Values in excess of those mentioned under',
              font: 'Times New Roman',
              size: 20,
            }),
          ],
          spacing: { before: 80, after: 0 },
          alignment: AlignmentType.JUSTIFY,
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '‘acceptable’  render the water not suitable, but still may be tolerated in the absence of an alternative source but up to the limits           indicated under ‘permissible limit in the absence of alternate source’ in col 7, above which the source will have rejected.',
              font: 'Times New Roman',
              size: 20,
            }),
          ],
          spacing: { before: 0, after: 40 },
          alignment: AlignmentType.JUSTIFY,
        })
      );

      // Notes (separate paragraphs matching sample docx)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '          NOTE: ', bold: true, font: 'Times New Roman', size: 20 }),
            new TextRun({ text: '1) Report shall not be reproduced except in full without approval of the laboratory.', font: 'Times New Roman', size: 20 }),
          ],
          spacing: { before: 40, after: 0 },
          alignment: AlignmentType.LEFT,
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: ' 2) The results relate only to the items sampled & tested.', font: 'Times New Roman', size: 20 }),
          ],
          spacing: { before: 0, after: 0 },
          alignment: AlignmentType.LEFT,
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: ' 3) Duplicate report will be issued on chargeable basis. ', font: 'Times New Roman', size: 20 }),
          ],
          spacing: { before: 0, after: 40 },
          alignment: AlignmentType.LEFT,
        })
      );
      if (isAmended) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: ` 4) This test report is the replacement to earlier test report no. (${baseReportNo}). Earlier test report stands obsolete.`,
                font: 'Times New Roman',
                size: 20,
              }),
            ],
            spacing: { before: 0, after: 40 },
            alignment: AlignmentType.LEFT,
          })
        );
      }

      // Abbreviations
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Abbreviations used: ', bold: true, font: 'Times New Roman', size: 20 }),
            new TextRun({
              text: 'UOM: Unit of Measurement; BLQ-Below limit of Quantification, LOQ:-Limit of Quantification DOE: Date of Expiry; DOM: Date of Manufacturing; NA: Not Applicable.NMT: Not More Than , NLT: Not Less Than',
              font: 'Times New Roman',
              size: 20,
            }),
          ],
          spacing: { before: 40, after: 60 },
          alignment: AlignmentType.LEFT,
        })
      );

      // Signatures (3 signatories)
      const sigCells = [
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Reviewed By', bold: true, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: 'Ms. Diksha Dwivedi', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: 'Analyst', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
          ],
          borders: BORDERS_NONE,
          width: { size: Math.round(PAGE_WIDTH_DXA / 3), type: WidthType.DXA },
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Authorized Signatory', bold: true, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: 'Ms. Monika Pali', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: 'Technical Manager', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
          ],
          borders: BORDERS_NONE,
          width: { size: Math.round(PAGE_WIDTH_DXA / 3), type: WidthType.DXA },
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Authorized Signatory', bold: true, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: 'Ms. Jyoti Pathak', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: 'Department Head Microbiology', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
          ],
          borders: BORDERS_NONE,
          width: { size: Math.round(PAGE_WIDTH_DXA / 3), type: WidthType.DXA },
        }),
      ];

      children.push(new Paragraph({ children: [], spacing: { before: 600 } }));
      children.push(
        new Table({
          rows: [new TableRow({ children: sigCells })],
          width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
          borders: TABLE_BORDERS_NONE,
        })
      );

      children.push(
        new Paragraph({
          children: [new TextRun({ text: '  *End of report*', bold: true, font: 'Times New Roman', size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
        })
      );
    }

    sections.push({
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
          size: { width: 12240, height: 15840 },
        },
      },
      headers: { default: new Header({ children: [] }) },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [new TextRun({ text: `Page ${i + 1} of ${pages.length}`, font: 'Times New Roman', size: 20 })],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      children,
    });
  }

  const doc = new Document({ sections });
  return await Packer.toBuffer(doc);
};

module.exports = {
  generateWaterIso10500Report,
};
