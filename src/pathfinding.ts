import { MAP_DIMENSIONS, OFFICE_CELLS, MapCellConfig, CABINET_LOCATION } from './mapConfig';

export interface GridPoint {
  col: number;
  row: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Xây dựng ma trận lưới walkable (true = lối đi trắng, false = vật cản/ô màu)
 */
export function buildWalkableGrid(cells: MapCellConfig[] = OFFICE_CELLS): boolean[][] {
  const { cols, rows } = MAP_DIMENSIONS;
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));

  // Biên ngoài cùng không đi ra ngoài
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === 0 || c === cols - 1 || r === 0 || r === rows - 1) {
        // Vẫn cho phép đi sát biên nếu cần, nhưng biên 0 thường là tường ngoài
      }
    }
  }

  // Đánh dấu các ô có màu / vật cản
  for (const cell of cells) {
    const colSpan = cell.colSpan || 1;
    const rowSpan = cell.rowSpan || 1;
    const isWalkable = cell.walkable === true;

    for (let r = cell.row; r < cell.row + rowSpan; r++) {
      for (let c = cell.col; c < cell.col + colSpan; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          grid[r][c] = isWalkable;
        }
      }
    }
  }

  // Tủ thiết bị là vật cản đích đến
  grid[CABINET_LOCATION.row][CABINET_LOCATION.col] = false;

  return grid;
}

/**
 * Tìm các ô lối đi liền kề (4 hướng) của một ô hoặc khối ô
 */
export function getAdjacentWalkableCells(
  col: number,
  row: number,
  colSpan: number = 1,
  rowSpan: number = 1,
  grid: boolean[][]
): GridPoint[] {
  const { cols, rows } = MAP_DIMENSIONS;
  const candidates: GridPoint[] = [];
  const visited = new Set<string>();

  // Duyệt các cạnh bao quanh khối
  for (let c = col; c < col + colSpan; c++) {
    // Trên
    const topRow = row - 1;
    if (topRow >= 0 && grid[topRow]?.[c]) {
      const key = `${c},${topRow}`;
      if (!visited.has(key)) {
        visited.add(key);
        candidates.push({ col: c, row: topRow });
      }
    }
    // Dưới
    const botRow = row + rowSpan;
    if (botRow < rows && grid[botRow]?.[c]) {
      const key = `${c},${botRow}`;
      if (!visited.has(key)) {
        visited.add(key);
        candidates.push({ col: c, row: botRow });
      }
    }
  }

  for (let r = row; r < row + rowSpan; r++) {
    // Trái
    const leftCol = col - 1;
    if (leftCol >= 0 && grid[r]?.[leftCol]) {
      const key = `${leftCol},${r}`;
      if (!visited.has(key)) {
        visited.add(key);
        candidates.push({ col: leftCol, row: r });
      }
    }
    // Phải
    const rightCol = col + colSpan;
    if (rightCol < cols && grid[r]?.[rightCol]) {
      const key = `${rightCol},${r}`;
      if (!visited.has(key)) {
        visited.add(key);
        candidates.push({ col: rightCol, row: r });
      }
    }
  }

  return candidates;
}

/**
 * Thuật toán BFS tìm đường đi ngắn nhất trên lối đi trắng (4 hướng, không đi chéo)
 */
export function findShortestPath(
  start: GridPoint,
  end: GridPoint,
  grid: boolean[][]
): GridPoint[] | null {
  const { cols, rows } = MAP_DIMENSIONS;
  if (!grid[start.row]?.[start.col] || !grid[end.row]?.[end.col]) {
    // Nếu điểm đầu hoặc cuối không thuộc ô walkable
    return null;
  }

  if (start.col === end.col && start.row === end.row) {
    return [start];
  }

  const queue: GridPoint[] = [start];
  const visited = new Set<string>([`${start.col},${start.row}`]);
  const parentMap = new Map<string, GridPoint>();

  const directions = [
    { dc: 0, dr: -1 }, // Lên
    { dc: 0, dr: 1 },  // Xuống
    { dc: -1, dr: 0 }, // Trái
    { dc: 1, dr: 0 },  // Phải
  ];

  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.col === end.col && current.row === end.row) {
      found = true;
      break;
    }

    for (const { dc, dr } of directions) {
      const nc = current.col + dc;
      const nr = current.row + dr;

      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        if (grid[nr][nc]) {
          const key = `${nc},${nr}`;
          if (!visited.has(key)) {
            visited.add(key);
            parentMap.set(key, current);
            queue.push({ col: nc, row: nr });
          }
        }
      }
    }
  }

  if (!found) return null;

  // Tái dựng đường đi từ đích về nguồn
  const path: GridPoint[] = [];
  let curr: GridPoint | undefined = end;
  while (curr) {
    path.unshift(curr);
    if (curr.col === start.col && curr.row === start.row) break;
    const key = `${curr.col},${curr.row}`;
    curr = parentMap.get(key);
  }

  return path;
}

