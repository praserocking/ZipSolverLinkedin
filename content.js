// This script runs only on https://www.linkedin.com/games/zip/*

console.log('LinkedIn Zip Plugin: Script injected successfully!');

// Store captured image and processed grid data
let capturedImage = null;
let processedGridData = null;

// Function to capture grid screenshot
async function captureGridScreenshot() {
  const grid = document.querySelector('[data-testid="interactive-grid"]');

  if (!grid) {
    console.error('Grid not found!');
    return;
  }

  try {
    // Use html2canvas to capture the grid
    const canvas = await html2canvas(grid, {
      backgroundColor: '#ffffff',
      scale: 2
    });

    // Store as image object
    const imageDataUrl = canvas.toDataURL('image/png');

    // Create image object
    const img = new Image();
    img.src = imageDataUrl;

    // Store in memory
    capturedImage = {
      dataUrl: imageDataUrl,
      image: img,
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      timestamp: Date.now()
    };

    console.log('Screenshot captured and stored in memory!');
    console.log('Access via: capturedImage');
    console.log('Image dimensions:', capturedImage.width, 'x', capturedImage.height);

    // Process the image to extract grid data
    await processGridImage(canvas, grid);

    // Also download it
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-zip-grid-${capturedImage.timestamp}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });

    return capturedImage;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
}

// Process the captured image to extract grid data
async function processGridImage(canvas, gridElement) {
  const ctx = canvas.getContext('2d');

  // Get all cells from the DOM
  const cells = gridElement.querySelectorAll('[data-testid^="cell-"]');
  const gridRect = gridElement.getBoundingClientRect();

  console.log(`Processing ${cells.length} cells...`);

  const gridData = [];
  const scale = canvas.width / gridRect.width;

  for (const cell of cells) {
    const cellIdx = parseInt(cell.getAttribute('data-cell-idx'));
    const cellRect = cell.getBoundingClientRect();

    // Calculate relative position within the grid
    const relX = cellRect.left - gridRect.left;
    const relY = cellRect.top - gridRect.top;
    const cellWidth = cellRect.width;
    const cellHeight = cellRect.height;

    // Scale coordinates to canvas size
    const canvasX = Math.floor(relX * scale);
    const canvasY = Math.floor(relY * scale);
    const canvasWidth = Math.floor(cellWidth * scale);
    const canvasHeight = Math.floor(cellHeight * scale);

    // Extract cell image for OCR
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = canvasWidth;
    cellCanvas.height = canvasHeight;
    const cellCtx = cellCanvas.getContext('2d');
    cellCtx.drawImage(canvas, canvasX, canvasY, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight);

    // Check for number in cell from DOM first (faster)
    const contentElement = cell.querySelector('[data-cell-content="true"]');
    let cellValue = contentElement ? contentElement.textContent.trim() : null;

    // Detect blocks by checking edges for black pixels
    const blocks = detectBlocks(ctx, canvasX, canvasY, canvasWidth, canvasHeight);

    gridData.push({
      index: cellIdx,
      value: cellValue,
      blocks: blocks,
      element: cell,
      cellImage: cellCanvas.toDataURL(),
      position: {
        x: relX,
        y: relY,
        width: cellWidth,
        height: cellHeight
      }
    });
  }

  processedGridData = gridData;
  console.log('Grid processing complete!');

  // Summary
  const filledCells = gridData.filter(c => c.value !== null);
  const cellsWithBlocks = gridData.filter(c =>
    c.blocks.top || c.blocks.bottom || c.blocks.left || c.blocks.right
  );

  console.log(`Found ${filledCells.length} cells with numbers`);
  console.log(`Found ${cellsWithBlocks.length} cells with blocks`);
  console.log(`Grid size: ${Math.sqrt(gridData.length)}x${Math.sqrt(gridData.length)}`);

  // Solve the puzzle
  console.log('Starting solver...');
  const solution = solvePuzzle(gridData);
  if (solution) {
    console.log('✅ SOLUTION FOUND!');
    console.log(`Solution has ${solution.length} cells`);

    // Automatically draw the solution
    await drawSolution(gridData, solution);
  } else {
    console.log('❌ No solution found - puzzle may be unsolvable or timeout occurred');
  }
}

