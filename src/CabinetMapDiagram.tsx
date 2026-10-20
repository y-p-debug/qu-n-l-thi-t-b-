import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DEFAULT_SEAT_CONFIG, normalizeSeatLabel } from './seatConfig';
import { formatSeatContent } from './OfficeMapCanvas';
import { MapPin, Navigation, Sparkles } from 'lucide-react';

interface CabinetMapDiagramProps {
  userEmail?: string;
  isCompact?: boolean;
}

interface SeatCell {
  label: string;
  isEmpty?: boolean;
}

export const CabinetMapDiagram: React.FC<CabinetMapDiagramProps> = ({
  userEmail = '',
  isCompact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const activeSeatRef = useRef<HTMLDivElement>(null);

  const [seatConfig, setSeatConfig] = useState<Record<string, string>>(DEFAULT_SEAT_CONFIG);
  const [arrowCoords, setArrowCoords] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Load seat-config.json if available from public/assets, fallback to default
  useEffect(() => {
    fetch('/assets/seat-config.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not found');
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

  // Determine current user's seat label
  const userSeatRaw = useMemo(() => {
    if (!userEmail) return null;
    const emailKey = userEmail.toLowerCase().trim();
    return seatConfig[emailKey] || null;
  }, [userEmail, seatConfig]);

  const userSeatNorm = useMemo(() => {
    return userSeatRaw ? normalizeSeatLabel(userSeatRaw) : null;
  }, [userSeatRaw]);

  // VINH Block 2 columns x 5 rows
  const vinhRows: SeatCell[][] = useMemo(
    () => [
      [{ label: 'Y (2課-S)' }, { label: 'DAT (2課-B)' }],
      [{ label: 'LAN ANH' }, { label: 'THUAN PHAT' }],
      [{ label: 'TUAN THAI' }, { label: 'ANH NGOC' }],
      [{ label: 'THUY HANG' }, { label: 'KHA NGHI' }],
      [{ label: '(ô trống)', isEmpty: true }, { label: 'NGOC NHU' }],
    ],
    []
  );

  // HA Block 2 columns x 5 rows
  const haRows: SeatCell[][] = useMemo(
    () => [
      [{ label: 'VY (2課-A)' }, { label: 'TRUC (1課)' }],
      [{ label: 'DUC HUNG' }, { label: 'NGUYET THI' }],
      [{ label: 'BAO NGAN' }, { label: 'NHAT ANH' }],
      [{ label: 'MY NHI' }, { label: 'THI LUYEN' }],
      [{ label: 'NHU NGOC' }, { label: 'ÁNH NGOC' }],
    ],
    []
  );

  const isVinhHeaderActive = userSeatNorm === normalizeSeatLabel('VINH');
  const isHaHeaderActive = userSeatNorm === normalizeSeatLabel('HA');

  // Recalculate walking path coordinates
  const updateArrow = () => {
    if (!containerRef.current || !cabinetRef.current || !activeSeatRef.current) {
      setArrowCoords(null);
      return;
    }

    const cRect = containerRef.current.getBoundingClientRect();
    const sRect = activeSeatRef.current.getBoundingClientRect();
    const tRect = cabinetRef.current.getBoundingClientRect();

    const startX = sRect.left + sRect.width / 2 - cRect.left;
    const startY = sRect.top + sRect.height / 2 - cRect.top;
    const endX = tRect.left + tRect.width / 2 - cRect.left;
    const endY = tRect.bottom - cRect.top + 2;

    setArrowCoords({ startX, startY, endX, endY });
  };

  useEffect(() => {
    updateArrow();
    const timer = setTimeout(updateArrow, 100);
    window.addEventListener('resize', updateArrow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateArrow);
    };
  }, [userSeatNorm, isCompact]);

  // Construct curved walking path from seat -> middle aisle -> cabinet
  const pathD = useMemo(() => {
    if (!arrowCoords) return '';
    const { startX, startY, endX, endY } = arrowCoords;

    // Radius of curvature
    const r = Math.min(16, Math.abs(endX - startX) / 2, Math.abs(startY - endY) / 2);

    if (Math.abs(startX - endX) < 10) {
      // Straight line up the aisle
      return `M ${startX} ${startY} L ${endX} ${endY}`;
    }

    if (startX < endX) {
      // From left block (VINH) to middle aisle
      const cornerX = endX;
      return `M ${startX} ${startY} L ${cornerX - r} ${startY} Q ${cornerX} ${startY} ${cornerX} ${startY - r} L ${cornerX} ${endY}`;
    } else {
      // From right block (HA) to middle aisle
      const cornerX = endX;
      return `M ${startX} ${startY} L ${cornerX + r} ${startY} Q ${cornerX} ${startY} ${cornerX} ${startY - r} L ${cornerX} ${endY}`;
    }
  }, [arrowCoords]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl bg-white border border-[#ADE8F4] overflow-hidden select-none ${
        isCompact ? 'p-3 text-[11px]' : 'p-4 sm:p-5 text-xs'
      }`}
    >
      {/* Top Banner: 窓ガラス側 (Phía cửa kính) */}
      <div className="w-full mb-3 py-1.5 px-3 bg-gradient-to-r from-[#ADE8F4]/50 via-[#CAF0F8] to-[#ADE8F4]/50 border border-[#90E0EF] rounded-xl text-center font-bold text-[#03045E] flex items-center justify-center gap-2 shadow-2xs">
        <span className="text-base">🪟</span>
        <span className="tracking-wide">窓ガラス側 • Phía cửa kính (Window side)</span>
      </div>

      {/* Main Office Layout: 3 Columns (VINH Block, Middle Aisle with TỦ, HA Block) */}
      <div className="grid grid-cols-11 gap-1.5 sm:gap-2.5 items-stretch relative">
        {/* ===================== KHỐI VINH (Cols 1-5) ===================== */}
        <div className="col-span-5 flex flex-col gap-1.5 sm:gap-2">
          {/* Header VINH */}
          <div
            ref={isVinhHeaderActive ? activeSeatRef : undefined}
            className={`py-2 px-3 rounded-xl font-extrabold text-center transition-all ${
              isVinhHeaderActive
                ? 'bg-[#0077B6] text-white ring-2 ring-[#00B4D8] shadow-md'
                : 'bg-[#023E8A] text-white shadow-xs'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span>VINH</span>
              {isVinhHeaderActive && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#CAF0F8] text-[#03045E] text-[10px] font-bold animate-pulse">
                  Bạn ở đây
                </span>
              )}
            </div>
          </div>

          {/* 5 Rows x 2 Cols */}
          <div className="space-y-1.5 sm:space-y-2">
            {vinhRows.map((row, rIdx) => (
              <div key={`vinh-r-${rIdx}`} className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {row.map((cell, cIdx) => {
                  if (cell.isEmpty) {
                    return (
                      <div
                        key={`vinh-cell-${rIdx}-${cIdx}`}
                        className="p-2 sm:p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-300 font-medium"
                      >
                        <span className="text-[10px] italic">(Trống)</span>
                      </div>
                    );
                  }

                  const isMatch = userSeatNorm === normalizeSeatLabel(cell.label);
                  const parsed = formatSeatContent(cell.label);
                  return (
                    <div
                      key={`vinh-cell-${rIdx}-${cIdx}`}
                      ref={isMatch ? activeSeatRef : undefined}
                      className={`relative p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[46px] sm:min-h-[52px] ${
                        isMatch
                          ? 'bg-[#023E8A] text-white border-[#0096C7] shadow-md ring-2 ring-[#00B4D8] scale-[1.02] z-10'
                          : 'bg-[#CAF0F8]/50 hover:bg-[#CAF0F8] border-[#90E0EF] shadow-2xs'
                      }`}
                    >
                      {cell.isEmpty ? (
                        <span className="text-[11px] font-medium text-slate-400 italic">{cell.label}</span>
                      ) : parsed.line2 ? (
                        <>
                          <span
                            className="font-bold tracking-tight block text-center leading-tight max-w-full"
                            style={{
                              fontSize: parsed.mainFontSize || '11px',
                              fontWeight: 700,
                              color: isMatch ? '#FFFFFF' : '#03045E',
                            }}
                          >
                            {parsed.line1}
                          </span>
                          <span
                            className={`${
                              parsed.type === 'paren' ? 'font-semibold' : 'font-bold'
                            } block text-center tracking-tight leading-tight max-w-full`}
                            style={{
                              fontSize: parsed.subFontSize || '10px',
                              fontWeight: parsed.type === 'paren' ? 600 : 700,
                              color: isMatch ? '#FFFFFF' : '#03045E',
                            }}
                          >
                            {parsed.line2}
                          </span>
                        </>
                      ) : (
                        <span
                          className="font-bold tracking-tight block text-center leading-tight max-w-full"
                          style={{
                            fontSize: parsed.mainFontSize || '11px',
                            fontWeight: 700,
                            color: isMatch ? '#FFFFFF' : '#03045E',
                          }}
                        >
                          {parsed.line1}
                        </span>
                      )}
                      {isMatch && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#CAF0F8] text-[#03045E] shadow-xs">
                          <MapPin className="w-2.5 h-2.5 text-[#0096C7]" />
                          Bạn ở đây
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ===================== LỐI ĐI Ở GIỮA + Ô TỦ (Col 6) ===================== */}
        <div className="col-span-1 flex flex-col items-center gap-1.5 sm:gap-2">
          {/* Ô TỦ: Ngang hàng với thanh tiêu đề VINH/HA */}
          <div
            ref={cabinetRef}
            className="w-full py-2 px-1 rounded-xl bg-rose-50 border-2 border-red-500 text-red-600 font-black text-center shadow-md flex flex-col items-center justify-center ring-2 ring-red-400 ring-offset-1 animate-pulse z-10"
            title="Tủ thiết bị (Laptop & Camera)"
          >
            <span className="text-xs sm:text-sm font-extrabold text-red-600 tracking-wider">TỦ</span>
            <span className="text-[9px] text-red-700 font-bold hidden sm:inline-block leading-none">
              保管場所
            </span>
          </div>

          {/* Lối đi ở giữa (Aisle) */}
          <div className="flex-1 w-full rounded-xl bg-slate-100/70 border border-slate-200/80 flex flex-col items-center justify-center p-1 text-[10px] text-slate-400 font-medium tracking-widest writing-mode-vertical">
            <span className="[writing-mode:vertical-lr] text-slate-400 tracking-wider select-none text-[9px] sm:text-[10px]">
              LỐI ĐI • 通路
            </span>
          </div>
        </div>

        {/* ===================== KHỐI HA (Cols 7-11) ===================== */}
        <div className="col-span-5 flex flex-col gap-1.5 sm:gap-2">
          {/* Header HA */}
          <div
            ref={isHaHeaderActive ? activeSeatRef : undefined}
            className={`py-2 px-3 rounded-xl font-extrabold text-center transition-all ${
              isHaHeaderActive
                ? 'bg-[#0077B6] text-white ring-2 ring-[#00B4D8] shadow-md'
                : 'bg-[#023E8A] text-white shadow-xs'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span>HA</span>
              {isHaHeaderActive && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#CAF0F8] text-[#03045E] text-[10px] font-bold animate-pulse">
                  Bạn ở đây
                </span>
              )}
            </div>
          </div>

          {/* 5 Rows x 2 Cols */}
          <div className="space-y-1.5 sm:space-y-2">
            {haRows.map((row, rIdx) => (
              <div key={`ha-r-${rIdx}`} className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {row.map((cell, cIdx) => {
                  const isMatch = userSeatNorm === normalizeSeatLabel(cell.label);
                  const parsed = formatSeatContent(cell.label);
                  return (
                    <div
                      key={`ha-cell-${rIdx}-${cIdx}`}
                      ref={isMatch ? activeSeatRef : undefined}
                      className={`relative p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[46px] sm:min-h-[52px] ${
                        isMatch
                          ? 'bg-[#023E8A] text-white border-[#0096C7] shadow-md ring-2 ring-[#00B4D8] scale-[1.02] z-10'
                          : 'bg-[#CAF0F8]/50 hover:bg-[#CAF0F8] border-[#90E0EF] shadow-2xs'
                      }`}
                    >
                      {cell.isEmpty ? (
                        <span className="text-[11px] font-medium text-slate-400 italic">{cell.label}</span>
                      ) : parsed.line2 ? (
                        <>
                          <span
                            className="font-bold tracking-tight block text-center leading-tight max-w-full"
                            style={{
                              fontSize: parsed.mainFontSize || '11px',
                              fontWeight: 700,
                              color: isMatch ? '#FFFFFF' : '#03045E',
                            }}
                          >
                            {parsed.line1}
                          </span>
                          <span
                            className={`${
                              parsed.type === 'paren' ? 'font-semibold' : 'font-bold'
                            } block text-center tracking-tight leading-tight max-w-full`}
                            style={{
                              fontSize: parsed.subFontSize || '10px',
                              fontWeight: parsed.type === 'paren' ? 600 : 700,
                              color: isMatch ? '#FFFFFF' : '#03045E',
                            }}
                          >
                            {parsed.line2}
                          </span>
                        </>
                      ) : (
                        <span
                          className="font-bold tracking-tight block text-center leading-tight max-w-full"
                          style={{
                            fontSize: parsed.mainFontSize || '11px',
                            fontWeight: 700,
                            color: isMatch ? '#FFFFFF' : '#03045E',
                          }}
                        >
                          {parsed.line1}
                        </span>
                      )}
                      {isMatch && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#CAF0F8] text-[#03045E] shadow-xs">
                          <MapPin className="w-2.5 h-2.5 text-[#0096C7]" />
                          Bạn ở đây
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Animated Route Arrow from User's Seat to TỦ */}
      {arrowCoords && pathD && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          <defs>
            <marker
              id="cabinet-arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="4"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#EF4444" />
            </marker>
          </defs>

          {/* Background glow path */}
          <path
            d={pathD}
            fill="none"
            stroke="#FCA5A5"
            strokeWidth="5"
            strokeLinecap="round"
            className="opacity-70"
          />

          {/* Foreground animated dashed line */}
          <path
            d={pathD}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            markerEnd="url(#cabinet-arrowhead)"
            className="cabinet-walking-path"
          />
        </svg>
      )}

      {/* Legend / Status Footer */}
      <div className="mt-3 pt-2.5 border-t border-[#ADE8F4] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#03045E]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-50 border-2 border-red-500 inline-block shrink-0" />
            <span className="font-bold text-red-600">Ô TỦ: Thiết bị ở đây (保管場所)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#023E8A] border border-[#0096C7] inline-block shrink-0" />
            <span className="font-bold text-[#03045E]">
              {userSeatRaw ? `Vị trí của bạn: ${userSeatRaw}` : 'Chỗ ngồi (席)'}
            </span>
          </div>
        </div>

        {userSeatRaw ? (
          <div className="flex items-center gap-1 text-red-600 font-bold">
            <Navigation className="w-3.5 h-3.5 animate-bounce" />
            <span>Đi theo đường chỉ dẫn đỏ tới tủ</span>
          </div>
        ) : (
          <span className="text-slate-400 italic text-[10px]">
            Tủ thiết bị nằm ở đầu lối đi giữa hai khối
          </span>
        )}
      </div>

      <style>{`
        @keyframes cabinetDash {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .cabinet-walking-path {
          animation: cabinetDash 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
