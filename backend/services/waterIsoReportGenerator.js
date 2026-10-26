const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  Header,
  Footer,
  TabStopType,
  PageNumber,
} = require('docx');

const SpecialProfile = require('../models/SpecialProfile');
const { SPECIAL_PROFILE_CONSTANTS } = require('../utils/specialProfileConstants');
const {
  createCell,
  deriveReportFields,
  buildHeaderTable,
  formatDate,
  formatSignatoryName,
  PAGE_WIDTH_DXA,
  BORDERS_ALL,
  BORDERS_NONE,
  TABLE_BORDERS_NONE,
} = require('./reportGenerator');

// Specific markers for Water ISO 10500 parameters matching standard numbering
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

// Column widths for 7-column Water ISO results table (sum = 10800 dxa)
const COL_WIDTHS = [800, 2400, 900, 1100, 2000, 1800, 1800];

// Height estimation constants in twips matching reportGenerator.js
const PAGE_HEIGHT_DXA = 15840;
const MARGIN_TOP = 720;
const MARGIN_BOTTOM = 720;
const FOOTER_RESERVE = 400;
const USABLE_HEIGHT = PAGE_HEIGHT_DXA - MARGIN_TOP - MARGIN_BOTTOM - FOOTER_RESERVE;

const LINE_HEIGHT = 260;
const ROW_PADDING = 50;
const AVG_CHAR_WIDTH = 100;
const SAFETY_FACTOR = 1.0;

const HEADER_HEIGHT = Math.ceil(1600 * SAFETY_FACTOR);
const FTL_REF_HEIGHT = Math.ceil(340 * SAFETY_FACTOR);
const TEST_REPORT_TITLE = Math.ceil(360 * SAFETY_FACTOR);
const REPORT_ULR_LINE = Math.ceil(280 * SAFETY_FACTOR);
const TEST_RESULT_TITLE = Math.ceil(400 * SAFETY_FACTOR);
const RESULTS_HEADER_ROW = Math.ceil(640 * SAFETY_FACTOR);
const FOOTER_BLOCK_HEIGHT = Math.ceil(3200 * SAFETY_FACTOR);
const DISCIPLINE_HEADER_HEIGHT = Math.ceil((2 * LINE_HEIGHT + ROW_PADDING) * SAFETY_FACTOR);

