const fs = require('fs');
const path = require('path');

// Helper to parse CLI arguments
function getArgs() {
  const args = {};
  process.argv.slice(2).forEach(val => {
    if (val.startsWith('--')) {
      const parts = val.split('=');
      const key = parts[0].slice(2);
      const value = parts.slice(1).join('=');
      args[key] = value;
    }
  });
  return args;
}

const args = getArgs();

// Required arguments validation
const required = ['feature', 'files', 'cmd', 'prompt', 'tools', 'deps', 'env', 'status'];
const missing = required.filter(k => args[k] === undefined);
if (missing.length > 0) {
  console.error(`Error: Missing required arguments: ${missing.map(m => `--${m}`).join(', ')}`);
  console.log(`\nUsage:\nnode scripts/log_prompt.js --feature="Feature Name" --files="file1.ts, file2.ts" --cmd="npm run test" --prompt="Prompt text" --tools="file_edit" --deps="None" --env="None" --status="Verified"\n`);
  process.exit(1);
}

const date = new Date().toISOString().split('T')[0];

const mdPath = path.join(__dirname, '..', 'prompt_history_ledger.md');
const csvPath = path.join(__dirname, '..', 'prompt_history_ledger.csv');

// --- 1. APPEND TO CSV ---
// CSV Escaping function
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // Escape double quotes by doubling them
  str = str.replace(/"/g, '""');
  // Wrap in quotes if it contains comma, double-quotes or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
}

const csvRow = [
  date,
  escapeCSV(args.feature),
  escapeCSV(args.files),
  escapeCSV(args.cmd),
  escapeCSV(args.prompt),
  escapeCSV(args.tools),
  escapeCSV(args.deps),
  escapeCSV(args.env),
  escapeCSV(args.status)
].join(',') + '\n';

fs.appendFileSync(csvPath, csvRow, 'utf8');
console.log('Successfully appended row to prompt_history_ledger.csv');

// --- 2. APPEND TO MD ---
if (fs.existsSync(mdPath)) {
  let mdContent = fs.readFileSync(mdPath, 'utf8');

  // Format details content, escaping raw newlines for markdown HTML details pre blocks
  const formattedPrompt = args.prompt.trim().replace(/\n/g, '<br>');
  const formattedTools = args.tools.trim().replace(/\n/g, '<br>');
  const formattedDeps = args.deps.trim().replace(/\n/g, '<br>');
  const formattedEnv = args.env.trim().replace(/\n/g, '<br>');

  const detailsHTML = `<details><summary>View Details</summary><pre><b>Prompt:</b><br>${formattedPrompt}<br><br><b>Tools/Commands Used:</b><br>${formattedTools}<br><br><b>Dependencies Installed:</b><br>${formattedDeps}<br><br><b>Env & Config Changes:</b><br>${formattedEnv}</pre></details>`;

  // Create standard MD row
  const mdRow = `| \`${date}\` | **${args.feature.trim()}** | \`${args.files.trim()}\` | \`${args.cmd.trim()}\` | ${detailsHTML} | \`${args.status.trim()}\` |\n`;

  // Find the separator before "System Instruction: Ledger Auto-Update" and insert row before it
  const instructionHeader = '## System Instruction: Ledger Auto-Update';
  
  if (mdContent.includes(instructionHeader)) {
    const parts = mdContent.split(instructionHeader);
    // Remove the trailing separator line from the first part, add our new row, then append back the separator and instruction part
    const divider = '---\n\n';
    let beforePart = parts[0];
    if (beforePart.endsWith(divider)) {
      beforePart = beforePart.slice(0, -divider.length);
    }
    
    const newMdContent = beforePart + mdRow + '\n' + divider + instructionHeader + parts[1];
    fs.writeFileSync(mdPath, newMdContent, 'utf8');
    console.log('Successfully updated prompt_history_ledger.md');
  } else {
    // If header not found, append to end of file
    fs.appendFileSync(mdPath, '\n' + mdRow, 'utf8');
    console.log('Appended row to end of prompt_history_ledger.md (instruction header not found)');
  }
} else {
  console.error('Warning: prompt_history_ledger.md not found, skipping MD update.');
}
