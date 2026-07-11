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
   * Fix ULR right-alignment.
   * docx-preview ignores tab stops, so "Report No. xxx\tULR No. xxx" renders
   * as a single left-aligned line. We find the ULR spans and float them right.
   */
  const fixUlrAlignment = (container) => {
    if (!container) return;
    const allSpans = container.querySelectorAll('span');
    
    allSpans.forEach(span => {
      if (span.textContent.trim() === 'ULR No.') {
        // This span and the next sibling (the ULR value) need to be right-aligned
        const parentP = span.closest('p');
        if (!parentP) return;

        // Collect ULR-related spans (the label + the value after it)
        const ulrSpans = [];
        let found = false;
        const allChildSpans = parentP.querySelectorAll('span');
        allChildSpans.forEach(s => {
          if (s === span) found = true;
          if (found) ulrSpans.push(s);
        });

        if (ulrSpans.length > 0) {
          // Wrap ULR spans in a right-floated container
          const ulrContainer = document.createElement('span');
          ulrContainer.style.cssText = 'float: right;';
          ulrSpans.forEach(s => ulrContainer.appendChild(s.cloneNode(true)));
          ulrSpans.forEach(s => s.remove());
          
          // Remove any tab character text nodes
          parentP.childNodes.forEach(node => {
            if (node.nodeType === 3 && node.textContent.includes('\t')) {
              node.textContent = node.textContent.replace(/\t/g, '');
            }
          });
          
          parentP.appendChild(ulrContainer);
        }
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

    if (sectionWidth > containerWidth && containerWidth > 0) {
      const scale = containerWidth / sectionWidth;
      const wrapper = container.querySelector('.docx-wrapper');
      if (wrapper) {
        wrapper.style.transformOrigin = 'top left';
        wrapper.style.transform = `scale(${scale})`;
        // Adjust container height so it doesn't leave empty space
        wrapper.style.width = `${100 / scale}%`;
      }
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
        .report-preview-container .docx-wrapper {
          transition: transform 0.2s ease;
        }
        .report-preview-container section.docx {
          max-width: none !important;
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
