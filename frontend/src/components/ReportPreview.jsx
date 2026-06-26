import React, { useEffect, useRef } from 'react';
import * as docx from 'docx-preview';

export default function ReportPreview({ blob }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!blob || !containerRef.current) return;
    
    // Clear previous render
    containerRef.current.innerHTML = '';
    
    docx.renderAsync(blob, containerRef.current, null, {
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
      // Post-render: apply scale-to-fit for the container
      const wrapper = containerRef.current.querySelector('.docx-wrapper');
      if (wrapper) {
        wrapper.style.backgroundColor = 'transparent';
        wrapper.style.padding = '0';
      }
      
      const sections = containerRef.current.querySelectorAll('section.docx');
      sections.forEach(sec => {
        sec.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        sec.style.marginBottom = '2rem';
        sec.style.borderRadius = '4px';
      });

      // Fix docx-preview rendering artifacts
      fixUlrAlignment();
      fixNablLogoStacking();

      // Scale-to-fit: measure the rendered page width and scale it to fit the container
      applyScaleToFit();
    }).catch(err => console.error("Error rendering docx preview:", err));
  }, [blob]);

  /**
   * Fix ULR right-alignment.
   * docx-preview ignores tab stops, so "Report No. xxx\tULR No. xxx" renders
   * as a single left-aligned line. We find the ULR spans and float them right.
   */
  const fixUlrAlignment = () => {
    if (!containerRef.current) return;
    const allSpans = containerRef.current.querySelectorAll('span');
    
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
   * Fix NABL logo + QR code stacking.
   * docx-preview wraps each image in a div with display:inline-block, but they
   * may stack vertically. We ensure the container cell uses flexbox to keep
   * images side-by-side, and also fix image visibility on first load.
   */
  const fixNablLogoStacking = () => {
    if (!containerRef.current) return;
    
    // Find the header table (first table in each section)
    const sections = containerRef.current.querySelectorAll('section.docx');
    sections.forEach(sec => {
      const firstTable = sec.querySelector('table');
      if (!firstTable) return;
      
      const cells = firstTable.querySelectorAll('td');
      cells.forEach(cell => {
        const images = cell.querySelectorAll('img');
        if (images.length >= 2) {
          // This is the NABL cell with logo + QR code — fix layout
          const paragraph = cell.querySelector('p');
          if (paragraph) {
            paragraph.style.cssText += 'display: flex; align-items: center; justify-content: center; gap: 4pt; flex-wrap: nowrap;';
          }
          // Ensure image containers don't force block layout
          const imgDivs = cell.querySelectorAll('div');
          imgDivs.forEach(d => {
            if (d.querySelector('img')) {
              d.style.display = 'inline-block';
              d.style.flexShrink = '0';
            }
          });
        }
      });
    });
  };

  const applyScaleToFit = () => {
    if (!containerRef.current) return;
    const section = containerRef.current.querySelector('section.docx');
    if (!section) return;

    const containerWidth = containerRef.current.clientWidth;
    const sectionWidth = section.scrollWidth || section.offsetWidth;

    if (sectionWidth > containerWidth) {
      const scale = containerWidth / sectionWidth;
      const wrapper = containerRef.current.querySelector('.docx-wrapper');
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