/**
 * Tìm đường hoàn chỉnh từ chỗ ngồi của người dùng đến Ô TỦ
 */
export function findRouteFromSeatToCabinet(
  seat: MapCellConfig,
  cells: MapCellConfig[] = OFFICE_CELLS
): {
  found: boolean;
  points: Point2D[];
  svgPath: string;
} {
  const grid = buildWalkableGrid(cells);
  const { cellWidth, cellHeight } = MAP_DIMENSIONS;

  const seatColSpan = seat.colSpan || 1;
  const seatRowSpan = seat.rowSpan || 1;

  // Tọa độ tâm chỗ ngồi
  const seatCenter: Point2D = {
    x: (seat.col + seatColSpan / 2) * cellWidth,
    y: (seat.row + seatRowSpan / 2) * cellHeight,
  };

  // Tọa độ tâm TỦ
  const cabinetCenter: Point2D = {
    x: (CABINET_LOCATION.col + 0.5) * cellWidth,
    y: (CABINET_LOCATION.row + 0.5) * cellHeight,
  };

  // Các ô lối đi tiếp giáp với chỗ ngồi
  const startCandidates = getAdjacentWalkableCells(
    seat.col,
    seat.row,
    seatColSpan,
    seatRowSpan,
    grid
  );

  // Các ô lối đi tiếp giáp với Ô TỦ (ưu tiên ô ngay bên dưới hoặc bên phải)
  const cabinetCandidates = getAdjacentWalkableCells(
    CABINET_LOCATION.col,
    CABINET_LOCATION.row,
    1,
    1,
    grid
  );

  if (startCandidates.length === 0 || cabinetCandidates.length === 0) {
    return { found: false, points: [], svgPath: '' };
  }

  // Thử các cặp điểm tiếp giáp để chọn đường đi ngắn nhất
  let bestPath: GridPoint[] | null = null;

  for (const sPt of startCandidates) {
    for (const cPt of cabinetCandidates) {
      const p = findShortestPath(sPt, cPt, grid);
      if (p) {
        if (!bestPath || p.length < bestPath.length) {
          bestPath = p;
        }
      }
    }
  }

  if (!bestPath || bestPath.length === 0) {
    return { found: false, points: [], svgPath: '' };
  }

  // Chuyển danh sách ô lưới sang tọa độ pixel tâm ô
  const pixelPoints: Point2D[] = [seatCenter];
  for (const pt of bestPath) {
    pixelPoints.push({
      x: (pt.col + 0.5) * cellWidth,
      y: (pt.row + 0.5) * cellHeight,
    });
  }
  pixelPoints.push(cabinetCenter);

  // Đơn giản hóa các điểm thẳng hàng
  const simplified = simplifyCollinear(pixelPoints);

  // Tạo chuỗi đường cong mượt bo góc SVG
  const svgPath = createRoundedSvgPath(simplified, 8);

  return {
    found: true,
    points: simplified,
    svgPath,
  };
}

/**
 * Loại bỏ các điểm nằm giữa trên cùng một đoạn thẳng
 */
function simplifyCollinear(pts: Point2D[]): Point2D[] {
  if (pts.length <= 2) return pts;
  const result: Point2D[] = [pts[0]];

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const isCollinearX = prev.x === curr.x && curr.x === next.x;
    const isCollinearY = prev.y === curr.y && curr.y === next.y;

    if (!isCollinearX && !isCollinearY) {
      result.push(curr);
    }
  }

  result.push(pts[pts.length - 1]);
  return result;
}

/**
 * Tạo đường cong SVG bo tròn góc nhẹ ở các khúc cua vuông góc
 */
function createRoundedSvgPath(pts: Point2D[], radius: number = 8): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    // Khoảng cách tới điểm trước và sau
    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);

    const r = Math.min(radius, dPrev / 2, dNext / 2);

    // Vector đơn vị
    const vxPrev = (curr.x - prev.x) / dPrev;
    const vyPrev = (curr.y - prev.y) / dPrev;
    const vxNext = (next.x - curr.x) / dNext;
    const vyNext = (next.y - curr.y) / dNext;

    // Điểm bắt đầu bo góc
    const startCurveX = curr.x - vxPrev * r;
    const startCurveY = curr.y - vyPrev * r;

    // Điểm kết thúc bo góc
    const endCurveX = curr.x + vxNext * r;
    const endCurveY = curr.y + vyNext * r;

    d += ` L ${startCurveX} ${startCurveY} Q ${curr.x} ${curr.y} ${endCurveX} ${endCurveY}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}
