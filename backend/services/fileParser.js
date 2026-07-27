const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const xlsx = require("xlsx");

/**
 * Parses file buffer and extracts clean text based on mimetype and extension.
 * Supports PDF, DOCX, XLSX, XLS, CSV, TXT, JSON, MD.
 * Truncates output to a safe token limit for Groq's API compatibility.
 * 
 * @param {Buffer} fileBuffer - File raw binary buffer
 * @param {string} mimeType - File mimetype
 * @param {string} originalName - Original file name
 * @returns {Promise<string>} Clean text contents of the file
 */
async function parseFile(fileBuffer, mimeType, originalName) {
  const extension = originalName.split(".").pop().toLowerCase();
  let text = "";
  
  if (extension === "pdf" || mimeType === "application/pdf") {
    const uint8Array = new Uint8Array(fileBuffer);
    const parser = new PDFParse(uint8Array);
    const data = await parser.getText();
    text = data.text;
  }
  else if (extension === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const data = await mammoth.extractRawText({ buffer: fileBuffer });
    text = data.value;
  }
  else if (extension === "xlsx" || extension === "xls" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    workbook.SheetNames.forEach((sheetName) => {
      text += `--- Sheet: ${sheetName} ---\n`;
      const sheet = workbook.Sheets[sheetName];
      // Convert sheet to readable CSV text
      text += xlsx.utils.sheet_to_csv(sheet) + "\n\n";
    });
  }
  else if (extension === "csv" || extension === "txt" || extension === "md" || extension === "json" || mimeType.startsWith("text/")) {
    text = fileBuffer.toString("utf-8");
  }
  else {
    throw new Error(`Unsupported file type: ${extension}`);
  }
  
  // Truncate to 10,000 characters to stay within Groq free-tier TPM rate limits
  if (text.length > 10000) {
    console.log(`[File Parser] Truncating text from ${text.length} to 10000 characters`);
    text = text.substring(0, 10000) + "\n\n[Content truncated to fit context limits...]";
  }
  
  return text;
}

module.exports = { parseFile };
