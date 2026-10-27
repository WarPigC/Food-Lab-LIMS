import React, { useEffect, useRef } from 'react';
import * as docx from 'docx-preview';

export default function ReportPreview({ blob }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!blob || !containerRef.current) return;
    
    let isStale = false;
    
    // Create a fresh container for this render pass
    const innerContainer = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(innerContainer);
    
    docx.renderAsync(blob, innerContainer, null, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false, 
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: false,
      trimXmlDeclaration: true,
      debug: false
    }).then(() => {
      if (isStale) return; // Ignore if a new render started

      // Post-render: apply scale-to-fit for the container
      const wrapper = innerContainer.querySelector('.docx-wrapper');
      if (wrapper) {
        wrapper.style.backgroundColor = 'transparent';
        wrapper.style.padding = '0';
      }
      
      const sections = innerContainer.querySelectorAll('section.docx');
      sections.forEach(sec => {
        sec.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        sec.style.marginBottom = '2rem';
        sec.style.borderRadius = '4px';
      });

      // Debug image rendering issues
      const images = innerContainer.querySelectorAll('img');
      console.log(`[ReportPreview] Found ${images.length} images in docx-preview output.`);
      images.forEach((img, i) => {
        console.log(`[ReportPreview] Image ${i}: src starts with "${img.src.substring(0, 30)}...", width=${img.width}, naturalWidth=${img.naturalWidth}`);
        
        // Failsafe: if the image fails to load, log it
        img.onerror = () => {
          console.error(`[ReportPreview] Image ${i} failed to load. Src: ${img.src}`);
        };
      });

      // Fix docx-preview rendering artifacts
      fixUlrAlignment(innerContainer);
      fixNablLogoStacking(innerContainer);

      // Scale-to-fit
      applyScaleToFit(innerContainer);
    }).catch(err => {
      if (!isStale) console.error("Error rendering docx preview:", err);
    });

    return () => {
      isStale = true; // Cleanup marks this render as stale
    };
  }, [blob]);

  /**
   * Format Report No and ULR line:
   * 1. On 2-cell header tables (Water ISO and standard reports), indent the
   *    report number to the right and the ULR code to the left (inwards).
   * 2. Remove any empty trailing paragraphs in <header> to ensure no newline
   *    exists between the report code/ULR line and the customer details table.
   * 3. Backward compatibility for legacy single-paragraph reports.
   */
  const fixUlrAlignment = (container) => {
    if (!container) return;

    // 1. Process 2-cell tables containing Report No and ULR
    const allTables = container.querySelectorAll('table');
    allTables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      if (rows.length === 1) {
        const cells = rows[0].querySelectorAll('td');
        if (cells.length === 2) {
          const t0 = (cells[0].textContent || '').trim();
          const t1 = (cells[1].textContent || '').trim();
          if (t0.includes('FTL/AIPER') || t1.includes('ULR No.')) {
            // Indent report number inwards to the right
            cells[0].style.paddingLeft = '14px';
            cells[0].style.boxSizing = 'border-box';
            cells[0].style.textAlign = 'left';

            // Indent ULR code inwards to the left
            cells[1].style.paddingRight = '14px';
            cells[1].style.boxSizing = 'border-box';
            cells[1].style.textAlign = 'right';
            cells[1].style.whiteSpace = 'nowrap';
          }
        }
      }
    });

    // 2. Remove any trailing empty <p> inside <header> to prevent blank newline
    const headers = container.querySelectorAll('header');
    headers.forEach(hdr => {
      const ps = hdr.querySelectorAll('p');
      ps.forEach(p => {
        if (!p.textContent.trim() && !p.querySelector('img')) {
          p.remove();
        }
      });
    });

    // 3. Fallback for legacy single-paragraph reports (if any)
    const allPs = container.querySelectorAll('p');
    allPs.forEach(parentP => {
      if (!parentP.textContent.includes('ULR No.')) return;
      if (parentP.closest('table')) return;
      if (parentP.querySelector('.ulr-right-aligned')) return; // Already processed
      
      const allSpans = Array.from(parentP.querySelectorAll('span'));
      const ulrIdx = allSpans.findIndex(s => s.textContent.includes('ULR No.'));
      
      if (ulrIdx !== -1) {
        const targetSpan = allSpans[ulrIdx];
        let ulrText = '';

        if (targetSpan.textContent.includes('FTL/AIPER') || targetSpan.textContent.includes('Report')) {
          const match = targetSpan.textContent.match(/(.*?)(ULR No\..*)/s);
          if (match) {
            targetSpan.textContent = match[1].replace(/[\s\t]+$/, '');
            ulrText = match[2].trim();
          }
        } else {
          const ulrSpans = allSpans.slice(ulrIdx);
          ulrText = ulrSpans.map(s => s.textContent).join(' ').trim();
          ulrSpans.forEach(s => s.remove());
        }

        // Clean any "Report  No. " prefix if present to match clean report number format
        allSpans.slice(0, ulrIdx).forEach(s => {
          if (s.textContent.includes('Report') && s.textContent.includes('No.')) {
            s.textContent = s.textContent.replace(/Report\s+No\.\s*/i, '');
          }
        });

        // Clean any tab text nodes and redundant spaces
        parentP.childNodes.forEach(node => {
          if (node.nodeType === 3) {
            node.textContent = node.textContent.replace(/\t/g, '').replace(/[\s]{2,}$/, ' ');
          }
        });

        // Use flexbox with inward indents
        parentP.style.display = 'flex';
        parentP.style.justifyContent = 'space-between';
        parentP.style.alignItems = 'baseline';
        parentP.style.paddingLeft = '14px';
        parentP.style.paddingRight = '14px';
        parentP.style.boxSizing = 'border-box';

        const sec = parentP.closest('section');
        const allSecTables = sec ? Array.from(sec.querySelectorAll('table')) : [];
        const refTable = allSecTables.length > 1 ? allSecTables[1] : (allSecTables[0] || null);
        if (refTable) {
          const tableRect = refTable.getBoundingClientRect();
          const pRect = parentP.getBoundingClientRect();
          if (tableRect.width > 0) {
            parentP.style.width = `${tableRect.width}px`;
            const diffX = tableRect.left - pRect.left;
            if (diffX !== 0) {
              parentP.style.marginLeft = `${diffX}px`;
            }
          }
        } else {
          parentP.style.width = '100%';
        }

        const ulrContainer = document.createElement('span');
        ulrContainer.className = 'ulr-right-aligned';
        ulrContainer.style.fontWeight = 'bold';
        ulrContainer.textContent = ulrText;
        parentP.appendChild(ulrContainer);
      }
    });
  };

  /**
   * Fix TC-12434 positioning in the NABL cell.
   * docx-preview renders the right indent differently from Word,
   * so we nudge the text slightly left to align under the NABL logo.
   * Note: flexbox is NOT applied here — it causes Chrome to skip painting images.
   * The backend already puts both images inline in one paragraph to prevent stacking.
   */
  const fixNablLogoStacking = (container) => {
    if (!container) return;
    
    const sections = container.querySelectorAll('section.docx');
    sections.forEach(sec => {
      const firstTable = sec.querySelector('table');
      if (!firstTable) return;
      
      const cells = firstTable.querySelectorAll('td');
      cells.forEach(cell => {
        const images = cell.querySelectorAll('img');
        if (images.length >= 2) {
          // Fix TC-12434 positioning only — no layout changes
          const allPs = cell.querySelectorAll('p');
          allPs.forEach(p => {
            const spans = p.querySelectorAll('span');
            spans.forEach(s => {
              if (s.textContent.trim() === 'TC-12434') {
                p.style.transform = 'translateX(-2px)';
              }
            });
          });
        }
      });
    });
  };

  const applyScaleToFit = (container = containerRef.current) => {
    if (!container) return;
    const section = container.querySelector('section.docx');
    if (!section) return;

    const containerWidth = container.clientWidth || (container.parentElement && container.parentElement.clientWidth);
    const sectionWidth = section.scrollWidth || section.offsetWidth;

    const wrapper = container.querySelector('.docx-wrapper');
    if (sectionWidth > containerWidth && containerWidth > 0) {
      const scale = containerWidth / sectionWidth;
      if (wrapper) {
        wrapper.style.transformOrigin = 'top center';
        wrapper.style.transform = `scale(${scale})`;
        // Adjust container height so it doesn't leave empty space
        wrapper.style.width = `${100 / scale}%`;
      }
    } else if (wrapper) {
      wrapper.style.transform = 'none';
      wrapper.style.width = '100%';
    }
  };

  useEffect(() => {
    // Re-apply scale on window resize
    const handleResize = () => applyScaleToFit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <style>{`
        .report-preview-container {
          display: flex;
          justify-content: center;
        }
        .report-preview-container .docx-wrapper {
          transition: transform 0.2s ease;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          margin: 0 auto !important;
        }
        .report-preview-container section.docx {
          max-width: none !important;
          padding-left: 36pt !important;
          padding-right: 36pt !important;
          margin-left: auto !important;
          margin-right: auto !important;
          overflow: hidden !important;
        }
        .report-preview-container section.docx > header,
        .report-preview-container section.docx > article,
        .report-preview-container section.docx > footer {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .report-preview-container section.docx table {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        /* Reset negative margins that push text out of bounds */
        .report-preview-container p {
          margin-right: 0 !important;
          margin-inline-end: 0 !important;
        }
        /* Remove any empty paragraphs in header that create unwanted newlines */
        .report-preview-container section.docx > header p:empty {
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 0 !important;
        }
        /* Ensure inline-block images in table cells don't stack */
        .report-preview-container td div[style*="inline-block"] {
          vertical-align: middle;
        }
      `}</style>
      <div 
        ref={containerRef} 
        className="report-preview-container"
        style={{ 
          width: '100%', 
          minHeight: '50vh', 
          overflow: 'hidden'
        }}
      >
      </div>
    </>
  );
}
