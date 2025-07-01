// Table and text formatting utilities for Telegram messages

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface TableOptions {
  border?: boolean;
  header?: boolean;
  monospace?: boolean;
  maxWidth?: number;
}

// Create a formatted table
export function createTable(
  data: any[],
  columns: TableColumn[],
  options: TableOptions = {}
): string {
  const { border = true, header = true, monospace = true, maxWidth = 30 } = options;

  if (data.length === 0) {
    return 'No data available';
  }

  // Calculate column widths
  const columnWidths = columns.map((col) => {
    const headerWidth = col.label.length;
    const maxDataWidth = Math.max(
      ...data.map((row) => {
        const value = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
        return value.length;
      })
    );
    return Math.min(col.width ?? Math.max(headerWidth, maxDataWidth), maxWidth);
  });

  const rows: string[] = [];

  // Add header
  if (header) {
    const headerRow = columns
      .map((col, i) => padString(col.label, columnWidths[i] ?? 0, col.align ?? 'left'))
      .join(border ? ' │ ' : '  ');
    rows.push(headerRow);

    // Add separator
    const separator = columnWidths.map((width) => '─'.repeat(width)).join(border ? '─┼─' : '──');
    rows.push(separator);
  }

  // Add data rows
  data.forEach((row) => {
    const dataRow = columns
      .map((col, i) => {
        const value = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
        return padString(value, columnWidths[i] ?? 0, col.align ?? 'left');
      })
      .join(border ? ' │ ' : '  ');
    rows.push(dataRow);
  });

  const table = rows.join('\n');
  return monospace ? `\`\`\`\n${table}\n\`\`\`` : table;
}

// Create a simple key-value list
export function createKeyValueList(
  data: Record<string, any>,
  options: {
    separator?: string;
    maxKeyWidth?: number;
    monospace?: boolean;
  } = {}
): string {
  const { separator = ':', maxKeyWidth = 20, monospace = false } = options;

  const lines = Object.entries(data).map(([key, value]) => {
    const paddedKey = padString(key, maxKeyWidth, 'left');
    return `${paddedKey}${separator} ${value}`;
  });

  const list = lines.join('\n');
  return monospace ? `\`\`\`\n${list}\n\`\`\`` : list;
}

// Create a horizontal bar chart
export function createBarChart(
  data: Array<{ label: string; value: number }>,
  options: {
    width?: number;
    showValues?: boolean;
    char?: string;
  } = {}
): string {
  const { width = 20, showValues = true, char = '█' } = options;

  if (data.length === 0) {
    return 'No data available';
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const maxLabelWidth = Math.max(...data.map((d) => d.label.length));

  const rows = data.map((item) => {
    const barLength = Math.round((item.value / maxValue) * width);
    const bar = char.repeat(barLength) + '░'.repeat(width - barLength);
    const label = padString(item.label, maxLabelWidth, 'left');
    const value = showValues ? ` ${item.value}` : '';
    return `${label} │ ${bar}${value}`;
  });

  return `\`\`\`\n${rows.join('\n')}\n\`\`\``;
}

// Create a vertical bar chart (ASCII)
export function createVerticalBarChart(
  data: Array<{ label: string; value: number }>,
  height: number = 10
): string {
  if (data.length === 0) {
    return 'No data available';
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  const chart: string[] = [];

  // Create chart rows from top to bottom
  for (let y = height - 1; y >= 0; y--) {
    let row = '';
    for (let x = 0; x < data.length; x++) {
      const item = data[x];
      if (!item) {
        continue;
      }
      const normalizedValue = range === 0 ? 0.5 : (item.value - minValue) / range;
      const barHeight = Math.floor(normalizedValue * height);

      if (barHeight > y) {
        row += '█';
      } else if (barHeight === y) {
        row += '▄';
      } else {
        row += ' ';
      }
      row += ' ';
    }
    chart.push(row);
  }

  // Add bottom line
  chart.push('─'.repeat(data.length * 2));

  // Add labels (abbreviated if needed)
  const labels = data.map((d) => d.label.substring(0, 1)).join(' ');
  chart.push(labels);

  return `\`\`\`\n${chart.join('\n')}\n\`\`\``;
}

// Create a percentage breakdown
export function createPercentageBreakdown(
  data: Record<string, number>,
  options: {
    showBar?: boolean;
    barWidth?: number;
    sortByValue?: boolean;
  } = {}
): string {
  const { showBar = true, barWidth = 10, sortByValue = true } = options;

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  if (total === 0) {
    return 'No data available';
  }

  const entries = Object.entries(data).map(([label, value]) => ({
    label,
    value,
    percentage: (value / total) * 100,
  }));

  if (sortByValue) {
    entries.sort((a, b) => b.percentage - a.percentage);
  }

  const lines = entries.map((entry) => {
    const percent = entry.percentage.toFixed(1);
    let line = `${entry.label}: ${percent}%`;

    if (showBar) {
      const barLength = Math.round((entry.percentage / 100) * barWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(barWidth - barLength);
      line += ` ${bar}`;
    }

    return line;
  });

  return lines.join('\n');
}

// Format a number with separators and decimals
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    separator?: string;
    prefix?: string;
    suffix?: string;
  } = {}
): string {
  const { decimals = 2, prefix = '', suffix = '' } = options;

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${prefix}${formatted}${suffix}`;
}

// Format a currency value
export function formatCurrency(
  value: number,
  currency: string,
  options: {
    showSymbol?: boolean;
    position?: 'before' | 'after';
  } = {}
): string {
  const { showSymbol = true, position = 'after' } = options;

  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    MMK: 'K',
  };

  const formatted = formatNumber(value);
  const symbol = showSymbol ? (symbols[currency] ?? currency) : currency;

  return position === 'before' ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
}

// Create a comparison table
export function createComparisonTable(
  items: Array<{ name: string; [key: string]: any }>,
  attributes: string[],
  options: {
    nameLabel?: string;
    attributeLabels?: Record<string, string>;
  } = {}
): string {
  const { nameLabel = 'Item', attributeLabels = {} } = options;

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: nameLabel,
      align: 'left',
    },
    ...attributes.map((attr) => ({
      key: attr,
      label: attributeLabels[attr] ?? attr,
      align: 'right' as const,
    })),
  ];

  return createTable(items, columns, { monospace: true });
}

// Format a time duration
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}

// Format file size
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

// Pad string to specific width
function padString(str: string, width: number, align: 'left' | 'center' | 'right'): string {
  const truncated = truncateText(str, width, '…');
  const padding = width - truncated.length;

  switch (align) {
    case 'left':
      return truncated + ' '.repeat(padding);
    case 'right':
      return ' '.repeat(padding) + truncated;
    case 'center': {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + truncated + ' '.repeat(rightPad);
    }
  }
}
