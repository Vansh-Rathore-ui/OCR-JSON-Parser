const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use('/output', express.static('output'));
app.use('/uploads', express.static('uploads'));

// ✅ Define multer upload middleware here
const upload = multer({ dest: 'uploads/' });

// ✅ Route using upload middleware AFTER it's defined
app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const mimeType = req.file.mimetype;

  try {
    let text = '';

    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (mimeType.startsWith('image/')) {
      const worker = await createWorker('eng');
      const result = await worker.recognize(filePath);
      await worker.terminate();
      text = result.data.text;
    } else {
      throw new Error('Unsupported file type');
    }

    fs.unlinkSync(filePath);

    const cleanedText = text.replace(/\s+/g, ' ').trim();
    const result = { raw_text: cleanedText };

    const jsonFileName = `${Date.now()}_ocr.json`;
    const jsonFilePath = path.join(__dirname, 'output', jsonFileName);
    fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));

    res.json({ jsonFile: `/output/${jsonFileName}` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(5000, () => {
  console.log('🚀 Server running at http://localhost:5000');
});
