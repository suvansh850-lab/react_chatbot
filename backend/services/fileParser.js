const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const xlsx = require("xlsx");

/**
 * Parses file buffer and extracts clean text based on mimetype and extension.
 * Supports PDF, DOCX, XLSX, XLS, CSV, TXT, JSON, MD.
 * 
 * @param {Buffer} fileBuffer - File raw binary buffer
 * @param {string} mimeType - File mimetype
 * @param {string} originalName - Original file name
 * @returns {Promise<string>} Clean text contents of the file
 */
async function parseFile(fileBuffer, mimeType, originalName) {
  const extension = originalName.split(".").pop().toLowerCase();
  
  if (extension === "pdf" || mimeType === "application/pdf") {
    const data = await pdfParse(fileBuffer);
    return data.text;
  }
  
  if (extension === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const data = await mammoth.extractRawText({ buffer: fileBuffer });
    return data.value;
  }
  
  if (extension === "xlsx" || extension === "xls" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    let text = "";
    workbook.SheetNames.forEach((sheetName) => {
      text += `--- Sheet: ${sheetName} ---\n`;
      const sheet = workbook.Sheets[sheetName];
      // Convert sheet to readable CSV text
      text += xlsx.utils.sheet_to_csv(sheet) + "\n\n";
    });
    return text;
  }
  
  if (extension === "csv" || extension === "txt" || extension === "md" || extension === "json" || mimeType.startsWith("text/")) {
    return fileBuffer.toString("utf-8");
  }
  
  throw new Error(`Unsupported file type: ${extension}`);
}

module.exports = { parseFile };
