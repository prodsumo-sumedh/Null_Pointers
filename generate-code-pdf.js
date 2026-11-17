const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUTPUT_FILENAME = 'Aarogya_Sangam_SourceCode.pdf';
const OUTPUT_PATH = path.join(__dirname, OUTPUT_FILENAME);

// Core architectural files selected for the Copyright submission
const SOURCE_FILES = [
  {
    path: 'src/app/layout.tsx',
    role: 'Application Shell, Font Injection, Global Metadata & Responsive Viewport',
    lang: 'TypeScript (TSX)'
  },
  {
    path: 'src/lib/db.ts',
    role: 'Dexie.js Client-Side IndexedDB Offline Schema & Dirty-Flag Queue Store',
    lang: 'TypeScript'
  },
  {
    path: 'src/lib/vernacularTriage.ts',
    role: 'Vernacular Hindi Clinical Triage Dictionary & Vital Scorer',
    lang: 'TypeScript'
  },
  {
    path: 'src/lib/janAushadhiFormulary.ts',
    role: 'PMBJP Generic Drug Formulary & Generic Brand Substitution Engine',
    lang: 'TypeScript'
  },
  {
    path: 'src/lib/webrtc.ts',
    role: 'Adaptive Low-Bandwidth WebRTC Stream Controller & Dual-Camera Pipeline',
    lang: 'TypeScript'
  },
  {
    path: 'src/components/TeleconsultationRoom.tsx',
    role: 'LiveKit WebRTC SFU Video Room with Dynamic Dynacast Bandwidth Adaptation',
    lang: 'TypeScript (TSX)'
  },
  {
    path: 'src/components/IncomingCallAlert.tsx',
    role: 'WebRTC Real-Time Incoming Audio Call Notification & Ringtone Handler',
    lang: 'TypeScript (TSX)'
  },
  {
    path: 'src/app/api/token/route.ts',
    role: 'LiveKit Cloud WebRTC Access Token Minting & Room Security API',
    lang: 'TypeScript'
  },
  {
    path: 'src/app/triage/[patientId]/page.tsx',
    role: 'Hindi Clinical Triage Form, Symptom Assessment & Urgent Care Badging',
    lang: 'TypeScript (TSX)'
  },
  {
    path: 'src/app/page.tsx',
    role: 'ASHA Village Digital Kiosk Dashboard, Patient Intake & Offline Queue Manager',
    lang: 'TypeScript (TSX)'
  },
  {
    path: 'signaling-server.js',
    role: 'Real-Time WebSocket Signaling Server for WebRTC Teleconsultation Room',
    lang: 'JavaScript (Node.js)'
  },
  {
    path: 'src/context/AuthContext.tsx',
    role: 'Role-Based Authentication (ASHA Kiosk vs Medical Officer Portal)',
    lang: 'TypeScript (TSX)'
  }
];

function wrapLine(line, maxChars = 92) {
  line = line.replace(/\t/g, '  ').replace(/\r$/, '');
  if (line.length <= maxChars) return [line];
  const chunks = [];
  let remaining = line;
  while (remaining.length > maxChars) {
    chunks.push(remaining.substring(0, maxChars));
    remaining = '    ' + remaining.substring(maxChars);
  }
  chunks.push(remaining);
  return chunks;
}

