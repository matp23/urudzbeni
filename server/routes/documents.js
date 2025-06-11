const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Database initialization
const db = require('../database/init');

// GET /api/documents - Dohvaćanje dopisa s filterima
router.get('/', (req, res) => {
  const { year, title, registry_number, date_from, date_to, type } = req.query;
  
  let query = 'SELECT * FROM documents WHERE 1=1';
  const params = [];

  // Dodaj filtere
  if (year) {
    query += ' AND strftime("%Y", date) = ?';
    params.push(year);
  }

  if (title) {
    query += ' AND title LIKE ?';
    params.push(`%${title}%`);
  }

  if (registry_number) {
    query += ' AND registry_number LIKE ?';
    params.push(`%${registry_number}%`);
  }

  if (date_from) {
    query += ' AND date >= ?';
    params.push(date_from);
  }

  if (date_to) {
    query += ' AND date <= ?';
    params.push(date_to);
  }

  if (type) {
    if (type === 'outgoing') {
      query += ' AND registry_number LIKE "01/%"';
    } else if (type === 'incoming') {
      query += ' AND registry_number LIKE "02/%"';
    }
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Greška pri dohvaćanju dopisa:', err);
      return res.status(500).json({ error: 'Greška pri dohvaćanju dopisa' });
    }
    res.json(rows);
  });
});

// POST /api/documents - Kreiranje novog dopisa
router.post('/', (req, res) => {
  const { type, sender, registry_number, title, date, notes } = req.body;
  const pdf_filename = req.file ? req.file.filename : null;

  const query = `
    INSERT INTO documents (type, sender, registry_number, title, date, notes, pdf_filename)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [type, sender, registry_number, title, date, notes, pdf_filename], function(err) {
    if (err) {
      console.error('Greška pri dodavanju dopisa:', err);
      
      // If there's an error and a file was uploaded, clean it up
      if (req.file) {
        const filePath = path.join(__dirname, '../uploads', req.file.filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Greška pri brisanju datoteke:', unlinkErr);
        });
      }
      
      return res.status(500).json({ error: 'Greška pri dodavanju dopisa' });
    }

    res.json({ 
      id: this.lastID, 
      message: 'Dopis uspješno dodan',
      pdf_uploaded: !!pdf_filename,
      pdf_filename: pdf_filename
    });
  });
});

// PUT /api/documents/:id - Ažuriranje dopisa
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { type, sender, registry_number, title, date, notes } = req.body;
  
  // Get current document to handle PDF replacement
  db.get('SELECT pdf_filename FROM documents WHERE id = ?', [id], (err, currentDoc) => {
    if (err) {
      console.error('Greška pri dohvaćanju trenutnog dopisa:', err);
      return res.status(500).json({ error: 'Greška pri ažuriranju dopisa' });
    }

    if (!currentDoc) {
      return res.status(404).json({ error: 'Dopis nije pronađen' });
    }

    // Handle PDF file logic
    let pdf_filename = currentDoc.pdf_filename; // Keep existing by default
    let oldPdfToDelete = null;

    if (req.file) {
      // New PDF uploaded - replace the old one
      pdf_filename = req.file.filename;
      if (currentDoc.pdf_filename) {
        oldPdfToDelete = currentDoc.pdf_filename;
      }
    }

    const query = `
      UPDATE documents 
      SET type = ?, sender = ?, registry_number = ?, title = ?, date = ?, notes = ?, pdf_filename = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [type, sender, registry_number, title, date, notes, pdf_filename, id], function(err) {
      if (err) {
        console.error('Greška pri ažuriranju dopisa:', err);
        
        // If there's an error and a new file was uploaded, clean it up
        if (req.file) {
          const filePath = path.join(__dirname, '../uploads', req.file.filename);
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Greška pri brisanju nove datoteke:', unlinkErr);
          });
        }
        
        return res.status(500).json({ error: 'Greška pri ažuriranju dopisa' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Dopis nije pronađen' });
      }

      // Clean up old PDF if it was replaced
      if (oldPdfToDelete) {
        const oldFilePath = path.join(__dirname, '../uploads', oldPdfToDelete);
        fs.unlink(oldFilePath, (unlinkErr) => {
          if (unlinkErr) console.error('Greška pri brisanju stare datoteke:', unlinkErr);
        });
      }

      res.json({ 
        message: 'Dopis uspješno ažuriran',
        pdf_updated: !!req.file,
        pdf_filename: pdf_filename
      });
    });
  });
});