const estimateLines = (text, colWidthDxa) => {
  if (!text) return 1;
  const charsPerLine = Math.max(1, Math.floor(colWidthDxa / AVG_CHAR_WIDTH));
  let total = 0;
  for (const line of String(text).split('\n')) {
    total += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return total;
};

const estimateRowHeight = (row) => {
  if (row.type === 'discipline') {
    return DISCIPLINE_HEADER_HEIGHT;
  }
  if (row.type === 'category') {
    return LINE_HEIGHT + ROW_PADDING + 80;
  }
  const nameLines = estimateLines(row.name, COL_WIDTHS[1]);
  const methodLines = estimateLines(row.testMethod, COL_WIDTHS[4]);
  const reqLines = estimateLines(row.requirement, COL_WIDTHS[5]);
  const permLines = estimateLines(row.permissibleLimit, COL_WIDTHS[6]);
  const maxLines = Math.max(nameLines, methodLines, reqLines, permLines, 1);
  return Math.ceil((maxLines * LINE_HEIGHT + ROW_PADDING) * SAFETY_FACTOR);
};

const estimateSampleInfoHeight = (job) => {
  const sample = job.sample || {};
  let height = 3 * LINE_HEIGHT + ROW_PADDING; // customer block
  height += 7 * (LINE_HEIGHT + ROW_PADDING); // fixed 7 rows
  const descLines = estimateLines(sample.sample_description, 8100);
  height += descLines * LINE_HEIGHT + ROW_PADDING;
  return Math.ceil(height * SAFETY_FACTOR);
};

const calcFirstPageOverhead = (job) => {
  return FTL_REF_HEIGHT + HEADER_HEIGHT + TEST_REPORT_TITLE + REPORT_ULR_LINE + estimateSampleInfoHeight(job) + TEST_RESULT_TITLE + RESULTS_HEADER_ROW;
};

const calcContinuationOverhead = () => {
  const CONT_SAMPLE_INFO = Math.ceil((LINE_HEIGHT + ROW_PADDING) * SAFETY_FACTOR);
  return FTL_REF_HEIGHT + HEADER_HEIGHT + TEST_REPORT_TITLE + REPORT_ULR_LINE + CONT_SAMPLE_INFO + RESULTS_HEADER_ROW + 160;
};

// Helper to create table cell with exact dxa width
const createCellDxa = (text, widthDxa, options = {}) => {
  const {
    bold = false,
    alignment = AlignmentType.LEFT,
    colSpan = 1,
    rowSpan = 1,
    borders = BORDERS_ALL,
    shading = null,
    size = 20,
    verticalAlign = VerticalAlign.CENTER,
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
    width: { size: widthDxa, type: WidthType.DXA },
  };

  if (shading) {
    cellOptions.shading = { fill: shading };
  }
  return new TableCell(cellOptions);
};

// Build sample info table (8 clean rows, width = 10800 dxa)
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
  const colW = [2700, 3240, 2484, 2376]; // sum = 10800 dxa

  // Row 0: Customer info (colspan: 4)
  rows.push(
    new TableRow({
      cantSplit: true,
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
      cantSplit: true,
      children: [
        createCellDxa('Sample Name\n( as stated by customer )', colW[0], { bold: true }),
        createCellDxa((sample.sample_name || 'Drinking Water') + '  ', colW[1]),
        createCellDxa('Registration No.', colW[2], { bold: true }),
        createCellDxa(registrationNo, colW[3]),
      ],
    })
  );

  // Row 2: Product Category & Issue Date
  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCellDxa('Product Category ', colW[0], { bold: true }),
        createCellDxa(job.groupMetadata?.productCategory || 'Drinking water', colW[1]),
        createCellDxa('Issue Date ', colW[2], { bold: true }),
        createCellDxa(issueDate, colW[3]),
      ],
    })
  );

  // Row 3: Sample Quantity & Date of Receipt
  const rawQty = sample.sample_quantity || 'N/A';
  const displayQty = rawQty.startsWith('01x') || rawQty.startsWith('1x') ? rawQty : `01x ${rawQty}`;
  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCellDxa('Sample Quantity', colW[0], { bold: true }),
        createCellDxa(displayQty, colW[1]),
        createCellDxa('Date of Receipt', colW[2], { bold: true }),
        createCellDxa(receiptDate, colW[3]),
      ],
    })
  );

  // Row 4: Packing Details & Testing period
  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCellDxa('Packing Details ', colW[0], { bold: true }),
        createCellDxa(sample.packing_details || 'Packed in green colour jar.', colW[1]),
        createCellDxa('Testing period', colW[2], { bold: true }),
        createCellDxa(testingPeriodStr, colW[3]),
      ],
    })
  );

  // Row 5: Marking Seal & Standard Specification
  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCellDxa('Marking Seal ( if any)', colW[0], { bold: true }),
        createCellDxa(sample.marking_seal || 'NA', colW[1]),
        createCellDxa('Standard Specification', colW[2], { bold: true }),
        createCellDxa(compliance.standard_specification || 'IS 10500:2012', colW[3]),
      ],
    })
  );

  // Row 6: Sampling Details & Condition on receipt
  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCellDxa('Sampling Details', colW[0], { bold: true }),
        createCellDxa(sample.sampling_details || 'Sample provided by the customer', colW[1]),
        createCellDxa('Sample condition on receipt', colW[2], { bold: true }),
        createCellDxa(sample.condition_on_receipt || 'Satisfactory', colW[3]),
      ],
    })
  );

  // Row 7: Sample Description (colspan 3 for value)
  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        createCellDxa('Sample Description', colW[0], { bold: true }),
        createCellDxa((sample.sample_description || 'N/A') + ' \n', colW[1] + colW[2] + colW[3], { colSpan: 3 }),
      ],
    })
  );

  return new Table({
    rows,
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: colW,
  });
};

// Build continuation banner table (width = 10800 dxa)
const buildContinuationTable = (job, registrationNo) => {
  const colW = [3240, 2160, 2700, 2700]; // sum = 10800 dxa
  return new Table({
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          createCellDxa('Sample Name\n( as stated by customer )', colW[0], { bold: true }),
          createCellDxa(job.sample?.sample_name || 'Drinking Water', colW[1]),
          createCellDxa('Registration No.', colW[2], { bold: true }),
          createCellDxa(registrationNo, colW[3]),
        ],
      }),
    ],
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: colW,
  });
};

