const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Paths
const SRS_MD_PATH = path.join(__dirname, '..', '..', 'Documentation', 'SRS.md');
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'images', 'tooth.png');
const OUTPUT_PATH = path.join(__dirname, '..', '..', 'Documentation', 'PakTeeth_SRS.pdf');

async function generatePDF() {
    console.log("Reading SRS.md...");
    const content = fs.readFileSync(SRS_MD_PATH, 'utf8');
    const lines = content.split('\n');

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(OUTPUT_PATH);
    doc.pipe(stream);

    // --- Title Page ---
    if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, doc.page.width / 2 - 50, 100, { width: 100 });
    }

    doc.moveDown(8);
    doc.font('Helvetica-Bold').fontSize(30).fillColor('#2E74B5').text("Software Requirements Specification", { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(20).fillColor('#555555').text("PakTeeth Dental Clinic Management System", { align: 'center' });
    
    doc.moveDown(10);
    doc.fontSize(12).fillColor('#000000').text(`Version: 1.0`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.text(`Status: Official Documentation`, { align: 'center' });

    doc.addPage();

    // --- Content ---
    for (let line of lines) {
        line = line.trim();
        if (!line) {
            doc.moveDown(0.5);
            continue;
        }

        if (line.startsWith('# ')) {
            // Already handled in title page
            continue;
        } else if (line.startsWith('## ')) {
            doc.moveDown(1);
            doc.font('Helvetica-Bold').fontSize(18).fillColor('#2E74B5').text(line.replace('## ', ''));
            doc.moveDown(0.5);
        } else if (line.startsWith('### ')) {
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#333333').text(line.replace('### ', ''));
            doc.moveDown(0.3);
        } else if (line.startsWith('- ')) {
            doc.font('Helvetica').fontSize(11).fillColor('#000000').text(`• ${line.replace('- ', '')}`, { indent: 20 });
        } else if (line.match(/^\d+\./)) {
            doc.font('Helvetica').fontSize(11).fillColor('#000000').text(line, { indent: 20 });
        } else if (line === '---') {
            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#CCCCCC').stroke();
            doc.moveDown(1);
        } else {
            // Standard paragraph with bold parsing
            doc.font('Helvetica').fontSize(11).fillColor('#333333');
            
            // Simple bold parsing **text**
            const parts = line.split(/(\*\*.*?\*\*)/g);
            let currentX = doc.x;
            let currentY = doc.y;

            for (const part of parts) {
                if (part.startsWith('**') && part.endsWith('**')) {
                    doc.font('Helvetica-Bold').text(part.slice(2, -2), { continued: true });
                } else {
                    doc.font('Helvetica').text(part, { continued: true });
                }
            }
            doc.text(""); // End the 'continued' chain
        }
    }

    doc.end();

    stream.on('finish', () => {
        console.log(`Success! PDF saved at: ${OUTPUT_PATH}`);
    });
}

generatePDF().catch(err => {
    console.error("Error generating PDF:", err);
    process.exit(1);
});
