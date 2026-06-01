const fs = require('fs');

const lines = fs.readFileSync('../temp/data2.txt', 'utf8').split('\n');

const params = [];
let currentParam = '';

for (let i = 16; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    
    // In layout mode, columns are space-separated, but multiple spaces separate columns.
    const parts = line.trim().split(/\s{2,}/);
    
    // Check if the line starts with a number (S.No)
    if (/^\d+$/.test(parts[0])) {
        if (currentParam) {
            params.push(currentParam);
        }
        
        // Column 4 starts around index 84
        if (line.length > 84) {
            const paramPart = line.substring(84, 115).trim();
            currentParam = paramPart;
        } else {
            currentParam = '';
        }
    } else {
        // Continuation line
        if (line.length > 84) {
            const paramPart = line.substring(84, 115).trim();
            if (paramPart && !paramPart.startsWith('characteristic tested') && !paramPart.startsWith('Speciﬁc Test') && !paramPart.startsWith('Tests or type')) {
                currentParam += ' ' + paramPart;
            }
        }
    }
}
if (currentParam) params.push(currentParam);

// Clean up
const cleanParams = params.map(p => p.trim())
    .filter(p => p.length > 0)
    .filter(p => !p.startsWith('Component,'))
    .map(p => {
        // Handle weird PDF pagination strings
        if (p.includes('s not require any signature')) return null;
        if (p.includes('characteristic tested')) return null;
        return p;
    })
    .filter(Boolean);

const uniqueParams = Array.from(new Set(cleanParams)).sort();

fs.writeFileSync('../temp/extracted_parameters.json', JSON.stringify(uniqueParams, null, 2));
console.log(`Extracted ${uniqueParams.length} unique parameters.`);
