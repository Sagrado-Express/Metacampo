const xlsx = require('xlsx');

const filePath = process.argv[2];
const workbook = xlsx.readFile(filePath);

console.log(`Sheets in workbook: ${workbook.SheetNames.join(', ')}`);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length > 0) {
    console.log(`\n--- Headers for sheet '${sheetName}' ---`);
    console.log(data[0]);
    if (data.length > 1) {
      console.log(`\n--- First row of data for sheet '${sheetName}' ---`);
      console.log(data[1]);
    }
  } else {
    console.log(`\n--- Sheet '${sheetName}' is empty ---`);
  }
});
