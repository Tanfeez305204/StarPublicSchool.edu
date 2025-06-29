const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public')); // Serves frontend files like HTML, CSS, logo

// Load Excel data
const workbook = xlsx.readFile(path.join(__dirname, 'results.xlsx'));
const sheet = workbook.Sheets['result']; // Sheet name must be 'result'
const allData = xlsx.utils.sheet_to_json(sheet);

// Utility to replace blank/undefined with "N/A"
const safeValue = (val, fallback = "N/A") =>
  val === undefined || val === null || String(val).trim() === "" ? fallback : String(val).trim();

// Check if value is a valid number
const isNumeric = (val) => !isNaN(parseFloat(val)) && isFinite(val);

// API to fetch result
app.get('/result', (req, res) => {
  const classMap = {
    "NURA": "NURSERY-A",
    "NURB": "NURSERY-B",
    "NURC": "NURSERY-C",
    "LKA": "LKG-A",
    "LKB": "LKG-B",
    "UKA": "UKG-A",
    "UKB": "UKG-B"
  };

  const queryClass = req.query.class?.trim().toUpperCase();
  const studentClass = classMap[queryClass] || queryClass;
  const roll = req.query.roll?.trim();

  if (!studentClass || !roll) {
    return res.json({ error: "Class and Roll number are required." });
  }

  // Match student record
  const student = allData.find(
    (s) =>
      String(s.Class).trim().toUpperCase() === studentClass &&
      String(s.Roll).trim() === roll
  );

  if (!student) {
    return res.json({ error: "Student not found." });
  }

  // Prepare marks array
  const excludedKeys = ['class', 'roll', 'name', 'fathername', 'father name'];
  const marks = [];
  let total = 0;
  const fullMarksPerSubject = 100;

  for (const key in student) {
    if (!excludedKeys.includes(key.trim().toLowerCase())) {
      const rawMark = student[key];
      marks.push({
        subject: key,
        fullMarks: fullMarksPerSubject,
        passMarks: Math.floor(fullMarksPerSubject * 0.3),
        obtainedMarks: safeValue(rawMark)
      });

      if (isNumeric(rawMark)) {
        total += parseFloat(rawMark);
      }
    }
  }

  const totalFullMarks = marks.length * fullMarksPerSubject;
  const percentage = totalFullMarks ? (total / totalFullMarks) * 100 : 0;

  const division =
    percentage >= 60 ? 'First' :
    percentage >= 45 ? 'Second' :
    percentage >= 30 ? 'Third' : 'Fail';

  res.json({
    schoolName: "STAR PUBLIC SCHOOL",
    schoolAddress: "Main road Mathia Bazar, Meghwal",
    studentName: safeValue(student.Name),
    fatherName: safeValue(student.FatherName),
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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
