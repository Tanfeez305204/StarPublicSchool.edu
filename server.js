const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // ✅ Import rate limiter

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public')); // Serve HTML, CSS, JS

// ✅ Apply rate limiter only to /result route
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    error: "Too many requests. Please try again after a minute."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ Apply the limiter only to /result
app.use("/result", limiter);

// Load Excel data
const workbook = xlsx.readFile(path.join(__dirname, 'results.xlsx'));
const sheet = workbook.Sheets['result'];
const allData = xlsx.utils.sheet_to_json(sheet);

// Helpers
const safeValue = (val, fallback = "N/A") =>
  val === undefined || val === null || String(val).trim() === "" ? fallback : String(val).trim();

const isNumeric = (val) => !isNaN(parseFloat(val)) && isFinite(val);

// API endpoint
app.get('/result', (req, res) => {
  const classMap = {
    "NURA": "NURSERY-A",
    "NURB": "NURSERY-B",
    "NURC": "NURSERY-C",
    "LKGA": "L.K.G-A",
    "LKGB": "L.K.G-B",
    "UKGA": "U.K.G-A",
    "UKGB": "U.K.G-B"
  };

  const queryClass = req.query.class?.trim().toUpperCase();
  const studentClass = classMap[queryClass] || queryClass;
  const roll = req.query.roll?.trim();

  if (!studentClass || !roll) {
    return res.json({ error: "Class and Roll number are required." });
  }

  const student = allData.find(
    (s) =>
      String(s.Class).trim().toUpperCase() === studentClass &&
      String(s.Roll).trim() === roll
  );

  if (!student) {
    return res.json({ error: "Student not found." });
  }

  const excludedKeys = ['class', 'roll', 'name', 'fathername', 'father name'].map(k => k.toLowerCase());

  const marks = [];
  let total = 0;
  let totalFullMarks = 0;
  const fullMarksPerSubject = 100;

  for (const key in student) {
    const lowerKey = key.trim().toLowerCase();
    if (!excludedKeys.includes(lowerKey)) {
      const subjectName = key.trim();
      const rawMark = student[key];
      const obtained = safeValue(rawMark);
      const isDrawing = subjectName.toLowerCase() === 'drawing';
      const passMarks = Math.floor(fullMarksPerSubject * 0.3);

      marks.push({
        subject: subjectName,
        fullMarks: fullMarksPerSubject,
        passMarks,
        obtainedMarks: obtained
      });

      if (!isDrawing && isNumeric(rawMark)) {
        total += parseFloat(rawMark);
        totalFullMarks += fullMarksPerSubject;
      }
    }
  }

  const percentage = totalFullMarks ? (total / totalFullMarks) * 100 : 0;
  const division =
    percentage >= 60 ? 'First' :
    percentage >= 45 ? 'Second' :
    percentage >= 30 ? 'Third' : 'Fail';

  res.json({
    schoolName: "STAR PUBLIC SCHOOL",
    schoolAddress: "Main road Mathia Bazar, Meghwal",
    studentName: safeValue(student.Name),
    fatherName: safeValue(student.FatherName || student['Father Name']),
    class: safeValue(studentClass),
    roll: safeValue(roll),
    marks,
    total,
    totalFullMarks,
    percentage: isNaN(percentage) ? "N/A" : percentage.toFixed(2),
    division,
    description: division === "Fail" ? "Needs Improvement." : "Keep up the good work!"
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