// Build results table for a given page's slice of rows
const buildWaterIsoResultsTable = (pageRows, repeatHeader = null) => {
  const tableRows = [];

  // Header Row 0
  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        createCellDxa('Sr. No.', COL_WIDTHS[0], { bold: true, alignment: AlignmentType.CENTER, rowSpan: 2 }),
        createCellDxa('Test Parameters', COL_WIDTHS[1], { bold: true, alignment: AlignmentType.CENTER, rowSpan: 2 }),
        createCellDxa('UoM', COL_WIDTHS[2], { bold: true, alignment: AlignmentType.CENTER, rowSpan: 2 }),
        createCellDxa('Result', COL_WIDTHS[3], { bold: true, alignment: AlignmentType.CENTER, rowSpan: 2 }),
        createCellDxa('Test Method', COL_WIDTHS[4], { bold: true, alignment: AlignmentType.CENTER, rowSpan: 2 }),
        createCellDxa(
          'Limit as per IS: 10500:2012 (Reaff.2023) with Amendment No: 4 November 2021',
          COL_WIDTHS[5] + COL_WIDTHS[6],
          { bold: true, alignment: AlignmentType.CENTER, colSpan: 2 }
        ),
      ],
    })
  );

  // Header Row 1
  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        createCellDxa('Requirement (Acceptable Limit)', COL_WIDTHS[5], { bold: true, alignment: AlignmentType.CENTER }),
        createCellDxa('Permissible Limit in the absence of Alternate Source', COL_WIDTHS[6], { bold: true, alignment: AlignmentType.CENTER }),
      ],
    })
  );

  // Optional repeated discipline header if continuing mid-discipline
  if (repeatHeader) {
    const isBio = repeatHeader === 'Biological';
    const cell1Text = isBio
      ? 'Discipline- Biological\nMicrobiology Test Parameter'
      : 'Discipline- Chemical\nChemical Test Parameter';
    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          createCellDxa(cell1Text, COL_WIDTHS[0] + COL_WIDTHS[1], {
            bold: true,
            colSpan: 2,
            alignment: AlignmentType.CENTER,
            shading: 'F2F2F2',
          }),
          createCellDxa('Group: Water                                     Sub Group: Drinking water', PAGE_WIDTH_DXA - (COL_WIDTHS[0] + COL_WIDTHS[1]), {
            bold: true,
            colSpan: 5,
            alignment: AlignmentType.CENTER,
            shading: 'F2F2F2',
          }),
        ],
      })
    );
  }

  // Add the rows assigned to this page
  for (const r of pageRows) {
    if (r.type === 'discipline') {
      const isBio = r.discipline === 'Biological';
      const cell1Text = isBio
        ? 'Discipline- Biological\nMicrobiology Test Parameter'
        : 'Discipline- Chemical\nChemical Test Parameter';
      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            createCellDxa(cell1Text, COL_WIDTHS[0] + COL_WIDTHS[1], {
              bold: true,
              colSpan: 2,
              alignment: AlignmentType.CENTER,
              shading: 'F2F2F2',
            }),
            createCellDxa('Group: Water                                     Sub Group: Drinking water', PAGE_WIDTH_DXA - (COL_WIDTHS[0] + COL_WIDTHS[1]), {
              bold: true,
              colSpan: 5,
              alignment: AlignmentType.CENTER,
              shading: 'F2F2F2',
            }),
          ],
        })
      );
    } else if (r.type === 'category') {
      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            createCellDxa(r.name, PAGE_WIDTH_DXA, {
              bold: true,
              colSpan: 7,
              alignment: AlignmentType.CENTER,
              shading: 'F2F2F2',
            }),
          ],
        })
      );
    } else {
      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            createCellDxa(r.srNo || '', COL_WIDTHS[0], { alignment: AlignmentType.CENTER }),
            createCellDxa(r.name || '', COL_WIDTHS[1], { alignment: AlignmentType.LEFT }),
            createCellDxa(r.unit || '-', COL_WIDTHS[2], { alignment: AlignmentType.CENTER }),
            createCellDxa(r.value || 'BLQ (LOQ 0.01)', COL_WIDTHS[3], { alignment: AlignmentType.CENTER }),
            createCellDxa(r.testMethod || 'N/A', COL_WIDTHS[4], { alignment: AlignmentType.LEFT }),
            createCellDxa(r.requirement || 'N/A', COL_WIDTHS[5], { alignment: AlignmentType.CENTER }),
            createCellDxa(r.permissibleLimit || 'No relaxation', COL_WIDTHS[6], { alignment: AlignmentType.CENTER }),
          ],
        })
      );
    }
  }

  return new Table({
    rows: tableRows,
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: COL_WIDTHS,
  });
};