// DELETE /api/documents/:id - Brisanje dopisa
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // First get the document to find associated PDF
  db.get('SELECT pdf_filename FROM documents WHERE id = ?', [id], (err, doc) => {
    if (err) {
      console.error('Greška pri dohvaćanju dopisa:', err);
      return res.status(500).json({ error: 'Greška pri brisanju dopisa' });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Dopis nije pronađen' });
    }

    // Delete the document from database
    db.run('DELETE FROM documents WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Greška pri brisanju dopisa:', err);
        return res.status(500).json({ error: 'Greška pri brisanju dopisa' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Dopis nije pronađen' });
      }

      // Delete associated PDF file if it exists
      if (doc.pdf_filename) {
        const filePath = path.join(__dirname, '../uploads', doc.pdf_filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== 'ENOENT') {
            console.error('Greška pri brisanju PDF datoteke:', unlinkErr);
          }
        });
      }

      res.json({ message: 'Dopis uspješno obrisan' });
    });
  });
});

// GET /api/documents/next-number/:type - Generiranje sljedećeg urudžbenog broja
router.get('/next-number/:type', (req, res) => {
  const { type } = req.params;
  const year = new Date().getFullYear();
  
  const isOutgoing = type === 'zpgk_out';
  const prefix = isOutgoing ? '01' : '02';

  // Računaj UKUPAN broj dopisa za godinu (svi tipovi zajedno)
  const query = `
    SELECT COUNT(*) as count 
    FROM documents 
    WHERE strftime('%Y', date) = ?
  `;

  db.get(query, [year.toString()], (err, row) => {
    if (err) {
      console.error('Greška pri dohvaćanju brojača:', err);
      return res.status(500).json({ error: 'Greška pri generiranju broja' });
    }

    const nextNumber = (row?.count || 0) + 1;
    const registry_number = `${prefix}/${nextNumber.toString().padStart(2, '0')}-${year}`;

    res.json({ registry_number });
  });
});

// GET /api/documents/:id/download - Download PDF
router.get('/:id/download', (req, res) => {
  const { id } = req.params;

  db.get('SELECT pdf_filename, title FROM documents WHERE id = ?', [id], (err, doc) => {
    if (err) {
      console.error('Greška pri dohvaćanju dopisa:', err);
      return res.status(500).json({ error: 'Greška pri preuzimanju datoteke' });
    }

    if (!doc || !doc.pdf_filename) {
      return res.status(404).json({ error: 'Datoteka nije pronađena' });
    }

    const filePath = path.join(__dirname, '../uploads', doc.pdf_filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Datoteka nije pronađena na serveru' });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (streamErr) => {
      console.error('Greška pri čitanju datoteke:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Greška pri preuzimanju datoteke' });
      }
    });
  });
});

// DELETE /api/documents/:id/attachment - Uklanjanje PDF priloga
router.delete('/:id/attachment', (req, res) => {
  const { id } = req.params;

  // Get current document to find PDF file
  db.get('SELECT pdf_filename FROM documents WHERE id = ?', [id], (err, doc) => {
    if (err) {
      console.error('Greška pri dohvaćanju dopisa:', err);
      return res.status(500).json({ error: 'Greška pri uklanjanju priloga' });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Dopis nije pronađen' });
    }

    if (!doc.pdf_filename) {
      return res.status(404).json({ error: 'Dopis nema prilog' });
    }

    // Update database - remove PDF filename
    db.run('UPDATE documents SET pdf_filename = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Greška pri ažuriranju dopisa:', err);
        return res.status(500).json({ error: 'Greška pri uklanjanju priloga' });
      }

      // Delete the physical file
      const filePath = path.join(__dirname, '../uploads', doc.pdf_filename);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
          console.error('Greška pri brisanju PDF datoteke:', unlinkErr);
          // Continue anyway - database is already updated
        }
      });

      res.json({ message: 'Prilog uspješno uklonjen' });
    });
  });
});

module.exports = router;