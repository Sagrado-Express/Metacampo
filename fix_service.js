const fs = require('fs');
const path = require('path');

const file = 'src/domain/services/segmentDictionary.service.ts';
let content = fs.readFileSync(file, 'utf-8');

// Remove getFallbackData and saveFallbackData entirely
content = content.replace(/\/\/ ============================================================\r?\n\/\/ Local JSON File Fallback Manager\r?\n\/\/ ============================================================\r?\n[\s\S]+$/, '');

// For each try-catch, replace the catch block with throw err
content = content.replace(/} catch \(err: any\) {[\s\S]*?(\n  }\n\n|\n  }\n})/g, '} catch (err: any) {\n      throw err;\n    }$1');

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed segmentDictionary.service.ts');
