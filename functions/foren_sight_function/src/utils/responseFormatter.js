'use strict';

/**
 * Formats LLM responses into a clean, display-ready professional report layout.
 * Removes markdown syntax (** , * , #, backticks) while preserving spacing,
 * headings, and alignment.
 * 
 * @param {string} text - Raw Markdown output from LLM/Zia
 * @returns {string} Clean formatted text
 */
function formatResponseText(text) {
  if (!text) return '';

  // First process tables
  const textWithFormattedTables = formatTables(text);

  const lines = textWithFormattedTables.split(/\r?\n/);
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Preserve empty lines
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // 1. Detect Headings
    // A line starting with '#' (e.g. ### Heading)
    if (trimmed.startsWith('#')) {
      const headingText = trimmed.replace(/^#+\s*/, '');
      const cleanHeading = cleanMarkdownMarkers(headingText);
      formattedLines.push('');
      formattedLines.push(cleanHeading);
      formattedLines.push('');
      continue;
    }

    // A line wrapped in '**' (e.g. **Heading**) that is short and has no colon
    const boldHeadingMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldHeadingMatch) {
      const headingText = boldHeadingMatch[1].trim();
      if (!headingText.includes(':') && headingText.split(/\s+/).length <= 6) {
        formattedLines.push('');
        formattedLines.push(headingText);
        formattedLines.push('');
        continue;
      }
    }

    // 2. Detect Bullet/Numbered Lists
    const listMatch = line.match(/^(\s*)([*\-•+])\s+(.*)$/);
    if (listMatch) {
      const indentation = listMatch[1];
      const content = listMatch[3].trim();
      const cleanedContent = cleanMarkdownMarkers(content);

      // Check if this bullet item contains a key-value pair
      const colonIndex = cleanedContent.indexOf(':');
      if (colonIndex > 0) {
        const key = cleanedContent.substring(0, colonIndex).trim();
        const value = cleanedContent.substring(colonIndex + 1).trim();
        if (key.split(/\s+/).length <= 6 && key.length > 0) {
          // Render as unbulleted aligned key-value pair
          formattedLines.push(`${indentation}${key} : ${value}`);
          continue;
        }
      }

      // Plain list item -> replace with clean unicode bullet
      formattedLines.push(`${indentation}• ${cleanedContent}`);
      continue;
    }

    // Numbered list match (e.g., 1. Item)
    const numberedMatch = line.match(/^(\s*)(\d+\.)\s+(.*)$/);
    if (numberedMatch) {
      const indentation = numberedMatch[1];
      const numberPrefix = numberedMatch[2];
      const content = numberedMatch[3].trim();
      const cleanedContent = cleanMarkdownMarkers(content);

      // Check if this contains a key-value pair
      const colonIndex = cleanedContent.indexOf(':');
      if (colonIndex > 0) {
        const key = cleanedContent.substring(0, colonIndex).trim();
        const value = cleanedContent.substring(colonIndex + 1).trim();
        if (key.split(/\s+/).length <= 6 && key.length > 0) {
          formattedLines.push(`${indentation}${numberPrefix} ${key} : ${value}`);
          continue;
        }
      }

      formattedLines.push(`${indentation}${numberPrefix} ${cleanedContent}`);
      continue;
    }

    // 3. Regular lines: Check if it was an explicitly bolded key-value pair (e.g. **Case Number:** 202300001)
    const boldKVMatch = line.match(/^(\s*)\*\*(.+?)\*\*(\s*:\s*)(.*)$/);
    if (boldKVMatch) {
      const leadingSpaces = boldKVMatch[1];
      const key = cleanMarkdownMarkers(boldKVMatch[2]);
      const value = cleanMarkdownMarkers(boldKVMatch[4]);
      if (key.split(/\s+/).length <= 6 && key.length > 0) {
        formattedLines.push(`${leadingSpaces}${key} : ${value}`);
        continue;
      }
    }

    let processedLine = cleanMarkdownMarkers(line);
    formattedLines.push(processedLine);
  }

  // Collapse consecutive blank lines and trim
  let result = formattedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

/**
 * Strips basic Markdown bold, italic, backticks, and underscores from a string.
 */
function cleanMarkdownMarkers(str) {
  if (!str) return '';
  return str
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/_/g, '')
    .trim();
}

/**
 * Searches and formats markdown tables in text into aligned plain text columns.
 */
function formatTables(text) {
  if (!text) return '';

  const lines = text.split(/\r?\n/);
  const resultLines = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
    } else {
      if (inTable) {
        resultLines.push(...formatParsedTable(tableRows));
        tableRows = [];
        inTable = false;
      }
      resultLines.push(line);
    }
  }

  if (inTable && tableRows.length > 0) {
    resultLines.push(...formatParsedTable(tableRows));
  }

  return resultLines.join('\n');
}

/**
 * Formats parsed rows of a markdown table.
 */
function formatParsedTable(rows) {
  // Filter out table divider rows (e.g. |---|---|)
  const cleanRows = rows.filter(row => {
    return !row.every(cell => /^:?-+:?$/.test(cell) || cell === '');
  });

  if (cleanRows.length === 0) return [];

  const numCols = cleanRows[0].length;
  const colWidths = Array(numCols).fill(0);

  // Clean cells from markdown markers and compute widths
  const processedRows = cleanRows.map(row => {
    return row.map((cell, cIndex) => {
      const cleaned = cleanMarkdownMarkers(cell);
      colWidths[cIndex] = Math.max(colWidths[cIndex] || 0, cleaned.length);
      return cleaned;
    });
  });

  const formattedLines = [];
  for (let r = 0; r < processedRows.length; r++) {
    const row = processedRows[r];
    const paddedCells = row.map((cell, cIndex) => {
      return cell.padEnd(colWidths[cIndex] || 0, ' ');
    });

    formattedLines.push(paddedCells.join('    ')); // 4 spaces between columns

    // Header separator line
    if (r === 0 && processedRows.length > 1) {
      const divider = colWidths.map(w => '-'.repeat(w)).join('    ');
      formattedLines.push(divider);
    }
  }

  return ['', ...formattedLines, ''];
}

module.exports = {
  formatResponseText
};
