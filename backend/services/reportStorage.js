const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gfsBucket;

const initGridFS = () => {
  if (mongoose.connection.readyState === 1) { // 1 = connected
    gfsBucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'custom_reports'
    });
  } else {
    mongoose.connection.once('open', () => {
      gfsBucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'custom_reports'
      });
    });
  }
};

initGridFS();

/**
 * Uploads a file buffer to GridFS
 * @param {Buffer} buffer The file buffer
 * @param {String} filename The filename
 * @param {Object} metadata Metadata for the file (e.g. jobId, uploadedBy)
 * @returns {Promise<String>} The file ID as a string
 */
const uploadCustomReport = (buffer, filename, metadata) => {
  return new Promise((resolve, reject) => {
    if (!gfsBucket) return reject(new Error('GridFS is not initialized yet'));

    // If a custom report for this job and type already exists, we should ideally delete it first,
    // but the simplest is just to add a new one and query the latest.
    const uploadStream = gfsBucket.openUploadStream(filename, {
      metadata
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });

    uploadStream.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Downloads a custom report from GridFS by jobId and reportType
 * @param {String} jobId The job ID
 * @param {String} reportType 'nabl' or 'non_nabl'
 * @returns {Promise<{ stream: NodeJS.ReadableStream, contentType: String, filename: String, metadata: Object } | null>}
 */
const downloadCustomReport = async (jobId, reportType) => {
  if (!gfsBucket) throw new Error('GridFS is not initialized yet');

  const files = await gfsBucket.find({
    'metadata.jobId': jobId,
    'metadata.reportType': reportType
  }).sort({ uploadDate: -1 }).limit(1).toArray();

  if (files.length === 0) return null;

  const file = files[0];
  const stream = gfsBucket.openDownloadStream(file._id);

  return {
    stream,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    filename: file.filename,
    metadata: file.metadata,
    uploadDate: file.uploadDate
  };
};

/**
 * Deletes the custom report for a specific job and type
 */
const deleteCustomReport = async (jobId, reportType) => {
  if (!gfsBucket) throw new Error('GridFS is not initialized yet');
  
  const files = await gfsBucket.find({
    'metadata.jobId': jobId,
    'metadata.reportType': reportType
  }).toArray();

  for (const file of files) {
    await gfsBucket.delete(file._id);
  }
};

/**
 * Gets the status of the report (whether custom exists)
 */
const getReportStatus = async (jobId, reportType) => {
  if (!gfsBucket) return { isCustom: false };

  const files = await gfsBucket.find({
    'metadata.jobId': jobId,
    'metadata.reportType': reportType
  }).sort({ uploadDate: -1 }).limit(1).toArray();

  if (files.length > 0) {
    return {
      isCustom: true,
      uploadedBy: files[0].metadata.uploadedBy,
      uploadedAt: files[0].uploadDate
    };
  }
  
  return { isCustom: false };
};

module.exports = {
  uploadCustomReport,
  downloadCustomReport,
  deleteCustomReport,
  getReportStatus
};