// Build signature table (3 columns, width = 10800 dxa)
const buildSignatureTable = (job) => {
  const analystName = formatSignatoryName(job.assignedAnalyst, 'Ms. Diksha Dwivedi');
  const chemHead = formatSignatoryName(job.distribution?.chemical?.assignedHead?.name, 'Ms. Monika Pali');
  const microHead = formatSignatoryName(job.distribution?.micro?.assignedHead?.name, 'Ms. Jyoti Pathak');
  const sigColWidth = 3600; // 3600 * 3 = 10800 dxa

  const sigCells = [
    new TableCell({
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Reviewed By', bold: true, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: analystName, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: 'Analyst', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
      ],
      borders: BORDERS_NONE,
      width: { size: sigColWidth, type: WidthType.DXA },
    }),
    new TableCell({
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Authorized Signatory', bold: true, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: chemHead, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: 'Technical Manager', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
      ],
      borders: BORDERS_NONE,
      width: { size: sigColWidth, type: WidthType.DXA },
    }),
    new TableCell({
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Authorized Signatory', bold: true, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: microHead, font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: 'Microbiology Head', font: 'Times New Roman', size: 20 })], alignment: AlignmentType.CENTER }),
      ],
      borders: BORDERS_NONE,
      width: { size: sigColWidth, type: WidthType.DXA },
    }),
  ];

  return new Table({
    rows: [new TableRow({ children: sigCells })],
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [sigColWidth, sigColWidth, sigColWidth],
    borders: TABLE_BORDERS_NONE,
  });
};

/**
 * Main report generator for Water ISO 10500 jobs.
 * Follows reportGenerator.js section-by-section dynamic pagination architecture.
 */
