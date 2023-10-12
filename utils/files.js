const fs = require('fs');
const path = require('path');

const getAllFiles = (dirPath) => {
  let files = [];
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

const writeCommitDates = (filePath, dates) => {
  try {
    const data = JSON.stringify(dates, null, 2) + '\n';
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, data);
    } else {
      fs.appendFileSync(filePath, data);
    }
  } catch (error) {
    console.error(`Error writing commit dates: ${error.message}`);
    throw error;
  }
};

module.exports = { getAllFiles, writeCommitDates }; 