import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MAP_DIMENSIONS, 
  OFFICE_CELLS, 
  MapCellConfig, 
  CABINET_LOCATION 
} from './mapConfig';
import { DEFAULT_SEAT_CONFIG, normalizeSeatLabel } from './seatConfig';
import { 
  findRouteFromSeatToCabinet, 
  buildWalkableGrid 
} from './pathfinding';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  Navigation, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff,
  UserCheck
} from 'lucide-react';

interface OfficeMapCanvasProps {
  userEmail?: string;
  isCompact?: boolean;
  onSeatSelect?: (seat: MapCellConfig) => void;
}

export interface FormattedSeat {
  type: 'paren' | 'multiword' | 'single' | 'multiline';
  line1: string;
  line2?: string;
  mainFontSize: string;
  subFontSize?: string;
}

export function formatSeatContent(label: string): FormattedSeat {
  if (!label) return { type: 'single', line1: '', mainFontSize: '10.5px' };

  // Explicit newline: 'MTGルーム\n(MTG C)', 'サーバールーム\nSERVER', etc.
  if (label.includes('\n')) {
    const parts = label.split('\n');
    return {
      type: 'multiline',
      line1: parts[0].trim(),
      line2: parts.slice(1).join(' ').trim(),
      mainFontSize: '10px',
      subFontSize: '9px',
    };
  }

  // Japanese or department in parentheses: "DAT(2課-B)", "TRUC(1課)", "Y (2課-S)", "VY(2課-A)", "MY (3課)", "HIEN (GS)"
  // Hỗ trợ cả ngoặc đơn chuẩn () và ngoặc toàn giác Nhật （）
  const parenMatch = label.match(/^([^(（]+?)\s*([(\（][^)\）]+[)\）])$/);
  if (parenMatch) {
    const namePart = parenMatch[1].trim();
    const parenPart = parenMatch[2].trim().replace('（', '(').replace('）', ')');
    return {
      type: 'paren',
      line1: namePart,
      line2: parenPart,
      mainFontSize: namePart.length > 7 ? '9.5px' : '10.5px',
      subFontSize: parenPart.length > 8 ? '8.5px' : '9.5px',
    };
  }

  // Multi-word name: split strictly on spaces between words, NEVER inside a word
  const words = label.trim().split(/\s+/);
  if (words.length >= 2) {
    if (words.length === 2) {
      const maxLen = Math.max(words[0].length, words[1].length);
      const fs = maxLen > 9 ? '8.5px' : maxLen > 7 ? '9.5px' : '10.5px';
      return {
        type: 'multiword',
        line1: words[0],
        line2: words[1],
        mainFontSize: fs,
        subFontSize: fs,
      };
    } else {
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');
      const maxLen = Math.max(line1.length, line2.length);
      const fs = maxLen > 10 ? '8px' : maxLen > 8 ? '9px' : '10px';
      return {
        type: 'multiword',
        line1,
        line2,
        mainFontSize: fs,
        subFontSize: fs,
      };
    }
  }

  // Single word: e.g. "THANH", "VUONG", "TIEN"
  const fs = label.length > 10 ? '8.5px' : label.length > 7 ? '9.5px' : '10.5px';
  return {
    type: 'single',
    line1: label,
    mainFontSize: fs,
  };
}

