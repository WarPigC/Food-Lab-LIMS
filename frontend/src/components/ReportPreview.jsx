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
      // Fix mobile width issues dynamically after render
      const wrapper = containerRef.current.querySelector('.docx-wrapper');
      if (wrapper) {
        wrapper.style.backgroundColor = 'transparent';
        wrapper.style.padding = '0';
      }
      
      const sections = containerRef.current.querySelectorAll('section.docx');
      sections.forEach(sec => {
        sec.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        sec.style.marginBottom = '2rem';
        
        // Add responsive CSS class mapping
        sec.classList.add('responsive-docx-section');
      });
    }).catch(err => console.error("Error rendering docx preview:", err));
  }, [blob]);

  return (
    <>
      <style>{`
        .responsive-docx-section {
          max-width: 100% !important;
        }
        @media (max-width: 820px) {
          .responsive-docx-section {
            padding: 1rem !important;
            width: 100% !important;
            min-height: auto !important;
          }
          .responsive-docx-section table {
            width: 100% !important;
          }
          .responsive-docx-section td, .responsive-docx-section th {
             word-break: break-word;
          }
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      </div>
    </>
  );
}
