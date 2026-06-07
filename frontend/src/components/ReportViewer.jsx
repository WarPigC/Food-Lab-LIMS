import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { Download } from 'lucide-react';
import logo from '../assets/Acropolis20Logo.png';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveReportFields(jobCode) {
  const baseCode = jobCode ? jobCode.split('-')[0] : '';
  const last4 = baseCode ? baseCode.slice(-4) : '0000';
  const yy = baseCode ? baseCode.slice(0, 2) : '00';
  const retestMatch = jobCode ? jobCode.match(/retest-\d+/) : null;
  const retestSuffix = retestMatch ? `/${retestMatch[0].toUpperCase()}` : '';
  const testReportNo = `FTL/AIPER/${yy}/${last4}${retestSuffix}`;
  const registrationNo = String(Math.max(0, parseInt(last4, 10) - 1099));
  return { testReportNo, registrationNo };
}

const ITEMS_PER_PAGE = 12; // max result rows before splitting to a new page

// ─── Shared styles ────────────────────────────────────────────────────────────
const border = '1px solid #333';
const td = { border, padding: '4px 7px', fontSize: '10.5px', verticalAlign: 'top' };
const label = { ...td, fontWeight: 600, whiteSpace: 'nowrap', width: '155px', backgroundColor: '#f8f9fa' };
const hdr = { ...td, fontWeight: 700, backgroundColor: '#f0f0f0', padding: '5px 7px' };
const pageStyle = {
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#fff',
  color: '#000',
  padding: '18px 24px',
  maxWidth: '780px',
  margin: '0 auto',
  boxSizing: 'border-box',
};