// Draw the solution by simulating mouse drag
async function drawSolution(gridData, solution) {
  console.log('Drawing solution...');
  console.log('Solution path:', solution);

  if (!solution || solution.length === 0) {
    console.error('No solution to draw');
    return;
  }

  // Get the first cell element to start
  const startCell = gridData.find(c => c.index === solution[0]);
  if (!startCell) {
    console.error('Start cell not found');
    return;
  }

  const startElement = startCell.element;
  const rect = startElement.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  // Try touch events
  simulateTouchEvent(startElement, 'touchstart', startX, startY);
  simulatePointerEvent(startElement, 'pointerdown', startX, startY);
  simulateMouseEvent(startElement, 'mousedown', startX, startY);

  await sleep(150);

  // Simulate dragging through each cell in the solution
  for (let i = 0; i < solution.length; i++) {
    const cellIndex = solution[i];
    const cell = gridData.find(c => c.index === cellIndex);

    if (!cell) continue;

    const element = cell.element;
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Touch events
    simulateTouchEvent(element, 'touchmove', x, y);

    // Pointer events
    simulatePointerEvent(document, 'pointermove', x, y);
    simulatePointerEvent(element, 'pointerenter', x, y);

    // Mouse events
    simulateMouseEvent(document, 'mousemove', x, y);
    simulateMouseEvent(element, 'mouseenter', x, y);

    await sleep(80);
  }

  // Simulate release on last cell
  const lastCell = gridData.find(c => c.index === solution[solution.length - 1]);
  if (lastCell) {
    const rect = lastCell.element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    simulateTouchEvent(lastCell.element, 'touchend', x, y);
    simulatePointerEvent(lastCell.element, 'pointerup', x, y);
    simulateMouseEvent(lastCell.element, 'mouseup', x, y);
  }

  console.log('Solution drawn!');
}

// Simulate mouse event
function simulateMouseEvent(element, eventType, clientX, clientY) {
  const event = new MouseEvent(eventType, {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: clientX,
    clientY: clientY,
    screenX: clientX,
    screenY: clientY,
    button: 0,
    buttons: 1
  });

  element.dispatchEvent(event);
}

// Simulate pointer event
function simulatePointerEvent(element, eventType, clientX, clientY) {
  const event = new PointerEvent(eventType, {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: clientX,
    clientY: clientY,
    screenX: clientX,
    screenY: clientY,
    button: 0,
    buttons: eventType.includes('down') ? 1 : (eventType.includes('move') ? 1 : 0),
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    pressure: eventType.includes('down') || eventType.includes('move') ? 0.5 : 0
  });

  element.dispatchEvent(event);
}

// Simulate touch event
function simulateTouchEvent(element, eventType, clientX, clientY) {
  const touch = new Touch({
    identifier: 1,
    target: element,
    clientX: clientX,
    clientY: clientY,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
    radiusX: 2.5,
    radiusY: 2.5,
    rotationAngle: 0,
    force: 0.5
  });

  const event = new TouchEvent(eventType, {
    view: window,
    bubbles: true,
    cancelable: true,
    touches: eventType === 'touchend' ? [] : [touch],
    targetTouches: eventType === 'touchend' ? [] : [touch],
    changedTouches: [touch]
  });

  element.dispatchEvent(event);
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Solve the puzzle using DFS with smart move ordering
function solvePuzzle(gridData) {
  const gridSize = Math.sqrt(gridData.length);

  const numberedCells = gridData
    .filter(c => c.value !== null)
    .map(c => ({ ...c, value: parseInt(c.value) }))
    .sort((a, b) => a.value - b.value);

  console.log(`Solving ${gridSize}x${gridSize} grid with ${numberedCells.length} numbers`);

  if (numberedCells.length === 0) {
    return null;
  }

  const startCell = numberedCells[0];
  let iterations = 0;

  function dfs(currentIndex, nextNumberIndex, visited, path) {
    iterations++;

    if (iterations % 100000 === 0) {
      console.log(`Progress: ${iterations} iterations, ${visited.size}/${gridData.length} cells, next: ${nextNumberIndex + 1}`);
    }

    visited.add(currentIndex);
    path.push(currentIndex);

    // Check if we reached the next number
    if (nextNumberIndex < numberedCells.length && currentIndex === numberedCells[nextNumberIndex].index) {
      nextNumberIndex++;
    }

    // Success condition
    if (visited.size === gridData.length && nextNumberIndex >= numberedCells.length) {
      console.log(`✅ Found solution in ${iterations} iterations`);
      return true;
    }

    // CRITICAL PRUNING: Check if all remaining numbers are still reachable
    for (let i = nextNumberIndex; i < numberedCells.length; i++) {
      const targetCell = numberedCells[i];
      if (!canReach(currentIndex, targetCell.index, gridData, gridSize, visited)) {
        // A required number is unreachable, prune this path
        visited.delete(currentIndex);
        path.pop();
        return false;
      }
    }

    // Get neighbors with smart ordering
    let neighbors = getValidNeighbors(currentIndex, gridData, gridSize, visited);

    // SMART ORDERING: Prioritize neighbors with fewer unvisited neighbors
    neighbors = neighbors.map(idx => ({
      index: idx,
      score: countUnvisitedNeighbors(idx, gridData, gridSize, visited)
    }))
    .sort((a, b) => a.score - b.score)
    .map(n => n.index);

    // Try each neighbor
    for (const neighborIdx of neighbors) {
      if (dfs(neighborIdx, nextNumberIndex, visited, path)) {
        return true;
      }
    }

    visited.delete(currentIndex);
    path.pop();
    return false;
  }

  const visited = new Set();
  const path = [];

  if (dfs(startCell.index, 0, visited, path)) {
    return path;
  }

  console.log(`No solution after ${iterations} iterations`);
  return null;
}

// Count unvisited neighbors for a cell (for move ordering)
function countUnvisitedNeighbors(cellIndex, gridData, gridSize, visited) {
  const neighbors = getValidNeighbors(cellIndex, gridData, gridSize, visited);
  return neighbors.length;
}

// Check if target cell is reachable from current cell using BFS
function canReach(fromIndex, toIndex, gridData, gridSize, visited) {
  if (fromIndex === toIndex) return true;

  const queue = [fromIndex];
  const tempVisited = new Set([...visited]);
  tempVisited.add(fromIndex);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === toIndex) return true;

    const neighbors = getValidNeighbors(current, gridData, gridSize, tempVisited);
    for (const neighbor of neighbors) {
      tempVisited.add(neighbor);
      queue.push(neighbor);
    }
  }

  return false;
}