export const OfficeMapCanvas: React.FC<OfficeMapCanvasProps> = ({
  userEmail = '',
  isCompact = false,
  onSeatSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Config state (supports dynamic loading from assets)
  const [seatConfig, setSeatConfig] = useState<Record<string, string>>(DEFAULT_SEAT_CONFIG);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSeatLabel, setSelectedSeatLabel] = useState<string | null>(null);

  // Debug mode: toggleable or via ?debug=1
  const [isDebug, setIsDebug] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('debug') === '1';
    }
    return false;
  });

  // Pan & Zoom state
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch pinch zoom state
  const touchDistanceRef = useRef<number | null>(null);

  // Hovered / tapped cell for tooltip
  const [hoveredCell, setHoveredCell] = useState<{
    cell: MapCellConfig;
    x: number;
    y: number;
  } | null>(null);

  // Load external seat-config.json if available
  useEffect(() => {
    fetch('/assets/seat-config.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Fallback to default');
      })
      .then((data) => {
        if (data && typeof data === 'object') {
          setSeatConfig((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_SEAT_CONFIG
      });
  }, []);

  // Determine current user's target seat
  const mySeatLabel = useMemo(() => {
    if (!userEmail) return null;
    const emailKey = userEmail.toLowerCase().trim();
    return seatConfig[emailKey] || null;
  }, [userEmail, seatConfig]);

  // The active seat to route from (user's seat, or search-selected seat)
  const activeTargetLabel = selectedSeatLabel || mySeatLabel;

  // Find cell object in OFFICE_CELLS matching the active target label
  const activeSeatCell = useMemo<MapCellConfig | null>(() => {
    if (!activeTargetLabel) return null;
    const normTarget = normalizeSeatLabel(activeTargetLabel);
    return (
      OFFICE_CELLS.find((cell) => normalizeSeatLabel(cell.label) === normTarget) || null
    );
  }, [activeTargetLabel]);

  // Calculate route from active seat to Ô TỦ
  const routeResult = useMemo(() => {
    if (!activeSeatCell) {
      return { found: false, svgPath: '', points: [] };
    }
    return findRouteFromSeatToCabinet(activeSeatCell, OFFICE_CELLS);
  }, [activeSeatCell]);

  // Walkable grid for debug inspection
  const debugWalkableGrid = useMemo(() => {
    if (!isDebug) return null;
    return buildWalkableGrid(OFFICE_CELLS);
  }, [isDebug]);

  const { cols, rows, cellWidth, cellHeight } = MAP_DIMENSIONS;
  const totalWidth = cols * cellWidth;
  const totalHeight = rows * cellHeight;

  // Fit map into view initially or when requested
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const scaleX = (clientWidth - 24) / totalWidth;
    const scaleY = (clientHeight - 24) / totalHeight;
    const newScale = Math.min(scaleX, scaleY, 1.4);
    const clampedScale = Math.max(0.35, newScale);

    const newX = (clientWidth - totalWidth * clampedScale) / 2;
    const newY = (clientHeight - totalHeight * clampedScale) / 2;

    setScale(clampedScale);
    setPan({ x: Math.round(newX), y: Math.round(newY) });
  }, [totalWidth, totalHeight]);

  // Center and zoom comfortably on user's seat and cabinet
  const focusOnSeatAndCabinet = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    let centerCol = CABINET_LOCATION.col + 0.5;
    let centerRow = CABINET_LOCATION.row + 0.5;
    let targetScale = isCompact ? 0.75 : 1.05;

    if (activeSeatCell) {
      const minCol = Math.min(activeSeatCell.col, CABINET_LOCATION.col);
      const maxCol = Math.max(
        activeSeatCell.col + (activeSeatCell.colSpan || 1),
        CABINET_LOCATION.col + (CABINET_LOCATION.colSpan || 1)
      );
      const minRow = Math.min(activeSeatCell.row, CABINET_LOCATION.row);
      const maxRow = Math.max(
        activeSeatCell.row + (activeSeatCell.rowSpan || 1),
        CABINET_LOCATION.row + (CABINET_LOCATION.rowSpan || 1)
      );

      centerCol = (minCol + maxCol) / 2;
      centerRow = (minRow + maxRow) / 2;

      // Span distance between seat and cabinet in cells
      const colDist = maxCol - minCol + 3.5;
      const rowDist = maxRow - minRow + 3.5;

      const spanWidth = colDist * cellWidth;
      const spanHeight = rowDist * cellHeight;

      const fitScaleX = (clientWidth - 40) / spanWidth;
      const fitScaleY = (clientHeight - 40) / spanHeight;
      const fitScale = Math.min(fitScaleX, fitScaleY);

      if (isCompact) {
        targetScale = Math.max(0.55, Math.min(0.85, fitScale));
      } else {
        // Clamp scale so names and labels are immediately legible without needing extra manual zoom
        targetScale = Math.max(0.90, Math.min(1.15, fitScale));
      }
    }

    const targetX = clientWidth / 2 - centerCol * cellWidth * targetScale;
    const targetY = clientHeight / 2 - centerRow * cellHeight * targetScale;

    setScale(targetScale);
    setPan({ x: Math.round(targetX), y: Math.round(targetY) });
  }, [activeSeatCell, cellWidth, cellHeight, isCompact]);

  // Run initial fit or focus when activeSeatCell is established or updated
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSeatCell) {
        focusOnSeatAndCabinet();
      } else {
        fitToView();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [activeSeatCell, focusOnSeatAndCabinet, fitToView]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(2.5, Math.max(0.35, scale * zoomFactor));

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom around mouse cursor
    setPan((prev) => ({
      x: mouseX - (mouseX - prev.x) * (newScale / scale),
      y: mouseY - (mouseY - prev.y) * (newScale / scale),
    }));
    setScale(newScale);
  };

  // Touch handlers for mobile pan & pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / touchDistanceRef.current;
      const newScale = Math.min(2.5, Math.max(0.35, scale * factor));
      setScale(newScale);
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  // Search filter list
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return OFFICE_CELLS.filter(
      (c) => c.isSeat && c.label && c.label.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full w-full select-none">
      {/* Top Controls Bar: Search, Reset, Zoom, Legend */}
      {!isCompact && (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-[#ADE8F4] p-2 sm:p-2.5 rounded-xl text-xs text-[#03045E]">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#0096C7] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên chỗ ngồi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#90E0EF] rounded-lg text-xs text-[#03045E] focus:outline-none focus:ring-1 focus:ring-[#0096C7]"
            />
            {/* Dropdown search suggestions */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#90E0EF] rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((seat) => (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={() => {
                      setSelectedSeatLabel(seat.label);
                      setSearchQuery('');
                      if (onSeatSelect) onSeatSelect(seat);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#CAF0F8]/50 flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold text-[#03045E]">{seat.label}</span>
                    <span className="text-[10px] text-slate-400">Xem đường đi →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {mySeatLabel && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSeatLabel(null);
                  focusOnSeatAndCabinet();
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  !selectedSeatLabel
                    ? 'bg-[#0077B6] text-white'
                    : 'bg-white text-[#023E8A] border border-[#90E0EF] hover:bg-[#CAF0F8]'
                }`}
                title="Quay lại chỗ ngồi của tôi"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Chỗ của tôi ({mySeatLabel})</span>
              </button>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-[#90E0EF] rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(2.5, s * 1.2))}
                className="p-1 hover:bg-[#CAF0F8] rounded text-[#03045E] cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.35, s * 0.85))}
                className="p-1 hover:bg-[#CAF0F8] rounded text-[#03045E] cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={fitToView}
                className="px-2 py-1 hover:bg-[#CAF0F8] rounded text-[11px] font-bold text-[#03045E] flex items-center gap-1 cursor-pointer border-l border-slate-200"
                title="Xem toàn bộ mặt bằng"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Toàn bộ</span>
              </button>
            </div>

            {/* Debug Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsDebug((d) => !d)}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                isDebug
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
              title="Hiện các ô lối đi trắng (Walkable) để kiểm tra đường đi"
            >
              {isDebug ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>Lối đi {isDebug ? '(Bật)' : ''}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Viewport with Pan & Zoom */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full rounded-2xl bg-white border border-[#ADE8F4] overflow-hidden cursor-grab active:cursor-grabbing ${
          isCompact ? 'h-[280px] sm:h-[320px]' : 'h-[500px] sm:h-[580px]'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Floating Tooltip when hovering / tapping any cell */}
        {hoveredCell && hoveredCell.cell.label && (
          <div
            className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-[#03045E] text-white px-3 py-1.5 rounded-xl shadow-xl text-xs flex flex-col items-center border border-[#90E0EF] animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${hoveredCell.x}px`,
              top: `${Math.max(12, hoveredCell.y - 8)}px`,
            }}
          >
            <div className="font-bold flex items-center gap-1.5 whitespace-nowrap">
              {hoveredCell.cell.isCabinet ? (
                <span className="text-red-400 font-black">Ô TỦ THIẾT BỊ (BẢO QUẢN & HOÀN TRẢ)</span>
              ) : (
                <span>{hoveredCell.cell.label.replace('\n', ' ')}</span>
              )}
              {activeSeatCell &&
                normalizeSeatLabel(hoveredCell.cell.label) ===
                  normalizeSeatLabel(activeSeatCell.label) && (
                  <span className="text-[10px] bg-[#00B4D8] text-[#03045E] font-extrabold px-1.5 py-0.2 rounded-full">
                    Chỗ của bạn
                  </span>
                )}
            </div>
            {hoveredCell.cell.isSeat && (
              <span className="text-[10px] text-[#CAF0F8] font-medium whitespace-nowrap">
                Bấm để xem lộ trình đến Ô TỦ
              </span>
            )}
            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#03045E] mt-0.5" />
          </div>
        )}

        {/* Transform Container */}
        <div
          className="absolute origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: `${totalWidth}px`,
            height: `${totalHeight}px`,
          }}
        >
          {/* 1. Underlying Google Sheets Grid Lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={totalWidth}
            height={totalHeight}
          >
            <defs>
              <pattern
                id="office-grid-pattern"
                width={cellWidth}
                height={cellHeight}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${cellWidth} 0 L 0 0 0 ${cellHeight}`}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width={totalWidth} height={totalHeight} fill="url(#office-grid-pattern)" />
          </svg>

          {/* 2. Debug Walkable Overlay (Green tint on walkable aisle cells) */}
          {isDebug && debugWalkableGrid && (
            <div className="absolute inset-0 pointer-events-none z-5">
              {debugWalkableGrid.map((rowArr, rIdx) =>
                rowArr.map((isWalk, cIdx) => {
                  if (!isWalk) return null;
                  return (
                    <div
                      key={`debug-${rIdx}-${cIdx}`}
                      className="absolute bg-emerald-400/20 border border-emerald-400/30 text-[8px] text-emerald-800 font-mono flex items-center justify-center"
                      style={{
                        left: `${cIdx * cellWidth}px`,
                        top: `${rIdx * cellHeight}px`,
                        width: `${cellWidth}px`,
                        height: `${cellHeight}px`,
                      }}
                    >
                      ✓
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 3. Office Cells & Desks */}
          <div className="absolute inset-0">
            {OFFICE_CELLS.map((cell) => {
              const colSpan = cell.colSpan || 1;
              const rowSpan = cell.rowSpan || 1;
              const isTu = cell.isCabinet;
              const isMatch =
                activeSeatCell &&
                normalizeSeatLabel(cell.label) === normalizeSeatLabel(activeSeatCell.label);

              const left = cell.col * cellWidth;
              const top = cell.row * cellHeight;
              const width = colSpan * cellWidth;
              const height = rowSpan * cellHeight;

              // Cell Background & Border Styles
              let bg = cell.bgColor || '#D2E3EA';
              let textCol = cell.textColor || '#03045E';
              let borderStyle = cell.borderColor
                ? `${cell.borderWidth || 1}px solid ${cell.borderColor}`
                : '1px solid #94A3B8';

              if (isMatch) {
                bg = '#023E8A';
                textCol = '#FFFFFF';
                borderStyle = '2.5px solid #00B4D8';
              } else if (isTu) {
                bg = '#FEF2F2';
                textCol = '#DC2626';
                borderStyle = '2.5px solid #DC2626';
              } else if (cell.isSeat) {
                // Đảm bảo tất cả các ô chỗ ngồi trên nền sáng dùng màu xanh đậm #03045E có độ tương phản cao nhất
                textCol = '#03045E';
              }

              const parsed = formatSeatContent(cell.label);

              return (
                <div
                  key={cell.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (cell.isSeat) {
                      setSelectedSeatLabel(cell.label);
                      if (onSeatSelect) onSeatSelect(cell);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (cell.label) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = containerRef.current?.getBoundingClientRect();
                      if (parentRect) {
                        setHoveredCell({
                          cell,
                          x: rect.left - parentRect.left + rect.width / 2,
                          y: rect.top - parentRect.top,
                        });
                      }
                    }
                  }}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`absolute flex flex-col items-center justify-center text-center transition-all ${
                    cell.isSeat ? 'cursor-pointer hover:brightness-95' : ''
                  } ${
                    isMatch
                      ? 'shadow-lg ring-3 ring-[#00B4D8] ring-offset-1 z-30'
                      : isTu
                      ? 'shadow-md ring-2 ring-red-400 ring-offset-1 animate-pulse z-25'
                      : 'z-10'
                  }`}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: bg,
                    color: textCol,
                    border: borderStyle,
                    padding: '3px 4px',
                    boxSizing: 'border-box',
                  }}
                  title={cell.label ? `${cell.label} (DYM Vietnam)` : 'Văn phòng'}
                >
                  {/* Vertical Text (Pantry, Exit) */}
                  {cell.verticalText ? (
                    <div className="[writing-mode:vertical-lr] font-bold text-xs sm:text-sm tracking-widest leading-none select-none">
                      {cell.label}
                    </div>
                  ) : isTu ? (
                    /* Ô TỦ: Large clear bold text exclusively inside cell */
                    <div className="flex flex-col items-center justify-center w-full h-full select-none">
                      <span className="text-base sm:text-lg font-black text-red-600 tracking-widest">
                        TỦ
                      </span>
                    </div>
                  ) : cell.isHeader ? (
                    /* Header Block (VINH, HA, 松本) */
                    <div className="flex flex-col items-center justify-center w-full h-full select-none">
                      <span className="text-xs sm:text-sm font-black tracking-wider uppercase">
                        {cell.label}
                      </span>
                    </div>
                  ) : (
                    /* Seat or Room Label */
                    <div
                      className="flex flex-col items-center justify-center w-full h-full select-none"
                      style={{
                        wordBreak: 'normal',
                        overflowWrap: 'normal',
                        hyphens: 'none',
                        lineHeight: '1.18',
                      }}
                    >
                      {parsed.line2 ? (
                        <>
                          {/* Dòng họ/tên chính: In đậm 700 (font-bold), màu xanh đậm #03045E (hoặc trắng #FFFFFF nếu Bạn ở đây) */}
                          <span
                            className="font-bold tracking-tight block text-center leading-tight max-w-full px-0.5"
                            style={{
                              fontSize: parsed.mainFontSize || '10.5px',
                              fontWeight: 700,
                              color: isMatch ? '#FFFFFF' : '#03045E',
                              wordBreak: 'keep-all',
                              overflowWrap: 'normal',
                              hyphens: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {parsed.line1}
                          </span>
                          {/* Dòng tên phụ: In đậm 700 cùng mức (hoặc 600 nếu là team trong ngoặc), cùng màu xanh đậm #03045E (hoặc trắng #FFFFFF nếu Bạn ở đây) */}
                          <span
                            className={`${
                              parsed.type === 'paren' ? 'font-semibold' : 'font-bold'
                            } block text-center tracking-tight leading-tight max-w-full px-0.5`}
                            style={{
                              fontSize: parsed.subFontSize || '9.5px',
                              fontWeight: parsed.type === 'paren' ? 600 : 700,
                              color: isMatch ? '#FFFFFF' : '#03045E',
                              wordBreak: 'keep-all',
                              overflowWrap: 'normal',
                              hyphens: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {parsed.line2}
                          </span>
                        </>
                      ) : (
                        <span
                          className="font-bold tracking-tight block text-center leading-tight max-w-full px-0.5"
                          style={{
                            fontSize: parsed.mainFontSize || '10.5px',
                            fontWeight: 700,
                            color: isMatch ? '#FFFFFF' : '#03045E',
                            wordBreak: 'keep-all',
                            overflowWrap: 'normal',
                            hyphens: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {parsed.line1}
                        </span>
                      )}
                    </div>
                  )}

                  {/* EXTERNAL BADGE FOR Ô TỦ: placed outside below TỦ in open aisle */}
                  {isTu && (
                    <div className="absolute top-[calc(100%+5px)] left-1/2 -translate-x-1/2 z-35 pointer-events-none flex flex-col items-center">
                      <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-red-600 mb-[-1px]" />
                      <span className="bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-md whitespace-nowrap flex items-center gap-1 tracking-tight">
                        <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                        Thiết bị ở đây
                      </span>
                    </div>
                  )}

                  {/* EXTERNAL BADGE FOR USER'S SEAT: placed outside above or below the seat */}
                  {isMatch && (
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center animate-bounce duration-1000 ${
                        cell.row === 0 ? 'top-[calc(100%+5px)]' : 'bottom-[calc(100%+5px)]'
                      }`}
                    >
                      {cell.row === 0 && (
                        <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-[#03045E] mb-[-1px]" />
                      )}
                      <span className="bg-[#03045E] text-[#CAF0F8] border border-[#00B4D8] px-2 py-0.5 rounded-full text-[9px] font-black shadow-lg whitespace-nowrap flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-[#48CAE4]" />
                        Bạn ở đây
                      </span>
                      {cell.row !== 0 && (
                        <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#03045E] mt-[-1px]" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. Animated Route Vector Overlay on Aisle */}
          {routeResult.found && routeResult.svgPath && (
            <svg
              className="absolute inset-0 pointer-events-none z-40"
              width={totalWidth}
              height={totalHeight}
            >
              <defs>
                <marker
                  id="walk-arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="5"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" fill="#DC2626" />
                </marker>
              </defs>

              {/* Glowing background path */}
              <path
                d={routeResult.svgPath}
                fill="none"
                stroke="#FECACA"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80"
              />

              {/* Foreground marching dash line */}
              <path
                d={routeResult.svgPath}
                fill="none"
                stroke="#DC2626"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="7 5"
                markerEnd="url(#walk-arrowhead)"
                className="office-walking-route"
              />
            </svg>
          )}
        </div>

        {/* Floating Route Info Banner / Warning */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-40 pointer-events-none flex items-center justify-between gap-2">
          {activeSeatCell ? (
            routeResult.found ? (
              <div className="bg-white/95 backdrop-blur-xs border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Navigation className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                <span>
                  Đường đi từ: <strong>{activeSeatCell.label}</strong> → <strong>Ô TỦ</strong> (Đi hoàn toàn qua lối đi trắng)
                </span>
              </div>
            ) : (
              <div className="bg-amber-50/95 backdrop-blur-xs border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Không tìm được đường, vui lòng xem vị trí trên sơ đồ.</span>
              </div>
            )
          ) : (
            <div className="bg-white/90 backdrop-blur-xs border border-[#ADE8F4] text-[#03045E] px-3 py-1.5 rounded-xl shadow-sm text-xs font-medium">
              Vị trí tủ thiết bị: <strong>Ô TỦ</strong> (giữa khối VINH & HA, phía cửa kính)
            </div>
          )}
        </div>
      </div>

      {/* Legend & Instructions Footer */}
      <div className="mt-2.5 pt-2 border-t border-[#ADE8F4] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#03045E]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-sm bg-rose-50 border-2 border-red-500 inline-block" />
            <span className="font-bold text-red-600">Ô TỦ (Nơi lấy & trả thiết bị)</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-sm bg-[#023E8A] border border-[#00B4D8] inline-block" />
            <span className="font-bold text-[#023E8A]">Bạn ở đây</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-sm bg-white border border-slate-300 inline-block" />
            <span>Lối đi (Walkable)</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 italic">
          * Cuộn chuột hoặc chạm 2 ngón tay để phóng to / Kéo để di chuyển bản đồ
        </div>
      </div>

      <style>{`
        @keyframes officeRouteMarch {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .office-walking-route {
          animation: officeRouteMarch 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
};
