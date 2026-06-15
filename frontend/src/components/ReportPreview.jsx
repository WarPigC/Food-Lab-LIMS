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

      // Scale-to-fit: measure the rendered page width and scale it to fit the container
      applyScaleToFit();
    }).catch(err => console.error("Error rendering docx preview:", err));
  }, [blob]);

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