const generateWaterIso10500Report = async (job, reportType, providedProfile = null) => {
  const isNabl = reportType === 'nabl' || job.sample?.nabl_type === 'Nabl';
  const { testReportNo, registrationNo, isAmended, baseReportNo } = deriveReportFields(job.jobCode);

  const fallbackDate = job.sample?.received_date || job.createdAt;
  const completedAt = job.completedAt || fallbackDate;
  const issueDate = formatDate(completedAt);

  // 1. Fetch baseline parameters
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
  allRows.push({ type: 'discipline', discipline: 'Chemical' });

  let enteredBio = false;
  let srCounter = 1;
  for (const bp of baselineParams) {
    const isBio = bp.name === 'Total  Coliform' || bp.name === 'E. coli' || bp.name === 'Total Coliform';

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
      let srNo = SR_NO_MAP[bp.name];
      if (!srNo) {
        srNo = `${srCounter}.`;
        srCounter++;
      }
      allRows.push({
        type: 'result',
        srNo,
        name: bp.name,
        unit: match?.unit || bp.unit || '-',
        value: match?.value || bp.value || 'BLQ (LOQ 0.01)',
        testMethod: match?.testMethod || bp.testMethod || 'N/A',
        requirement: match?.requirement || bp.requirement || 'N/A',
        permissibleLimit: match?.permissibleLimit || bp.permissibleLimit || 'No relaxation',
      });
    }
  }

  // 3. Dynamic pagination via height estimation matching reportGenerator.js
  const pages = [];
  let idx = 0;
  let activeDiscipline = 'Chemical';

  while (idx < allRows.length || pages.length === 0) {
    const isFirstPage = pages.length === 0;
    const overhead = isFirstPage ? calcFirstPageOverhead(job) : calcContinuationOverhead();
    let usedHeight = overhead;
    const pageRows = [];

    let needsDisciplineRepeat = !isFirstPage && activeDiscipline !== null;
    if (needsDisciplineRepeat) {
      usedHeight += DISCIPLINE_HEADER_HEIGHT;
    }

    while (idx < allRows.length) {
      const row = allRows[idx];
      const rowHeight = estimateRowHeight(row);

      if (row.type === 'discipline') {
        activeDiscipline = row.discipline;
      }

      const isLastRow = idx === allRows.length - 1;
      const footerHeight = isLastRow ? FOOTER_BLOCK_HEIGHT : 0;

      if (usedHeight + rowHeight + footerHeight > USABLE_HEIGHT && pageRows.length > 0) {
        break;
      }

      pageRows.push(row);
      usedHeight += rowHeight;
      idx++;

      if (row.type === 'discipline') {
        needsDisciplineRepeat = false;
      }
    }

    let repeatHeader = null;
    if (!isFirstPage && needsDisciplineRepeat && activeDiscipline) {
      repeatHeader = activeDiscipline;
    }

    pages.push({ rows: pageRows, repeatHeader });
    if (pageRows.length === 0 && idx >= allRows.length) break;
  }

  // 4. Build document sections matching reportGenerator.js
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

    // Sticky Header Table
    children.push(buildHeaderTable(isNabl));

    // TEST REPORT title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'TEST REPORT', bold: true, font: 'Times New Roman', size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 40 },
      })
    );

    // Report No. + ULR No.
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

    // Sample Info (Page 1) or Continuation Table (Page 2+)
    if (isFirst) {
      children.push(buildWaterIsoSampleInfoTable(job, registrationNo, issueDate));
    } else {
      children.push(buildContinuationTable(job, registrationNo));
    }

    // TEST RESULT title only on the first page
    if (isFirst) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'TEST RESULT', bold: true, font: 'Times New Roman', size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 60 },
        })
      );
    } else {
      children.push(new Paragraph({ children: [], spacing: { before: 100, after: 60 } }));
    }

    // Results table for this page
    children.push(buildWaterIsoResultsTable(pageObj.rows, pageObj.repeatHeader));

    // Last page footer content
    if (isLast) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Abbreviations used: ', bold: true, font: 'Times New Roman', size: 18 }),
            new TextRun({
              text: 'UOM: Unit of Measurement; BLQ-Below limit of Quantification, LOQ:-Limit of Quantification',
              font: 'Times New Roman',
              size: 18,
            }),
          ],
          spacing: { before: 60 },
          alignment: AlignmentType.LEFT,
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'DOE: Date of Expiry; DOM: Date of Manufacturing; NA: Not Applicable.NMT: Not More Than , NLT: Not Less Than',
              font: 'Times New Roman',
              size: 18,
            }),
          ],
          alignment: AlignmentType.LEFT,
        })
      );

      const noteRuns = [
        new TextRun({ text: 'NOTE: ', bold: true, font: 'Times New Roman', size: 18 }),
        new TextRun({ text: '1) Report shall not be reproduced except in full without approval of the laboratory.', font: 'Times New Roman', size: 18 }),
        new TextRun({ text: '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A02) The results relate only to the items as received.', break: 1, font: 'Times New Roman', size: 18 }),
        new TextRun({ text: '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A03) Duplicate report will be issued on chargeable basis.', break: 1, font: 'Times New Roman', size: 18 }),
      ];
      if (isAmended) {
        noteRuns.push(
          new TextRun({
            text: `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A04) This test report is the replacement to earlier test report no. (${baseReportNo}). Earlier test report stands obsolete.`,
            break: 1,
            font: 'Times New Roman',
            size: 18,
          })
        );
      }
      children.push(new Paragraph({ children: noteRuns, alignment: AlignmentType.LEFT }));

      // Signature table spacer and table
      children.push(new Paragraph({ children: [], spacing: { before: 600 } }));
      children.push(buildSignatureTable(job));

      children.push(
        new Paragraph({
          children: [new TextRun({ text: '*End of report*', bold: true, font: 'Times New Roman', size: 22 })],
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
              children: [
                new TextRun({ text: 'Page ', font: 'Times New Roman', size: 20 }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: 20 }),
                new TextRun({ text: ' of ', font: 'Times New Roman', size: 20 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Times New Roman', size: 20 }),
              ],
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
