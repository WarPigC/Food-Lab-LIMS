const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const {
  deriveReportFields,
  formatSignatoryName,
} = require('./reportGenerator');

const templatePath = path.join(__dirname, '../assets/templates/waterIso10500Template.docx');

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(d) {
  if (!d) return 'N/A';
  if (d instanceof Date) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const str = String(d);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
}

/**
 * Static report generator for Water ISO 10500 reports.
 * 100% Pure Node.js implementation using JSZip to inject dynamic data into a sanitized,
 * generic Bureau of Indian Standards (IS 10500:2012) template.
 * Free of Python dependencies and contains zero customer PII in source control.
 */
const generateWaterIso10500Report = async (job, reportType) => {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Water ISO template not found at ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(content);

  const isNabl = reportType === 'nabl' || job.sample?.nabl_type === 'Nabl';
  const ulrNo = job.sample?.ulr_no || '';
  const { testReportNo, registrationNo } = deriveReportFields(job.jobCode);

  const fallbackDate = job.sample?.received_date || job.createdAt;
  const completedAt = job.completedAt || fallbackDate;
  const issueDate = formatDate(completedAt);
  const receiptDate = formatDate(fallbackDate);

  const tp = job.testingPeriod || {};
  const testingPeriodStr = tp.startDate && tp.endDate
    ? `${formatDate(tp.startDate)} to ${formatDate(tp.endDate)}`
    : `${receiptDate} to ${issueDate}`;

  const customer = job.customer || {};
  const sample = job.sample || {};
  const compliance = job.compliance || {};

  const custName = customer.customer_name || job.clientName || 'N/A';
  const custAddr = customer.customer_address || 'N/A';
  const contactP = customer.contact_person || '';
  const contactM = customer.mobile_number || '';
  const contactStr = (contactP || contactM) ? `${contactP} , ${contactM}`.replace(/^[ ,]+|[ ,]+$/g, '') : 'N/A';
  const custEmail = customer.email || 'N/A';

  const sampleName = sample.sample_name || 'Drinking Water';
  const productCat = job.groupMetadata?.productCategory || 'Drinking water';
  const rawQty = sample.sample_quantity || '01x 1000g';
  const sampleQty = rawQty.startsWith('01x') || rawQty.startsWith('1x') ? rawQty : `01x ${rawQty}`;
  const packing = sample.packing_details || 'Standard Lab Pouch';
  const marking = sample.marking_seal || 'Sealed';
  const standardSpec = compliance.standard_specification || 'IS 10500:2012';
  const samplingDet = sample.sampling_details || 'Sample provided by the customer';
  const sampleCond = sample.condition_on_receipt || 'Sealed & Intact';
  const sampleDesc = sample.sample_description || 'N/A';

  // 1. Process header1.xml (Report No and ULR)
  let hdrXml = await zip.file('word/header1.xml').async('text');
  const headerLineRegex = /<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?\{\{HEADER_REPORT_LINE\}\}[\s\S]*?<\/w:p>/;

  const createHeaderTableXml = (rightCellContentXml) => `<w:tbl>
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="11057" w:type="dxa"/>
    <w:tblInd w:w="-459" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tblBorders>
    <w:tblLayout w:type="fixed"/>
    <w:tblLook w:val="04A0"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="5528"/>
    <w:gridCol w:w="5529"/>
  </w:tblGrid>
  <w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="5528" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:left w:w="180" w:type="dxa"/></w:tcMar></w:tcPr>
      <w:p><w:pPr><w:spacing w:before="20" w:after="60" w:line="240" w:lineRule="auto"/><w:ind w:left="180"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(testReportNo)}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="5529" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:right w:w="180" w:type="dxa"/></w:tcMar></w:tcPr>
      ${rightCellContentXml}
    </w:tc>
  </w:tr>
</w:tbl>`;

  if (isNabl && ulrNo) {
    const rightCellXml = `<w:p><w:pPr><w:spacing w:before="20" w:after="60" w:line="240" w:lineRule="auto"/><w:ind w:right="180"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">ULR No. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(ulrNo)}</w:t></w:r></w:p>`;
    hdrXml = hdrXml.replace(headerLineRegex, createHeaderTableXml(rightCellXml));
  } else {
    const emptyRightCellXml = `<w:p><w:pPr><w:spacing w:before="20" w:after="60" w:line="240" w:lineRule="auto"/><w:ind w:right="180"/><w:jc w:val="right"/></w:pPr></w:p>`;
    hdrXml = hdrXml.replace(headerLineRegex, createHeaderTableXml(emptyRightCellXml));
  }

  // Delete the trailing empty paragraph after the header line to eliminate the newline before customer table
  hdrXml = hdrXml.replace(/<w:p w:rsidR="00E75A7A" w:rsidRPr="00413138"[\s\S]*?<\/w:p>\s*(?=<\/w:hdr>)/, '');
  hdrXml = hdrXml.replace(/<w:p[^>]*>\s*<w:pPr>[\s\S]*?<\/w:pPr>\s*<\/w:p>\s*(?=<\/w:hdr>)/, '');

  // Subtle spacing for TEST REPORT headline: 60 dxa (3pt / 4px) before
  hdrXml = hdrXml.replace(/(<w:pPr>[\s\S]*?<w:spacing\s+)(w:after="0"|w:before="\d+"\s+w:after="\d+")([^>]*>[\s\S]*?<w:t>TEST REPORT<\/w:t>)/, (m, p1, p2, p3) => {
    return p1 + 'w:before="60" w:after="30"' + p3;
  });

  // If not NABL, clear NABL logo/QR cell in header table
  if (!isNabl) {
    hdrXml = hdrXml.replace(
      /(<w:tc>[\s\S]*?<w:t>TC-12434<\/w:t>[\s\S]*?<\/w:tc>)/,
      '<w:tc><w:tcPr><w:tcW w:w="3119" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p/></w:tc>'
    );
  }
  zip.file('word/header1.xml', hdrXml);

  // Process header2.xml (continuation pages: FTL reference only, no Report No/ULR repetition)
  if (zip.file('word/header2.xml')) {
    let hdr2Xml = await zip.file('word/header2.xml').async('text');
    hdr2Xml = hdr2Xml.replace(headerLineRegex, '');
    zip.file('word/header2.xml', hdr2Xml);
  }

  // 2. Process document.xml
  let docXml = await zip.file('word/document.xml').async('text');

  // Replace all generic placeholder tokens
  const placeholderMap = {
    '{{CUSTOMER_NAME}}': escapeXml(custName),
    '{{CUSTOMER_ADDRESS}}': escapeXml(custAddr),
    '{{CONTACT_PERSON}}': escapeXml(contactStr),
    '{{CUSTOMER_EMAIL}}': escapeXml(custEmail),
    '{{SAMPLE_NAME}}': escapeXml(sampleName),
    '{{REGISTRATION_NO}}': escapeXml(registrationNo),
    '{{PRODUCT_CATEGORY}}': escapeXml(productCat),
    '{{ISSUE_DATE}}': escapeXml(issueDate),
    '{{SAMPLE_QUANTITY}}': escapeXml(sampleQty),
    '{{RECEIPT_DATE}}': escapeXml(receiptDate),
    '{{PACKING_DETAILS}}': escapeXml(packing),
    '{{TESTING_PERIOD}}': escapeXml(testingPeriodStr),
    '{{MARKING_SEAL}}': escapeXml(marking),
    '{{STANDARD_SPECIFICATION}}': escapeXml(standardSpec),
    '{{SAMPLING_DETAILS}}': escapeXml(samplingDet),
    '{{SAMPLE_CONDITION}}': escapeXml(sampleCond),
    '{{SAMPLE_DESCRIPTION}}': escapeXml(sampleDesc),
  };

  for (const [token, val] of Object.entries(placeholderMap)) {
    docXml = docXml.split(token).join(val);
  }

  // Format Signatures table (clean 3-column borderless table with cantSplit that fits on Page 8)
  const analystName = formatSignatoryName(job.assignedAnalyst, 'Ms. Diksha Dwivedi');
  const dist = job.distribution || {};
  const chemHead = formatSignatoryName(dist.chemical?.assignedHead?.name, 'Ms. Monika Pali');
  const microHead = formatSignatoryName(dist.micro?.assignedHead?.name, 'Ms. Jyoti Pathak');

  const signaturesTableXml = `<w:tbl>
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="11057" w:type="dxa"/>
    <w:tblInd w:w="-459" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
    </w:tblBorders>
    <w:tblLayout w:type="fixed"/>
    <w:tblLook w:val="04A0"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="3685"/>
    <w:gridCol w:w="3686"/>
    <w:gridCol w:w="3686"/>
  </w:tblGrid>
  <w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="3591" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Reviewed By</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:before="240" w:after="20" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(analystName)}</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:before="20" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Analyst</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="3591" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Authorized Signatory</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:before="240" w:after="20" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(chemHead)}</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:before="20" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Technical Manager</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="3592" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Authorized Signatory</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:before="240" w:after="20" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(microHead)}</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:before="20" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Department Head Microbiology</w:t></w:r></w:p>
    </w:tc>
  </w:tr>
</w:tbl>`;

  docXml = docXml.replace('{{SIGNATURES_TABLE}}', signaturesTableXml);

  // 3. Update Result Cells for Tested Parameters
  const jobParamMap = {};
  for (const p of job.parameters || []) {
    if (p.name) {
      const norm = p.name.replace(/[\s\-_]+/g, '').toLowerCase();
      jobParamMap[norm] = p;
    }
  }

  // Traverse table rows and inject tested values into Cell 3 (Result)
  docXml = docXml.replace(/<w:tr[\s\S]*?<\/w:tr>/g, (rowXml) => {
    const tcs = rowXml.split('</w:tc>').filter((x) => x.includes('<w:tc')).map((x) => x + '</w:tc>');
    if (tcs.length !== 6 && tcs.length !== 7) {
      return rowXml;
    }

    const nameMatch = tcs[1].match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
    if (!nameMatch) return rowXml;

    const paramName = nameMatch[1].trim();
    if (!paramName || ['Test Parameters', 'WaterSub Group - Drinking water', 'Drinking water', 'Group - Water'].includes(paramName) || paramName.includes('Group')) {
      return rowXml;
    }

    const normKey = paramName.replace(/[\s\-_]+/g, '').toLowerCase();
    if (jobParamMap[normKey]) {
      const pData = jobParamMap[normKey];
      let val = pData.value;
      if (val === undefined || val === null || String(val).trim() === '') {
        val = pData.result;
      }

      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const oldResultCell = tcs[3];
        const newResultCell = oldResultCell.replace(
          /(<w:p[\s\S]*?>)[\s\S]*?(<\/w:p>)/,
          `$1<w:pPr><w:spacing w:line="276" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${escapeXml(String(val))}</w:t></w:r>$2`
        );
        return rowXml.replace(oldResultCell, newResultCell);
      }
    }

    return rowXml;
  });

  zip.file('word/document.xml', docXml);

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
};

module.exports = {
  generateWaterIso10500Report,
};
