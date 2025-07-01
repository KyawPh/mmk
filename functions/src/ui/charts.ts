// Chart generation utilities for trend visualization

export interface ChartPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

// Generate a line chart for time series data
export function generateLineChart(data: TimeSeriesData[], options: ChartOptions = {}): string {
  const {
    width = 40,
    height = 10,
    showGrid = true,
    showLabels = true,
    showValues = false,
    title,
    xLabel,
    yLabel,
  } = options;

  if (data.length < 2) {
    return 'Not enough data points for chart';
  }

  // Sort by timestamp
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate ranges
  const values = sortedData.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  const timestamps = sortedData.map((d) => d.timestamp.getTime());
  const minTime = timestamps[0] ?? 0;
  const maxTime = timestamps[timestamps.length - 1] ?? 0;
  const timeRange = maxTime - minTime;

  // Create empty chart grid
  const chart: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Add grid lines if enabled
  if (showGrid) {
    // Horizontal grid lines
    for (let y = 0; y < height; y += Math.floor(height / 4)) {
      for (let x = 0; x < width; x++) {
        const row = chart[y];
        if (row?.[x] !== undefined) {
          row[x] = '·';
        }
      }
    }
    // Vertical grid lines
    for (let x = 0; x < width; x += Math.floor(width / 6)) {
      for (let y = 0; y < height; y++) {
        const row = chart[y];
        if (row?.[x] !== undefined) {
          if (row[x] === '·') {
            row[x] = '+';
          } else {
            row[x] = '·';
          }
        }
      }
    }
  }

  // Plot data points and connect with lines
  const points: Array<{ x: number; y: number }> = [];

  sortedData.forEach((item) => {
    const x =
      timeRange === 0
        ? 0
        : Math.floor(((item.timestamp.getTime() - minTime) / timeRange) * (width - 1));
    const y = Math.floor((1 - (item.value - minValue) / valueRange) * (height - 1));

    points.push({ x, y });

    // Mark the point
    if (chart[y]?.[x] !== undefined) {
      chart[y][x] = '●';
    }
  });

  // Connect points with lines
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (!p1 || !p2) {
      continue;
    }

    // Simple line drawing using ASCII characters
    const steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    for (let step = 0; step <= steps; step++) {
      const t = steps === 0 ? 0 : step / steps;
      const x = Math.round(p1.x + (p2.x - p1.x) * t);
      const y = Math.round(p1.y + (p2.y - p1.y) * t);

      if (chart[y]?.[x] !== undefined && chart[y][x] === ' ') {
        // Determine line character based on direction
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        if (Math.abs(dx) > Math.abs(dy) * 2) {
          chart[y][x] = '─';
        } else if (Math.abs(dy) > Math.abs(dx) * 2) {
          chart[y][x] = '│';
        } else if (dx > 0 && dy > 0) {
          chart[y][x] = '\\';
        } else if (dx > 0 && dy < 0) {
          chart[y][x] = '/';
        } else {
          chart[y][x] = '·';
        }
      }
    }
  }

  // Build the chart string
  let result = '';

  // Add title
  if (title) {
    result += `${title}\n\n`;
  }

  // Add Y-axis labels
  const chartLines = chart.map((row, i) => {
    let line = row.join('');

    if (showLabels && (i === 0 || i === height - 1 || i === Math.floor(height / 2))) {
      const value = maxValue - (i / (height - 1)) * valueRange;
      line = `${formatAxisValue(value).padStart(6)} │ ${line}`;
    } else {
      line = `       │ ${line}`;
    }

    return line;
  });

  result += chartLines.join('\n');

  // Add X-axis
  result += `\n       └${'─'.repeat(width)}`;

  // Add X-axis labels
  if (showLabels) {
    result += '\n        ';
    const labelPositions = [0, Math.floor(width / 2), width - 1];
    let lastPos = 0;

    labelPositions.forEach((pos) => {
      const dataIndex = Math.floor((pos / (width - 1)) * (sortedData.length - 1));
      const item = sortedData[dataIndex];
      if (!item) {
        return;
      }
      const label = formatTimeLabel(item.timestamp);
      const spacing = pos - lastPos - (lastPos === 0 ? 0 : label.length / 2);
      result += ' '.repeat(Math.max(0, spacing)) + label;
      lastPos = pos + label.length / 2;
    });
  }

  // Add axis labels
  if (xLabel || yLabel) {
    result += '\n';
    if (yLabel) {
      result += `\nY: ${yLabel}`;
    }
    if (xLabel) {
      result += `\nX: ${xLabel}`;
    }
  }

  // Add values if requested
  if (showValues) {
    result += '\n\nValues:';
    sortedData.forEach((item) => {
      result += `\n${formatTimeLabel(item.timestamp)}: ${formatAxisValue(item.value)}`;
    });
  }

  return `\`\`\`\n${result}\n\`\`\``;
}