// ─── NABL Logo (embedded SVG circle with text — pure vector, no external file) ─
function NablLogo({ size = 64 }) {
  // Simple representation of the NABL seal in SVG
  return (
    <svg width={size} height={size} viewBox="0 0 120 130" style={{ display: 'block' }}>
      <circle cx="60" cy="55" r="52" fill="none" stroke="#000" strokeWidth="3"/>
      <circle cx="60" cy="55" r="44" fill="none" stroke="#000" strokeWidth="1.5"/>
      {/* Star */}
      <polygon points="60,18 65,37 84,37 69,48 74,67 60,56 46,67 51,48 36,37 55,37" fill="#000"/>
      {/* Text top arc */}
      <text fontSize="7.5" fontFamily="Arial" textAnchor="middle">
        <textPath href="#topArc" startOffset="50%">NATIONAL ACCREDITATION BOARD FOR TESTING AND CALIBRATION</textPath>
      </text>
      <defs>
        <path id="topArc" d="M 15,55 A 45,45 0 0,1 105,55"/>
      </defs>
      <text x="60" y="110" fontSize="8" fontFamily="Arial" textAnchor="middle" fontWeight="bold">INDIA</text>
      {/* Ribbons */}
      <rect x="45" y="105" width="12" height="18" fill="#000"/>
      <rect x="63" y="105" width="12" height="18" fill="#000"/>
    </svg>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader({ isNabl, docRef }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', border }}>
      <tbody>
        <tr>
          <td style={{ ...td, width: '140px', textAlign: 'center', verticalAlign: 'middle', border }}>
            <img src={logo} alt="Acropolis" style={{ maxWidth: '115px', maxHeight: '65px', objectFit: 'contain' }} />
          </td>
          <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle', border }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Food Testing Laboratory</div>
            <div style={{ fontSize: '9.5px', color: '#444' }}>
              Acropolis Institute of Pharmaceutical Education and Research<br />
              Mangliya Square, Indore Bypass Road, Indore M.P.-453771<br />
              Mobile: +91 9201974674 | Landline: 731-4730174, 175, 176 &amp; 184<br />
              Email ID: ftl@acropolis.edu.in | Website: www.acrolabs.in
            </div>
          </td>
          <td style={{ ...td, width: '90px', textAlign: 'right', verticalAlign: 'top', border, fontSize: '8.5px', whiteSpace: 'nowrap' }}>
            <div>FTL/AIPER/F/7.8-01</div>
            {isNabl && (
              <div style={{ marginTop: '4px' }}>
                <NablLogo size={60} />
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Continuation header (all pages except page 1) ───────────────────────────
function ContinuationHeader({ isNabl, testReportNo, sampleName, pageNum, totalPages }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', border }}>
      <tbody>
        <tr>
          <td style={{ ...td, width: '140px', textAlign: 'center', verticalAlign: 'middle', border }}>
            <img src={logo} alt="Acropolis" style={{ maxWidth: '115px', maxHeight: '55px', objectFit: 'contain' }} />
          </td>
          <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle', border }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>Food Testing Laboratory</div>
            <div style={{ fontSize: '9.5px', color: '#555', marginTop: '2px' }}>TEST REPORT (Contd.) — Page {pageNum} of {totalPages}</div>
            <div style={{ fontSize: '9px', marginTop: '2px' }}>Report No.: {testReportNo} | Sample: {sampleName} (as stated by customer)</div>
          </td>
          <td style={{ ...td, width: '90px', textAlign: 'right', verticalAlign: 'top', border, fontSize: '8.5px' }}>
            <div>FTL/AIPER/F/7.8-01</div>
            {isNabl && <div style={{ marginTop: '4px' }}><NablLogo size={55} /></div>}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Sample Info Table ────────────────────────────────────────────────────────
function SampleInfoTable({ job, testReportNo, registrationNo, issueDate, receiptDate, testingPeriodStr, isNabl }) {
  const customer = job.customer || {};
  const sample = job.sample || {};
  const compliance = job.compliance || {};
  return (
    <>
      {/* Customer block */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <tbody>
          <tr>
            <td style={label}>Customer Name</td>
            <td style={{ ...td, fontWeight: 600 }} colSpan={3}>{customer.customer_name || job.clientName || 'N/A'}</td>
          </tr>
          <tr>
            <td style={label}>Address</td>
            <td style={td} colSpan={3}>{customer.customer_address || 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      {/* Sample grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <tbody>
          <tr>
            <td style={label}>Sample Name<br /><span style={{ fontWeight: 400, fontSize: '9px' }}>(as stated by customer)</span></td>
            <td style={td}>{sample.sample_name || 'N/A'}</td>
            <td style={label}>Test Report No.</td>
            <td style={td}>{testReportNo}</td>
          </tr>
          <tr>
            <td style={label}>Product Category</td>
            <td style={td}>{sample.sample_description || 'N/A'}</td>
            <td style={label}>Registration No.</td>
            <td style={td}>{registrationNo}</td>
          </tr>
          <tr>
            <td style={label}>Sample Details</td>
            <td style={td}>{sample.sample_quantity || 'N/A'}</td>
            <td style={label}>Issue Date</td>
            <td style={td}>{issueDate}</td>
          </tr>
          <tr>
            <td style={label}>Packing Details</td>
            <td style={td}>{sample.packing_details || 'N/A'}</td>
            <td style={label}>Date of Receipt</td>
            <td style={td}>{receiptDate}</td>
          </tr>
          <tr>
            <td style={label}>Marking Seal (if any)</td>
            <td style={td}>{sample.marking_seal || 'N/A'}</td>
            <td style={label}>Testing Period</td>
            <td style={td}>{testingPeriodStr}</td>
          </tr>
          <tr>
            <td style={label}>Sample Condition on Receipt</td>
            <td style={td}>{sample.condition_on_receipt || 'N/A'}</td>
            <td style={label}>Standard Specification</td>
            <td style={td}>—</td>
          </tr>
          <tr>
            <td style={label}>Customer Ref.</td>
            <td style={td}>{customer.customer_reference_no || 'N/A'}</td>
            <td style={label}>Brand Name</td>
            <td style={td}>N/A</td>
          </tr>
          <tr>
            <td style={label}>Sampling Details</td>
            <td style={td}>{sample.sampling_details || 'Sample provided by the customer'}</td>
            <td style={label}>Tests Requested</td>
            <td style={td}>As Mentioned below</td>
          </tr>
          <tr>
            <td style={label}>Batch No.</td>
            <td style={td}>N/A</td>
            <td style={label}>DOE</td>
            <td style={td}>N/A</td>
          </tr>
          <tr>
            <td style={label}>DOM</td>
            <td style={td}>N/A</td>
            <td style={td} colSpan={2}></td>
          </tr>
          {isNabl && job.sample?.ulr_no && (
            <tr>
              <td style={label}>ULR No.</td>
              <td style={td} colSpan={3}>{job.sample.ulr_no}</td>
            </tr>
          )}
          <tr>
            <td style={label}>Any Handling Instructions<br /><span style={{ fontWeight: 400, fontSize: '9px' }}>provided: Yes/No (if yes; Short detail)</span></td>
            <td style={td} colSpan={3}>{sample.special_handling_instructions || compliance.special_handling_instructions || 'No'}</td>
          </tr>
          <tr>
            <td style={label}>Any data provided by customer</td>
            <td style={td} colSpan={3}>N/A</td>
          </tr>
          <tr>
            <td style={label}>Sample description</td>
            <td style={td} colSpan={3}>{sample.sample_description || 'N/A'}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ─── Results Table rows renderer ─────────────────────────────────────────────
function ResultsTable({ results, showDeptCol, startIdx = 0 }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
      <thead>
        <tr>
          <td style={{ ...hdr, width: '38px', textAlign: 'center' }}>Sr. No.</td>
          <td style={hdr}>Test Parameters</td>
          {showDeptCol && <td style={{ ...hdr, width: '60px', textAlign: 'center' }}>Dept</td>}
          <td style={{ ...hdr, width: '70px', textAlign: 'center' }}>UoM</td>
          <td style={{ ...hdr, width: '95px', textAlign: 'center' }}>Result</td>
          <td style={{ ...hdr, width: '145px', textAlign: 'center' }}>Test Method</td>
          {results.some(r => r.referenceRange) && (
            <td style={{ ...hdr, width: '100px', textAlign: 'center' }}>Specification</td>
          )}
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => {
          let isOutlier = false;
          if (r.referenceRange?.includes('-') && !isNaN(parseFloat(r.value))) {
            const [mn, mx] = r.referenceRange.split('-').map(s => parseFloat(s));
            const val = parseFloat(r.value);
            if (!isNaN(mn) && !isNaN(mx) && (val < mn || val > mx)) isOutlier = true;
          }
          return (
            <tr key={i}>
              <td style={{ ...td, textAlign: 'center' }}>{startIdx + i + 1}.</td>
              <td style={td}>{r.name}</td>
              {showDeptCol && (
                <td style={{ ...td, textAlign: 'center', fontSize: '9.5px', fontWeight: 600,
                  color: r._dept === 'MICRO' ? '#15803d' : '#1d4ed8' }}>{r._dept}</td>
              )}
              <td style={{ ...td, textAlign: 'center' }}>{r.unit || '—'}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: isOutlier ? '#c0392b' : '#000' }}>
                {r.value || '—'}{isOutlier && <span style={{ fontSize: '8px' }}> (FLAG)</span>}
              </td>
              <td style={{ ...td, textAlign: 'center' }}>{r.testMethod || '—'}</td>
              {results.some(x => x.referenceRange) && (
                <td style={{ ...td, textAlign: 'center' }}>{r.referenceRange || '—'}</td>
              )}
            </tr>
          );
        })}
        {results.length === 0 && (
          <tr><td colSpan={showDeptCol ? 6 : 5} style={{ ...td, textAlign: 'center', color: '#888' }}>No results recorded.</td></tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Abbreviations block ──────────────────────────────────────────────────────
function AbbrevBlock() {
  return (
    <div style={{ fontSize: '9px', color: '#333', borderTop: '1px solid #aaa', paddingTop: '5px', marginBottom: '20px' }}>
      <strong>Abbreviations used:</strong> UOM: Unit of Measurement; BLQ: Below limit of Quantification; LOQ: Limit of Quantification; DOE: Date of Expiry; DOM: Date of Manufacturing; NA: Not Applicable.<br />
      <strong>NOTE:</strong> 1) Report shall not be reproduced except in full without approval of the laboratory.<br />
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2) The results relate only to the items sampled / tested as received.<br />
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;3) Duplicate report will be issued on chargeable basis.
    </div>
  );
}

// ─── Signature Footer ─────────────────────────────────────────────────────────
// involvedDepts: array of { name, designation } for all dept heads involved
function SignatureFooter({ involvedDepts }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
      <tbody>
        <tr>
          {/* Left: Reviewer (always Divya Gupta) */}
          <td style={{ width: '30%', fontSize: '10.5px', verticalAlign: 'bottom', paddingBottom: '4px' }}>
            <div style={{ marginBottom: '24px' }}>&nbsp;</div>{/* space for signature */}
            <div style={{ fontWeight: 700 }}>Ms. Divya Gupta</div>
            <div>Reviewed by</div>
          </td>

          {/* Center: End of report */}
          <td style={{ textAlign: 'center', fontSize: '10.5px', verticalAlign: 'bottom', paddingBottom: '4px' }}>
            <strong>*End of report*</strong>
          </td>

          {/* Right: Department Authorised Signatories */}
          <td style={{ width: '38%', textAlign: 'right', fontSize: '10.5px', verticalAlign: 'bottom', paddingBottom: '4px' }}>
            {involvedDepts.map((d, i) => (
              <div key={i} style={{ marginBottom: i < involvedDepts.length - 1 ? '12px' : '0' }}>
                <div style={{ marginBottom: '18px' }}>&nbsp;</div>
                <div style={{ fontWeight: 700 }}>{d.name}</div>
                <div>Authorised Signatory</div>
                <div>{d.designation}</div>
              </div>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Page Footer (page number) ────────────────────────────────────────────────
function PageFooter({ pageNum, totalPages }) {
  return (
    <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#555', borderTop: '1px solid #ccc',
      paddingTop: '4px', marginTop: '8px' }}>
      Page {pageNum} of {totalPages}
    </div>
  );
}

// ─── Build pages from result rows ─────────────────────────────────────────────
function buildPages(results, perPage) {
  const pages = [];
  for (let i = 0; i < Math.max(results.length, 1); i += perPage) {
    pages.push(results.slice(i, i + perPage));
  }
  return pages;
}

// ─── Single Report (NABL or Non-NABL) ────────────────────────────────────────
function SingleReport({ microReport, chemicalReport, isNabl, forwardedRef }) {
  const job = microReport?._job || chemicalReport?._job || {};
  const customer = job.customer || {};
  const sample = job.sample || {};

  const { testReportNo, registrationNo } = deriveReportFields(job.jobCode);
  const completedAt = microReport?.completedAt || chemicalReport?.completedAt;
  const issueDate = completedAt ? new Date(completedAt).toLocaleDateString('en-IN') : 'N/A';
  const receiptDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN') : 'N/A';
  const tp = microReport?.testingPeriod || chemicalReport?.testingPeriod;
  const testingPeriodStr = tp?.startDate && tp?.endDate
    ? `${new Date(tp.startDate).toLocaleDateString('en-IN')} to ${new Date(tp.endDate).toLocaleDateString('en-IN')}`
    : 'N/A';

  const sampleName = sample.sample_name || 'N/A';

  // Build combined result list with dept tag
  const allResults = [
    ...(microReport?.results || []).map(r => ({ ...r, _dept: 'MICRO' })),
    ...(chemicalReport?.results || []).map(r => ({ ...r, _dept: 'CHEMICAL' })),
  ];
  const showDept = !!(microReport && chemicalReport);

  const pages = buildPages(allResults, ITEMS_PER_PAGE);
  const totalPages = pages.length;

  // Signatories
  const involvedDepts = [];
  if (microReport) involvedDepts.push({
    name: microReport.createdBy?.name || 'N/A',
    designation: 'Microbiology Head'
  });
  if (chemicalReport) involvedDepts.push({
    name: chemicalReport.createdBy?.name || 'N/A',
    designation: 'Technical Manager (Chemical)'
  });
  if (involvedDepts.length === 0) involvedDepts.push({ name: 'N/A', designation: 'Technical Manager' });

  return (
    <div ref={forwardedRef}>
      {pages.map((pageResults, pageIdx) => {
        const isFirst = pageIdx === 0;
        const isLast = pageIdx === totalPages - 1;
        return (
          <div key={pageIdx} style={{ ...pageStyle, pageBreakAfter: isLast ? 'auto' : 'always' }}>
            {/* Header */}
            {isFirst
              ? <PageHeader isNabl={isNabl} />
              : <ContinuationHeader isNabl={isNabl} testReportNo={testReportNo}
                  sampleName={sampleName} pageNum={pageIdx + 1} totalPages={totalPages} />
            }

            {/* Title (page 1 only) */}
            {isFirst && (
              <>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px',
                  textDecoration: 'underline', marginBottom: '8px', letterSpacing: '1px' }}>
                  TEST REPORT
                </div>
                {isNabl && job.sample?.ulr_no && (
                  <div style={{ fontSize: '10.5px', marginBottom: '6px', fontWeight: 600 }}>
                    ULR No. {job.sample.ulr_no}
                  </div>
                )}
                <SampleInfoTable
                  job={job}
                  testReportNo={testReportNo}
                  registrationNo={registrationNo}
                  issueDate={issueDate}
                  receiptDate={receiptDate}
                  testingPeriodStr={testingPeriodStr}
                  isNabl={isNabl}
                />
              </>
            )}

            {/* TEST RESULT heading for first results page */}
            {(isFirst || true) && (
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px',
                textDecoration: 'underline', marginBottom: '6px' }}>
                TEST RESULT
              </div>
            )}

            <ResultsTable
              results={pageResults}
              showDeptCol={showDept}
              startIdx={pageIdx * ITEMS_PER_PAGE}
            />

            {/* Last page: abbreviations + signatures + page number */}
            {isLast && (
              <>
                <AbbrevBlock />
                <SignatureFooter involvedDepts={involvedDepts} />
              </>
            )}
            <PageFooter pageNum={pageIdx + 1} totalPages={totalPages} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Hybrid: two separate reports (NABL + Non-NABL) ──────────────────────────
// For hybrid we render SingleReport twice but the job passes nabl/nonNabl params separately.
// The job data passed will have results already split by the caller.

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function ReportViewer({
  // Legacy single-dept
  report,
  // Combined (micro + chemical) — used for non-nabl combined or nabl
  microReport,
  chemicalReport,
  isCombined = false,
  // NABL mode from job: 'nabl' | 'non_nabl' | 'hybrid'
  nablMode = 'non_nabl',
  // For hybrid: nabl-tagged and non-nabl-tagged report objects
  nablMicroReport,
  nablChemicalReport,
  nonNablMicroReport,
  nonNablChemicalReport,
  onBack
}) {
  const reportRef = useRef();
  const nablReportRef = useRef();
  const nonNablReportRef = useRef();

  const isNabl = nablMode === 'nabl';
  const isHybrid = nablMode === 'hybrid';

  const jobForName = (microReport || chemicalReport || nablMicroReport || nablChemicalReport || report)?._job || {};
  const jobCode = jobForName.jobCode || 'Job';

  const downloadPDF = async (ref, filename) => {
    const el = ref.current;
    if (!el) return;
    await html2pdf().from(el).set({
      margin: [6, 8, 6, 8],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).save();
  };

  return (
    <div style={{ maxWidth: '870px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem',
        alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button onClick={onBack} className="btn"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isHybrid ? (
            <>
              <button onClick={() => downloadPDF(nablReportRef, `NABL_Report_${jobCode}.pdf`)}
                className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={16} /> Download NABL Report
              </button>
              <button onClick={() => downloadPDF(nonNablReportRef, `NonNABL_Report_${jobCode}.pdf`)}
                className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={16} /> Download Non-NABL Report
              </button>
            </>
          ) : (
            <button onClick={() => downloadPDF(reportRef, `Report_${jobCode}.pdf`)}
              className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={16} /> Download Official PDF
            </button>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
        {isHybrid ? (
          <>
            {/* NABL section */}
            <div style={{ padding: '8px 16px', backgroundColor: '#e0f2fe', fontWeight: 700, fontSize: '13px',
              borderBottom: '2px solid #0284c7' }}>
              NABL Report
            </div>
            <SingleReport
              microReport={nablMicroReport}
              chemicalReport={nablChemicalReport}
              isNabl={true}
              forwardedRef={nablReportRef}
            />
            {/* Non-NABL section */}
            <div style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', fontWeight: 700, fontSize: '13px',
              borderTop: '2px solid #64748b', borderBottom: '2px solid #64748b', marginTop: '24px' }}>
              Non-NABL Report
            </div>
            <SingleReport
              microReport={nonNablMicroReport}
              chemicalReport={nonNablChemicalReport}
              isNabl={false}
              forwardedRef={nonNablReportRef}
            />
          </>
        ) : (
          <SingleReport
            microReport={isCombined ? microReport : (report ? { ...report, _job: report._job } : null)}
            chemicalReport={isCombined ? chemicalReport : null}
            isNabl={isNabl}
            forwardedRef={reportRef}
          />
        )}
      </div>
    </div>
  );
}
