const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Static report generator for Water ISO 10500 reports.
 * Uses uv and Python to generate reports directly from the accredited Word template,
 * guaranteeing an exact 8-page invariant layout matching the lab standard.
 */
const generateWaterIso10500Report = async (job, reportType) => {
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const uniqueId = `${job.jobCode || 'job'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inputPath = path.join(tempDir, `input_${uniqueId}.json`);
  const outputPath = path.join(tempDir, `report_${uniqueId}.docx`);

  try {
    fs.writeFileSync(inputPath, JSON.stringify({ job, reportType }), 'utf-8');

    const scriptPath = path.join(__dirname, 'waterIsoGenerator.py');
    execFileSync('uv', ['run', 'python3', scriptPath, inputPath, outputPath], {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf-8',
    });

    const buffer = fs.readFileSync(outputPath);
    return buffer;
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (_) {}
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (_) {}
  }
};

module.exports = {
  generateWaterIso10500Report,
};
