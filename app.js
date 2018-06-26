const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const port = 5000;



const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URL
const mongoURI = 'mongodb://localhost/file_upload';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Initialize var for stream
let gfs;

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({ storage });

// Route GET /
// @desc loads form
app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      console.log('No files exist');

      res.render('index', { files: false });
    } else {
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'image.png') {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

      res.render('index', { files: files });
    }
  });
});

// Route POST
// @desc uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  res.redirect('/');
});

// GET route to /files
// desc: display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist"'
      })
    }
    return res.json(files);
  })
})

// GET route to /file/:filename
// desc: display single file in JSON
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      res.render('index', { files: false });
    } else {
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'image.png') {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', { files: files });
    }
  });
});


// GET route to /image/:filename
// desc: display single image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists"'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});


//Route is DELETE /files/:id
//  desc: delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) return res.status(404).json({ err: err });
    res.redirect('/');
  });
});


app.listen(port, () => console.log(`Server started on port ${port}`));