// Generate a candlestick chart for rate data
export function generateCandlestickChart(
  data: Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
  }>,
  options: Omit<ChartOptions, 'showValues'> = {}
): string {
  const { width = 40, height = 12, title } = options;

  if (data.length === 0) {
    return 'No data available';
  }

  // Calculate ranges
  const allValues = data.flatMap((d) => [d.open, d.high, d.low, d.close]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;

  // Create empty chart
  const chart: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Calculate candle width
  const candleWidth = Math.max(1, Math.floor(width / data.length) - 1);
  const spacing = Math.floor((width - data.length * candleWidth) / (data.length + 1));

  // Draw candles
  data.forEach((candle, index) => {
    const x = spacing + index * (candleWidth + spacing);

    // Calculate Y positions
    const highY = Math.floor((1 - (candle.high - minValue) / valueRange) * (height - 1));
    const lowY = Math.floor((1 - (candle.low - minValue) / valueRange) * (height - 1));
    const openY = Math.floor((1 - (candle.open - minValue) / valueRange) * (height - 1));
    const closeY = Math.floor((1 - (candle.close - minValue) / valueRange) * (height - 1));

    const isBullish = candle.close > candle.open;
    const bodyChar = isBullish ? '█' : '░';

    // Draw wick
    for (let y = highY; y <= lowY; y++) {
      const xPos = x + Math.floor(candleWidth / 2);
      const row = chart[y];
      if (row?.[xPos] !== undefined) {
        row[xPos] = '│';
      }
    }

    // Draw body
    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);

    for (let y = bodyTop; y <= bodyBottom; y++) {
      for (let dx = 0; dx < candleWidth; dx++) {
        const row = chart[y];
        if (row?.[x + dx] !== undefined) {
          row[x + dx] = bodyChar;
        }
      }
    }
  });

  // Build result
  let result = '';

  if (title) {
    result += `${title}\n\n`;
  }

  // Add chart with Y-axis labels
  chart.forEach((row, i) => {
    const value = maxValue - (i / (height - 1)) * valueRange;
    result += `${formatAxisValue(value).padStart(7)} │ ${row.join('')}\n`;
  });

  // Add X-axis
  result += `        └${'─'.repeat(width)}`;

  return `\`\`\`\n${result}\n\`\`\``;
}

// Generate a sparkline (mini line chart)
export function generateSparkline(values: number[], width: number = 20): string {
  if (values.length === 0) {
    return '';
  }

  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Resample data to fit width
  const resampled: number[] = [];
  for (let i = 0; i < width; i++) {
    const index = Math.floor((i / width) * values.length);
    const value = values[index];
    if (value !== undefined) {
      resampled.push(value);
    }
  }

  return resampled
    .map((value) => {
      const normalized = range === 0 ? 0.5 : (value - min) / range;
      const charIndex = Math.floor(normalized * (chars.length - 1));
      return chars[charIndex];
    })
    .join('');
}

// Generate a pie chart
export function generatePieChart(
  data: Array<{ label: string; value: number }>,
  options: { size?: number; showLegend?: boolean } = {}
): string {
  const { size = 10 } = options;

  if (data.length === 0) {
    return 'No data available';
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return 'Total value is zero';
  }

  // Calculate percentages
  const percentages = data.map((item) => ({
    ...item,
    percentage: (item.value / total) * 100,
  }));

  // Sort by percentage
  percentages.sort((a, b) => b.percentage - a.percentage);

  // Create simple visual representation
  let result = 'Pie Chart:\n\n';

  // Use filled/empty circles to represent proportions
  percentages.forEach((item) => {
    const filled = Math.round((item.percentage / 100) * size);
    const chart = '●'.repeat(filled) + '○'.repeat(size - filled);
    result += `${chart} ${item.label} (${item.percentage.toFixed(1)}%)\n`;
  });

  return `\`\`\`\n${result}\`\`\``;
}

// Generate a heatmap
export function generateHeatmap(
  data: Array<Array<number>>,
  options: {
    rowLabels?: string[];
    colLabels?: string[];
    title?: string;
  } = {}
): string {
  const { rowLabels = [], colLabels = [], title } = options;

  if (data.length === 0 || !data[0] || data[0].length === 0) {
    return 'No data available';
  }

  // Heat characters from cold to hot
  const heatChars = [' ', '·', '▪', '■', '█'];

  // Find min and max values
  const allValues = data.flat();
  if (allValues.length === 0) {
    return 'No data available';
  }
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;

  let result = '';

  if (title) {
    result += `${title}\n\n`;
  }

  // Add column labels
  if (colLabels.length > 0) {
    result += '     ';
    colLabels.forEach((label) => {
      result += ` ${label.substring(0, 3).padEnd(3)}`;
    });
    result += '\n';
  }

  // Add rows
  data.forEach((row, i) => {
    // Add row label
    if (rowLabels[i]) {
      result += rowLabels[i].substring(0, 4).padEnd(5);
    } else {
      result += `R${i + 1}`.padEnd(5);
    }

    // Add heat values
    row.forEach((value) => {
      const normalized = range === 0 ? 0.5 : (value - min) / range;
      const charIndex = Math.floor(normalized * (heatChars.length - 1));
      result += ` ${heatChars[charIndex]}  `;
    });

    result += '\n';
  });

  // Add legend
  result += '\nLegend: ';
  heatChars.forEach((char, i) => {
    const value = min + (i / (heatChars.length - 1)) * range;
    result += `${char}=${formatAxisValue(value)} `;
  });

  return `\`\`\`\n${result}\n\`\`\``;
}

// Helper function to format axis values
function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  } else if (Math.abs(value) < 1) {
    return value.toFixed(3);
  } else {
    return value.toFixed(1);
  }
}

// Helper function to format time labels
function formatTimeLabel(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
