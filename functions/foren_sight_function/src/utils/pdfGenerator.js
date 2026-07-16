'use strict';

const PDFDocument = require('pdfkit');

/**
 * Format timestamp to a human-readable IST string.
 * 
 * @param {string|Date} dateVal - Date value to format
 * @returns {string} Formatted time string
 */
function formatTime(dateVal) {
  if (!dateVal) return 'N/A';
  try {
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return String(dateVal);
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  } catch (e) {
    return String(dateVal);
  }
}

/**
 * Generates a PDF Buffer from conversation and message history.
 * 
 * @param {object} convo - Conversation payload { conversationId, sessionId, title, createdTime, messages }
 * @returns {Promise<Buffer>} PDF file bytes
 */
function generatePDF(convo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: { top: 60, bottom: 65, left: 50, right: 50 },
        bufferPages: true,
        size: 'A4'
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // 1. Report Title block
      doc.fillColor('#0f172a') // Slate-900 primary
         .font('Helvetica-Bold')
         .fontSize(20)
         .text('ForenSight Crime Investigation Conversation Report', 50, 70, { align: 'left' });

      doc.moveDown(0.5);
      
      // Divider line
      const lineY = doc.y;
      doc.moveTo(50, lineY)
         .lineTo(doc.page.width - 50, lineY)
         .strokeColor('#cbd5e1')
         .lineWidth(1)
         .stroke();

      // 2. Metadata Panel Box
      const metadataStart = lineY + 15;
      doc.rect(50, metadataStart, doc.page.width - 100, 95)
         .fillColor('#f8fafc') // Slate-50 background tint
         .fill();

      doc.rect(50, metadataStart, doc.page.width - 100, 95)
         .strokeColor('#e2e8f0') // Light grey border
         .lineWidth(1)
         .stroke();

      // Metadata Text inside box
      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(9);

      // Metadata Labels
      doc.text('Conversation Title:', 70, metadataStart + 15);
      doc.text('Conversation ID:', 70, metadataStart + 35);
      doc.text('Session ID:', 70, metadataStart + 55);

      doc.text('Created Time:', 320, metadataStart + 15);
      doc.text('Generated Time:', 320, metadataStart + 35);

      // Metadata Values
      doc.font('Helvetica')
         .fillColor('#334155');

      doc.text(convo.title || 'New Investigation', 180, metadataStart + 15, { width: 135, height: 15, ellipsis: true });
      doc.text(String(convo.conversationId || 'N/A'), 180, metadataStart + 35);
      doc.text(String(convo.sessionId || 'N/A'), 180, metadataStart + 55);

      doc.text(formatTime(convo.createdTime), 415, metadataStart + 15);
      doc.text(formatTime(new Date()), 415, metadataStart + 35);

      // Reset cursor below metadata panel
      doc.y = metadataStart + 95 + 25;

      // 3. Conversation History Title
      doc.fillColor('#0f172a')
         .font('Helvetica-Bold')
         .fontSize(14)
         .text('Investigation Chat History', 50, doc.y);

      doc.moveDown(0.5);

      // 4. Chronological Messages
      if (!convo.messages || convo.messages.length === 0) {
        doc.moveDown(1.5);
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#64748b')
           .text('No conversation messages available.', { align: 'center' });
      } else {
        for (const msg of convo.messages) {
          const isUser = String(msg.role).toLowerCase() === 'user';
          const roleName = isUser ? 'User' : 'Assistant';
          const roleColor = isUser ? '#1d4ed8' : '#0f172a'; // Vibrant Blue for User, Navy/Slate for Assistant

          // Keep-together layout constraint
          if (doc.y > doc.page.height - 110) {
            doc.addPage();
          }

          // Visual separator before message
          doc.moveTo(50, doc.y)
             .lineTo(doc.page.width - 50, doc.y)
             .strokeColor('#f1f5f9')
             .lineWidth(1)
             .stroke();

          doc.moveDown(0.5);

          // Role Label
          doc.font('Helvetica-Bold')
             .fontSize(10)
             .fillColor(roleColor)
             .text(roleName, { continued: true });

          // Message Timestamp (small italic)
          if (msg.timestamp) {
            doc.font('Helvetica-Oblique')
               .fontSize(8)
               .fillColor('#64748b')
               .text(`  (${formatTime(msg.timestamp)})`, { align: 'left' });
          } else {
            doc.text('');
          }

          doc.moveDown(0.2);

          // Message Body (with word wrapping & auto-page break)
          doc.font('Helvetica')
             .fontSize(10)
             .fillColor('#334155')
             .text(msg.message || '', {
               align: 'left',
               lineGap: 2.5
             });

          doc.moveDown(1);
        }
      }

      // 5. Draw running headers & footers on all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Running Header (only top line separator and description)
        doc.fontSize(8)
           .fillColor('#64748b')
           .font('Helvetica')
           .text('ForenSight Crime Investigation Conversation Report', 50, 30, { align: 'left' });

        doc.moveTo(50, 42)
           .lineTo(doc.page.width - 50, 42)
           .strokeColor('#cbd5e1')
           .lineWidth(0.5)
           .stroke();

        // Running Footer (bottom separator, "Generated by ForenSight", and page index)
        doc.moveTo(50, doc.page.height - 50)
           .lineTo(doc.page.width - 50, doc.page.height - 50)
           .strokeColor('#cbd5e1')
           .lineWidth(0.5)
           .stroke();

        doc.fontSize(8)
           .fillColor('#64748b')
           .text('Generated by ForenSight', 50, doc.page.height - 40, { align: 'left' });

        doc.text(`Page ${i + 1} of ${range.count}`, doc.page.width - 150, doc.page.height - 40, { width: 100, align: 'right' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePDF
};
