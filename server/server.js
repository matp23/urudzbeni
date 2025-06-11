const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_originalname
    const uniqueName = Date.now() + '_' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Samo PDF datoteke su dozvoljene'), false);
    }
  },
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Static files - serve uploaded PDFs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const documentsRoutes = require('./routes/documents');

// Use routes with multer middleware
app.use('/api/documents', upload.single('pdf'), documentsRoutes);

// Error handling middleware for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datoteka je prevelika. Maksimalna veličina je 10MB.' });
    }
    return res.status(400).json({ error: 'Greška pri upload-u datoteke: ' + err.message });
  }
  
  if (err.message === 'Samo PDF datoteke su dozvoljene') {
    return res.status(400).json({ error: err.message });
  }
  
  next(err);
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Urudžbeni zapisnik API server je pokrenut!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server je pokrenut na portu ${PORT}`);
});