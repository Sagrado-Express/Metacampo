import sys
import re

file_path = 'src/domain/services/segmentDictionary.service.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'// ============================================================\n// Local JSON File Fallback Manager\n// ============================================================\n[\s\S]*$', '', content)

def replacer(match):
    return "} catch (err: any) {\n      throw err;\n    }"

content = re.sub(r'\} catch \(err: any\) \{[\s\S]*?\n    \}', replacer, content)
content = re.sub(r'\} catch \(err\) \{[\s\S]*?\n    \}', replacer, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