// Check if all unvisited cells are still connected (prevents creating isolated regions)
function areUnvisitedCellsConnected(gridData, gridSize, visited) {
  // Find first unvisited cell
  let startUnvisited = -1;
  for (let i = 0; i < gridData.length; i++) {
    if (!visited.has(i)) {
      startUnvisited = i;
      break;
    }
  }

  if (startUnvisited === -1) return true; // All visited

  // BFS to check if all unvisited cells are reachable from startUnvisited
  const queue = [startUnvisited];
  const reachable = new Set([startUnvisited]);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = getValidNeighbors(current, gridData, gridSize, visited);

    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Check if all unvisited cells are reachable
  const unvisitedCount = gridData.length - visited.size;
  return reachable.size === unvisitedCount;
}

// Get valid neighbors for a cell
function getValidNeighbors(cellIndex, gridData, gridSize, visited) {
  const neighbors = [];
  const row = Math.floor(cellIndex / gridSize);
  const col = cellIndex % gridSize;
  const currentCell = gridData[cellIndex];

  // Check all 4 directions
  const directions = [
    { dr: -1, dc: 0, dir: 'top', opposite: 'bottom' },    // Up
    { dr: 1, dc: 0, dir: 'bottom', opposite: 'top' },     // Down
    { dr: 0, dc: -1, dir: 'left', opposite: 'right' },    // Left
    { dr: 0, dc: 1, dir: 'right', opposite: 'left' }      // Right
  ];

  for (const { dr, dc, dir, opposite } of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    // Check bounds
    if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) {
      continue;
    }

    const neighborIdx = newRow * gridSize + newCol;

    // Check if already visited
    if (visited.has(neighborIdx)) {
      continue;
    }

    // Check if there's a block preventing movement
    if (currentCell.blocks[dir]) {
      continue;
    }

    const neighborCell = gridData[neighborIdx];
    if (neighborCell.blocks[opposite]) {
      continue;
    }

    neighbors.push(neighborIdx);
  }

  return neighbors;
}

// Detect blocks on cell edges by analyzing pixel colors
function detectBlocks(ctx, x, y, width, height) {
  const blocks = {
    top: false,
    bottom: false,
    left: false,
    right: false
  };

  const threshold = 50; // RGB threshold for "black"
  const edgeThickness = 8; // Pixels to check

  // Check top edge
  blocks.top = hasBlackPixels(ctx, x, y, width, edgeThickness, threshold);

  // Check bottom edge
  blocks.bottom = hasBlackPixels(ctx, x, y + height - edgeThickness, width, edgeThickness, threshold);

  // Check left edge
  blocks.left = hasBlackPixels(ctx, x, y, edgeThickness, height, threshold);

  // Check right edge
  blocks.right = hasBlackPixels(ctx, x + width - edgeThickness, y, edgeThickness, height, threshold);

  return blocks;
}

// Check if a region has black pixels
function hasBlackPixels(ctx, x, y, width, height, threshold) {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  let blackPixelCount = 0;
  const totalPixels = (width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is black (or very dark)
    if (r < threshold && g < threshold && b < threshold) {
      blackPixelCount++;
    }
  }

  // If more than 30% of pixels are black, consider it a block
  return (blackPixelCount / totalPixels) > 0.3;
}

// Add solve button to the page
function addCaptureButton() {
  const button = document.createElement('button');
  button.textContent = '🎯 Solve Puzzle';
  button.id = 'zip-capture-btn';
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #057642;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  });

  button.addEventListener('click', async () => {
    button.textContent = '⏳ Solving...';
    button.disabled = true;
    button.style.opacity = '0.7';

    await captureGridScreenshot();

    button.textContent = '✅ Solved!';
    setTimeout(() => {
      button.textContent = '🎯 Solve Puzzle';
      button.disabled = false;
      button.style.opacity = '1';
    }, 2000);
  });

  document.body.appendChild(button);
  console.log('Solve button added!');
}

// Initialize
function init() {
  // Wait for grid to be available
  const checkInterval = setInterval(() => {
    const grid = document.querySelector('[data-testid="interactive-grid"]');
    if (grid) {
      clearInterval(checkInterval);
      addCaptureButton();
      console.log('Plugin ready! Click the capture button to screenshot the grid.');
    }
  }, 500);
}

init();