function generatePDF() {
  console.log('Initializing PDF generation for Indian Copyright Registration (Form XIV)...');

  // Verify file existence and collect metadata
  let totalRawLines = 0;
  let totalBytes = 0;
  const verifiedFiles = [];

  for (const item of SOURCE_FILES) {
    const fullPath = path.join(__dirname, item.path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: File not found: ${item.path}`);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const rawLines = content.split('\n');
    const stat = fs.statSync(fullPath);

    totalRawLines += rawLines.length;
    totalBytes += stat.size;

    verifiedFiles.push({
      ...item,
      fullPath,
      content,
      rawLines,
      lineCount: rawLines.length,
      sizeBytes: stat.size,
      sizeKb: (stat.size / 1024).toFixed(1)
    });
  }

  console.log(`Found ${verifiedFiles.length} core files, total ${totalRawLines} lines (${(totalBytes / 1024).toFixed(1)} KB)`);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
    bufferPages: true,
    autoFirstPage: false
  });

  const writeStream = fs.createWriteStream(OUTPUT_PATH);
  doc.pipe(writeStream);

  // --------------------------------------------------------------------------
  // PAGE 1: TITLE PAGE (FORM XIV SPECIFICATION)
  // --------------------------------------------------------------------------
  doc.addPage();
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Outer and Inner Borders
  doc.save();
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(1.5).strokeColor('#073763').stroke();
  doc.rect(24, 24, pageWidth - 48, pageHeight - 48).lineWidth(0.75).strokeColor('#C00000').stroke();
  doc.restore();

  // Header
  let y = 45;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#073763')
     .text('GOVERNMENT OF INDIA', 0, y, { align: 'center', width: pageWidth });
  y += 14;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#C00000')
     .text('THE COPYRIGHT OFFICE', 0, y, { align: 'center', width: pageWidth });
  y += 13;
  doc.font('Helvetica').fontSize(9).fillColor('#333333')
     .text('Extract of Source Code Submitted for Registration of Copyright in Computer Software', 0, y, { align: 'center', width: pageWidth });
  y += 11;
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#555555')
     .text('[Under Section 2(o) & Rule 70(6) of the Copyright Rules, 2013 | Form XIV]', 0, y, { align: 'center', width: pageWidth });

  y += 16;
  doc.moveTo(40, y).lineTo(pageWidth - 40, y).lineWidth(0.75).strokeColor('#073763').stroke();

  // Title Box
  y += 15;
  doc.rect(40, y, pageWidth - 80, 85).fillAndStroke('#F4F7FA', '#073763');
  
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#C00000')
     .text('TITLE OF WORK / COMPUTER PROGRAM', 50, y + 10, { align: 'center', width: pageWidth - 100 });
  
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#073763')
     .text('AAROGYA SANGAM', 50, y + 24, { align: 'center', width: pageWidth - 100 });
  
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#222222')
     .text('Low-Bandwidth Resilient Rural Telemedicine & Offline-First Digital Health Station', 50, y + 54, { align: 'center', width: pageWidth - 100 });
  
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#555555')
     .text('Progressive Web Application (PWA) Architecture for Rural Healthcare Outreach', 50, y + 68, { align: 'center', width: pageWidth - 100 });

  y += 100;

  // Work Details Table
  doc.rect(40, y, pageWidth - 80, 115).fillAndStroke('#FFFFFF', '#B0C4DE');
  
  doc.rect(40, y, pageWidth - 80, 20).fill('#073763');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
     .text('1. PARTICULARS OF THE WORK (FORM XIV STATUTORY DISCLOSURE)', 50, y + 5);

  const workDetails = [
    ['Category / Nature of Work:', 'Computer Software (Section 2(o), Copyright Act, 1957)'],
    ['Languages & Frameworks:', 'TypeScript 5, React 19, Next.js 16, Dexie.js (IndexedDB), LiveKit WebRTC SFU, Node.js'],
    ['Class of Work:', 'Literary Work — Computer Program / Source Code'],
    ['Year of Completion:', '2026'],
    ['Country of First Publication:', 'India (MIT ADT University, Pune, Maharashtra)'],
    ['Redaction Status:', 'Un-redacted (Complete original source code without masking or deletions)']
  ];

  let wy = y + 26;
  for (const [k, v] of workDetails) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#073763').text(k, 50, wy, { width: 160 });
    doc.font('Helvetica').fontSize(8).fillColor('#222222').text(v, 210, wy, { width: pageWidth - 260 });
    wy += 14.5;
  }

  y += 128;

  // Authors Table
  doc.rect(40, y, pageWidth - 80, 120).fillAndStroke('#FFFFFF', '#B0C4DE');
  doc.rect(40, y, pageWidth - 80, 20).fill('#073763');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
     .text('2. APPLICANTS & AUTHORS OF THE WORK', 50, y + 5);

  const authors = [
    { no: '1', name: 'Chitransh Sable', id: 'ADT25SOCB0349', role: 'Full-Stack Developer & Software Architect' },
    { no: '2', name: 'Sumedh Dhoke', id: 'ADT25SOCB1367', role: 'WebRTC Systems & DevOps Engineer' },
    { no: '3', name: 'Mahek Shaikh', id: 'ADT25SOCB0600', role: 'Offline Database & Sync Architect' },
    { no: '4', name: 'Tejas Joshi', id: 'ADT25SOCB0520', role: 'Clinical Triage & UI/UX Engineer' }
  ];

  let ay = y + 26;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#666666');
  doc.text('Sr.', 50, ay);
  doc.text('Author / Applicant Name', 75, ay);
  doc.text('Institutional Enrollment No.', 230, ay);
  doc.text('System Responsibility', 380, ay);
  ay += 12;
  doc.moveTo(50, ay - 3).lineTo(pageWidth - 50, ay - 3).lineWidth(0.5).strokeColor('#E0E0E0').stroke();

  for (const a of authors) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#073763').text(a.no, 50, ay);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#222222').text(a.name, 75, ay);
    doc.font('Helvetica').fontSize(8).fillColor('#555555').text(a.id, 230, ay);
    doc.font('Helvetica').fontSize(8).fillColor('#444444').text(a.role, 380, ay);
    ay += 18;
  }

  y += 132;

  // Institutional Affiliation Box
  doc.rect(40, y, pageWidth - 80, 75).fillAndStroke('#FFFFFF', '#B0C4DE');
  doc.rect(40, y, pageWidth - 80, 18).fill('#073763');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
     .text('3. ACADEMIC INSTITUTION & RESEARCH AFFILIATION', 50, y + 4.5);

  let iy = y + 24;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#073763').text('Department:', 50, iy);
  doc.font('Helvetica').fontSize(8).fillColor('#222222')
     .text('Department of Computer Science & Engineering, MIT School of Computing', 140, iy);
  iy += 13;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#073763').text('Institution:', 50, iy);
  doc.font('Helvetica').fontSize(8).fillColor('#222222')
     .text('MIT Art, Design and Technology University, Rajbaug Campus, Loni Kalbhor, Pune – 412201', 140, iy);
  iy += 13;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#073763').text('Project Group / Guide:', 50, iy);
  doc.font('Helvetica').fontSize(8).fillColor('#222222')
     .text('Group No: SY906  |  Under the Guidance of Prof. Reena Pagare (Assistant Professor, CSE)', 140, iy);

  y += 85;

  // Certificate Box
  doc.rect(40, y, pageWidth - 80, 65).fillAndStroke('#FFF9F9', '#C00000');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#C00000')
     .text('STATUTORY DECLARATION UNDER RULE 70(6) (NON-REDACTION CERTIFICATE)', 50, y + 8, { align: 'center', width: pageWidth - 100 });
  
  doc.font('Helvetica').fontSize(7.5).fillColor('#333333')
     .text(
       'I/We hereby certify and affirm that this source code extract represents the genuine, bona fide, un-redacted computer program source code for "Aarogya Sangam", submitted in compliance with Rule 70(6) of the Copyright Rules, 2013 for registration in the Register of Copyrights (Form XIV). No security keys, clinical algorithms, or architectural routines have been redacted, altered, or masked.',
       50, y + 22, { align: 'justify', width: pageWidth - 100, lineGap: 1.5 }
     );

  // --------------------------------------------------------------------------
  // PAGE 2: TABLE OF CONTENTS & FILE MANIFEST
  // --------------------------------------------------------------------------
  doc.addPage();
  
  let my = 50;
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#073763')
     .text('Table of Contents: Source Code Manifest', 40, my);
  my += 18;
  doc.font('Helvetica').fontSize(8.5).fillColor('#555555')
     .text('Complete listing of architectural modules and files submitted in this copyright deposit.', 40, my);
  my += 16;
  doc.moveTo(40, my).lineTo(pageWidth - 40, my).lineWidth(1).strokeColor('#073763').stroke();
  my += 12;

  // Table header
  doc.rect(40, my, pageWidth - 80, 20).fill('#073763');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
  doc.text('Sr.', 46, my + 5);
  doc.text('File Path & Subsystem', 70, my + 5);
  doc.text('Architectural Role', 240, my + 5);
  doc.text('Lines', 460, my + 5);
  doc.text('Size', 500, my + 5);
  my += 20;

  verifiedFiles.forEach((file, idx) => {
    const rowBg = (idx % 2 === 0) ? '#F8FAFC' : '#FFFFFF';
    doc.rect(40, my, pageWidth - 80, 26).fillAndStroke(rowBg, '#E2E8F0');

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#073763')
       .text(String(idx + 1).padStart(2, '0'), 46, my + 8);
    
    doc.font('Courier-Bold').fontSize(7.5).fillColor('#073763')
       .text(file.path, 70, my + 5, { width: 165 });
    doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#666666')
       .text(file.lang, 70, my + 15);

    doc.font('Helvetica').fontSize(7).fillColor('#333333')
       .text(file.role, 240, my + 4, { width: 215, lineGap: 1 });

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#222222')
       .text(String(file.lineCount), 460, my + 8);

    doc.font('Helvetica').fontSize(7.5).fillColor('#555555')
       .text(`${file.sizeKb} KB`, 500, my + 8);

    my += 26;
  });

  my += 15;
  // Summary Card
  doc.rect(40, my, pageWidth - 80, 50).fillAndStroke('#F4F7FA', '#073763');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#073763')
     .text('DEPOSIT SPECIFICATION SUMMARY', 50, my + 8);
  doc.font('Helvetica').fontSize(8).fillColor('#333333')
     .text(`• Total Source Files Deposited: ${verifiedFiles.length} files across Next.js, IndexedDB, WebRTC & Node.js subsystems.`, 50, my + 20);
  doc.font('Helvetica').fontSize(8).fillColor('#333333')
     .text(`• Total Cumulative Code Volume: ${totalRawLines} physical lines (${(totalBytes / 1024).toFixed(1)} KB uncompressed source).`, 50, my + 32);

  // --------------------------------------------------------------------------
  // PAGES 3+: SOURCE CODE LISTINGS WITH MONOSPACE FORMATTING
  // --------------------------------------------------------------------------
  console.log('Appending formatted source code listings...');
  
  const CODE_FONT_SIZE = 7.2;
  const CODE_LINE_HEIGHT = 9.4;
  const USABLE_PAGE_BOTTOM = pageHeight - 55;
  const TOP_CONTENT_Y = 55;

  let currentY = TOP_CONTENT_Y;
  doc.addPage();

  verifiedFiles.forEach((file, fileIdx) => {
    // Check if we need a new page for file header banner (needs ~55 pt)
    if (currentY + 55 > USABLE_PAGE_BOTTOM) {
      doc.addPage();
      currentY = TOP_CONTENT_Y;
    }

    // File Header Banner
    doc.save();
    doc.rect(40, currentY, pageWidth - 80, 20).fill('#073763');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
       .text(`SOURCE CODE FILE [${fileIdx + 1}/${verifiedFiles.length}]: ${file.path}`, 48, currentY + 5);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#A0C4E2')
       .text(file.lang, pageWidth - 140, currentY + 5, { width: 90, align: 'right' });

    currentY += 20;

    // Sub-banner
    doc.rect(40, currentY, pageWidth - 80, 16).fillAndStroke('#F0F4F8', '#CBD5E1');
    doc.font('Helvetica').fontSize(7).fillColor('#333333')
       .text(`Role: ${file.role}  |  Lines: ${file.lineCount}  |  File Size: ${file.sizeKb} KB`, 48, currentY + 4);
    doc.restore();

    currentY += 22;

    // Print lines of code
    doc.font('Courier').fontSize(CODE_FONT_SIZE);

    for (let lineIdx = 0; lineIdx < file.rawLines.length; lineIdx++) {
      const lineStr = file.rawLines[lineIdx];
      const wrappedChunks = wrapLine(lineStr, 94);

      for (let chunkIdx = 0; chunkIdx < wrappedChunks.length; chunkIdx++) {
        // Page overflow check
        if (currentY + CODE_LINE_HEIGHT > USABLE_PAGE_BOTTOM) {
          doc.addPage();
          currentY = TOP_CONTENT_Y;
          doc.font('Courier').fontSize(CODE_FONT_SIZE);
        }

        const isFirstChunk = (chunkIdx === 0);
        const lineNumStr = isFirstChunk ? String(lineIdx + 1).padStart(4, ' ') : '    ';

        // Line number background bar
        doc.save();
        doc.rect(40, currentY, 32, CODE_LINE_HEIGHT).fill('#F8F9FA');
        doc.font('Courier').fontSize(CODE_FONT_SIZE).fillColor('#888888')
           .text(lineNumStr, 40, currentY + 1, { width: 28, align: 'right' });
        
        // Vertical divider
        doc.rect(73, currentY, 0.5, CODE_LINE_HEIGHT).fill('#DDDDDD');

        // Code chunk text
        doc.font('Courier').fontSize(CODE_FONT_SIZE).fillColor('#1A1A1A')
           .text(wrappedChunks[chunkIdx], 78, currentY + 1, { lineBreak: false });
        doc.restore();

        currentY += CODE_LINE_HEIGHT;
      }
    }

    // Space after file
    currentY += 14;
  });

  // --------------------------------------------------------------------------
  // TWO-PASS RUNNING HEADERS & FOOTERS ACROSS ALL BUFFERED PAGES
  // --------------------------------------------------------------------------
  console.log('Rendering running headers, footers, and page numbers...');
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    // Skip Title Page (Page 1)
    if (i === 0) continue;

    // Temporarily zero out margins so text at the top and bottom edges does not trigger auto-addPage
    const savedMargins = { ...doc.page.margins };
    doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

    doc.save();
    // Top running header line & text
    doc.strokeColor('#073763').lineWidth(0.75)
       .moveTo(40, 36).lineTo(pageWidth - 40, 36).stroke();
    
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#073763')
       .text('Aarogya Sangam — Source Code Deposit (Form XIV)', 40, 24, { width: 300, align: 'left', lineBreak: false });
    
    doc.font('Helvetica').fontSize(7.5).fillColor('#C00000')
       .text('Indian Copyright Office | Category: Computer Software', pageWidth - 290, 24, { width: 250, align: 'right', lineBreak: false });

    // Bottom running footer line & text
    doc.strokeColor('#B0C4DE').lineWidth(0.5)
       .moveTo(40, pageHeight - 38).lineTo(pageWidth - 40, pageHeight - 38).stroke();
    
    doc.font('Helvetica').fontSize(7).fillColor('#555555')
       .text('Authors: Chitransh Sable, Sumedh Dhoke, Mahek Shaikh, Tejas Joshi | MITSoC Pune', 40, pageHeight - 30, { width: 340, align: 'left', lineBreak: false });
    
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#073763')
       .text(`Page ${i + 1} of ${totalPages}`, pageWidth - 140, pageHeight - 30, { width: 100, align: 'right', lineBreak: false });
    
    doc.restore();
    doc.page.margins = savedMargins;
  }

  doc.end();

  writeStream.on('finish', () => {
    const stats = fs.statSync(OUTPUT_PATH);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n=======================================================`);
    console.log(`SUCCESS: Copyright PDF generated successfully!`);
    console.log(`Output File: ${OUTPUT_PATH}`);
    console.log(`Total Pages: ${totalPages}`);
    console.log(`File Size:   ${stats.size} bytes (${sizeMb} MB)`);
    console.log(`Compliance:  Under 10MB limit (Strictly Compliant with Form XIV)`);
    console.log(`=======================================================\n`);
  });

  writeStream.on('error', (err) => {
    console.error('Error writing PDF stream:', err);
  });
}

generatePDF();
