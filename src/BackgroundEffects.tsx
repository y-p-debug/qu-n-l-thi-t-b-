import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Check, Ban } from 'lucide-react';

/**
 * HỆ THỐNG HIỆU ỨNG NỀN (BACKGROUND EFFECTS SYSTEM)
 * - 5 Mục lựa chọn:
 *   1. Chuột (chấm hồng xám)
 *   2. Naruto (chấm cam)
 *   3. Spider-Man (chấm đỏ)
 *   4. Hoa anh đào (chấm hồng)
 *   5. Tắt hẳn (icon cấm)
 * - Đã xóa hoàn toàn Tuyết rơi, Lá vàng, Bong bóng.
 * - Mặc định luôn là 'none' (Tắt hẳn) mỗi khi đăng nhập / mở trang.
 * - Nút menu chuyển lên Header ngay bên TRÁI avatar và bên PHẢI khối tên/email.
 * - Bấm nút mở dropdown panel bằng Portal, căn mép phải, z-index cao, không bị header cắt.
 */

export type EffectType = 'mouse' | 'naruto' | 'spiderman' | 'sakura' | 'none';

export interface EffectOption {
  id: EffectType;
  label: string;
  dotColor: string;
  isOff?: boolean;
}

export const EFFECT_OPTIONS: EffectOption[] = [
  { id: 'mouse', label: 'Chuột', dotColor: '#F48FB1' },
  { id: 'naruto', label: 'Naruto', dotColor: '#FF9800' },
  { id: 'spiderman', label: 'Spider-Man', dotColor: '#E53935' },
  { id: 'sakura', label: 'Hoa anh đào', dotColor: '#F472B6' },
  { id: 'none', label: 'Tắt hẳn', dotColor: '#94A3B8', isOff: true },
];

export interface GifCharacterConfig {
  id: 'mouse' | 'naruto' | 'spiderman';
  name: string;
  src: string;
  facing: 'left' | 'right';
  origW: number;
  origH: number;
  cropRect: { x: number; y: number; w: number; h: number };
  desktopH: number;
  mobileH: number;
  removeBg: boolean;
}

export const GIF_CHARACTERS: Record<'mouse' | 'naruto' | 'spiderman', GifCharacterConfig> = {
  mouse: {
    id: 'mouse',
    name: 'Chuột',
    src: '/assets/15ljkfwdh53e1.gif',
    facing: 'right',
    origW: 320,
    origH: 320,
    cropRect: { x: 30, y: 130, w: 240, h: 100 },
    desktopH: 88,
    mobileH: 60,
    removeBg: true,
  },
  naruto: {
    id: 'naruto',
    name: 'Naruto',
    src: '/assets/51087b124bff4399de0aef1663390b1d.gif',
    facing: 'right',
    origW: 200,
    origH: 200,
    cropRect: { x: 55, y: 65, w: 90, h: 130 },
    desktopH: 130,
    mobileH: 90,
    removeBg: false,
  },
  spiderman: {
    id: 'spiderman',
    name: 'Spider-Man',
    src: '/assets/26b3080c60c07902d0adf6caf2d671b4%20(1).gif',
    facing: 'left',
    origW: 382,
    origH: 360,
    cropRect: { x: 180, y: 90, w: 130, h: 170 },
    desktopH: 130,
    mobileH: 90,
    removeBg: true,
  },
};

// Cấu trúc hạt cho hiệu ứng Hoa anh đào
interface SakuraParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  angle: number;
  angularSpeed: number;
  opacity: number;
  wobblePhase: number;
  wobbleSpeed: number;
  color: string;
}

// =========================================================================
// 1. DROPDOWN PANEL HIỆU ỨNG NỀN (MỞ KHI BẤM VÀO LOGO DYM Ở GÓC TRÁI)
// =========================================================================
export interface BackgroundEffectsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  activeEffect: EffectType;
  onSelectEffect: (id: EffectType) => void;
}

export const BackgroundEffectsMenu: React.FC<BackgroundEffectsMenuProps> = ({
  isOpen,
  onClose,
  anchorRef,
  activeEffect,
  onSelectEffect,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({
    top: 56,
    left: 16,
  });

  const updatePosition = () => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Căn mép trái với logo DYM, đảm bảo không tràn màn hình bên phải
      const calculatedLeft = Math.max(10, Math.min(rect.left, window.innerWidth - 240));
      setPanelPos({
        top: rect.bottom + 6,
        left: calculatedLeft,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleResizeOrScroll = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[99999] w-56 max-w-[90vw] bg-white rounded-2xl shadow-2xl border-2 border-[#90E0EF] overflow-hidden p-2 text-sm ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
      style={{
        top: `${panelPos.top}px`,
        left: `${panelPos.left}px`,
      }}
    >
      {/* Tiêu đề menu */}
      <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-[#CAF0F8] flex items-center justify-between mb-1">
        <span>HIỆU ỨNG NỀN • 背景エフェクト</span>
      </div>

      {/* Danh sách 5 lựa chọn */}
      <div className="space-y-1">
        {EFFECT_OPTIONS.map((opt) => {
          const isSelected = activeEffect === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelectEffect(opt.id);
                onClose();
              }}
              className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors text-left text-xs sm:text-sm cursor-pointer ${
                isSelected
                  ? 'bg-[#CAF0F8] text-[#03045E] font-bold border border-[#0096C7]'
                  : 'hover:bg-[#CAF0F8]/40 text-[#03045E]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {opt.isOff ? (
                  <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{
                      backgroundColor: opt.dotColor,
                    }}
                  />
                )}
                <span>{opt.label}</span>
              </div>
              {isSelected && (
                <Check className="w-4 h-4 text-[#0096C7] shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

// =========================================================================
// 2. LỚP PHỦ NỀN ANIMATION (FIXED INSET-0, POINTER-EVENTS: NONE)
// =========================================================================
export const BackgroundEffectsOverlay: React.FC<{ activeEffect: EffectType }> = ({
  activeEffect,
}) => {
  // Khi chọn "Tắt hẳn", không render gì cả
  if (activeEffect === 'none') {
    return null;
  }

  return (
    <>
      {/* Bộ lọc SVG xóa nền trắng feColorMatrix */}
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute', pointerEvents: 'none', visibility: 'hidden' }}
        aria-hidden="true"
      >
        <filter id="removeWhite" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 -25 0 24.5"
          />
        </filter>
      </svg>

      {/* Hiệu ứng nhân vật GIF theo con trỏ chuột */}
      {(activeEffect === 'mouse' ||
        activeEffect === 'naruto' ||
        activeEffect === 'spiderman') && (
        <SingleGifFollower activeCharId={activeEffect} />
      )}

      {/* Hiệu ứng Hoa anh đào rơi */}
      {activeEffect === 'sakura' && <SakuraCanvasOverlay />}
    </>
  );
};

// =========================================================================
// 3. NHÂN VẬT GIF THEO CON TRỎ CHUỘT / NÉ CON TRỎ
// =========================================================================
const SingleGifFollower: React.FC<{
  activeCharId: 'mouse' | 'naruto' | 'spiderman';
}> = ({ activeCharId }) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const cursorRef = useRef<{
    x: number;
    y: number;
    hasMoved: boolean;
    isTouch: boolean;
  }>({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 300,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.6 : 300,
    hasMoved: false,
    isTouch: false,
  });

  const charConfig = GIF_CHARACTERS[activeCharId];

  const cropLayout = useMemo(() => {
    const targetH = isMobile ? charConfig.mobileH : charConfig.desktopH;
    const scale = targetH / charConfig.cropRect.h;
    const containerW = Math.round(charConfig.cropRect.w * scale);
    const containerH = targetH;
    const imgW = Math.round(charConfig.origW * scale);
    const imgH = Math.round(charConfig.origH * scale);
    const imgLeft = -Math.round(charConfig.cropRect.x * scale);
    const imgTop = -Math.round(charConfig.cropRect.y * scale);

    return {
      scale,
      containerW,
      containerH,
      imgW,
      imgH,
      imgLeft,
      imgTop,
    };
  }, [charConfig, isMobile]);

  // Vị trí vật lý hiện tại
  const actorRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    isDodging: boolean;
    facingDir: 'left' | 'right';
  }>({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 200,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.6 : 200,
    targetX: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 200,
    targetY: typeof window !== 'undefined' ? window.innerHeight * 0.6 : 200,
    isDodging: false,
    facingDir: 'right',
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lắng nghe di chuyển con trỏ chuột và chạm trên window
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      cursorRef.current = {
        x: e.clientX,
        y: e.clientY,
        hasMoved: true,
        isTouch: e.pointerType === 'touch',
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = {
        x: e.clientX,
        y: e.clientY,
        hasMoved: true,
        isTouch: false,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        cursorRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          hasMoved: true,
          isTouch: true,
        };
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointerdown', handlePointerMove);
    };
  }, []);

  // Vòng lặp animation requestAnimationFrame
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    let isRunning = true;
    let lastTime = performance.now();

    const handleVisibility = () => {
      if (document.hidden) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const loop = (currentTime: number) => {
      if (!isRunning) return;

      const dt = Math.min((currentTime - lastTime) / 1000, 0.08);
      lastTime = currentTime;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const { containerW, containerH } = cropLayout;
      const cursor = cursorRef.current;
      const actor = actorRef.current;

      const charCenterX = actor.x + containerW / 2;
      const charCenterY = actor.y + containerH / 2;
      const distToCursor = Math.hypot(cursor.x - charCenterX, cursor.y - charCenterY);

      let desiredTargetX = actor.x;
      let desiredTargetY = actor.y;

      if (!cursor.hasMoved && cursor.isTouch) {
        // Trên điện thoại khi chưa chạm: đứng ở giữa dưới màn hình
        desiredTargetX = (screenW - containerW) / 2;
        desiredTargetY = screenH - containerH - 30;
      } else if (cursor.isTouch) {
        // Trên điện thoại khi chạm: đi theo điểm chạm lệch lên 45px
        desiredTargetX = cursor.x - containerW / 2;
        desiredTargetY = cursor.y - containerH - 45;
        actor.isDodging = false;
      } else {
        // Trên desktop: né con trỏ khi < 60px, ra xa tới 140px
        if (distToCursor < 60) {
          actor.isDodging = true;
        } else if (distToCursor > 135) {
          actor.isDodging = false;
        }

        if (actor.isDodging) {
          const escapeAngle = Math.atan2(charCenterY - cursor.y, charCenterX - cursor.x);
          desiredTargetX = cursor.x + Math.cos(escapeAngle) * 140 - containerW / 2;
          desiredTargetY = cursor.y + Math.sin(escapeAngle) * 140 - containerH / 2;
        } else {
          // Đi theo con trỏ: lệch 70px theo hướng nhân vật đang đi
          const sideOffset = actor.facingDir === 'right' ? -70 : 70;
          desiredTargetX = cursor.x + sideOffset - containerW / 2;
          desiredTargetY = cursor.y + 10 - containerH / 2;
        }
      }

      desiredTargetX = Math.max(10, Math.min(screenW - containerW - 10, desiredTargetX));
      desiredTargetY = Math.max(10, Math.min(screenH - containerH - 10, desiredTargetY));

      const targetLerp = 1 - Math.exp(-dt * 4.5);
      actor.targetX += (desiredTargetX - actor.targetX) * targetLerp;
      actor.targetY += (desiredTargetY - actor.targetY) * targetLerp;

      const toTargetX = actor.targetX - actor.x;
      const toTargetY = actor.targetY - actor.y;
      const distToTarget = Math.hypot(toTargetX, toTargetY);

      if (distToTarget > 0.5) {
        let step = distToTarget * (1 - Math.exp(-dt * 4.0));
        const maxStep = 350 * dt;
        if (step > maxStep) step = maxStep;

        actor.x += (toTargetX / distToTarget) * step;
        actor.y += (toTargetY / distToTarget) * step;
      }

      actor.x = Math.max(8, Math.min(screenW - containerW - 8, actor.x));
      actor.y = Math.max(8, Math.min(screenH - containerH - 8, actor.y));

      // Lật hướng có độ trễ > 15px chống rung
      const horizontalDiff = actor.targetX - actor.x;
      if (horizontalDiff > 15) {
        actor.facingDir = 'right';
      } else if (horizontalDiff < -15) {
        actor.facingDir = 'left';
      }

      let scaleX = 1;
      if (charConfig.facing === 'right') {
        scaleX = actor.facingDir === 'right' ? 1 : -1;
      } else {
        scaleX = actor.facingDir === 'left' ? 1 : -1;
      }

      const domEl = containerRef.current;
      if (domEl) {
        domEl.style.transform = `translate3d(${Math.round(actor.x)}px, ${Math.round(actor.y)}px, 0) scaleX(${scaleX})`;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [cropLayout, charConfig]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: cropLayout.containerW,
          height: cropLayout.containerH,
          overflow: 'hidden',
          pointerEvents: 'none',
          backgroundColor: 'transparent',
          transform: 'translate3d(-300px, -300px, 0)',
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <img
          src={charConfig.src}
          alt={charConfig.name}
          style={{
            position: 'absolute',
            left: cropLayout.imgLeft,
            top: cropLayout.imgTop,
            width: cropLayout.imgW,
            height: cropLayout.imgH,
            maxWidth: 'none',
            pointerEvents: 'none',
            imageRendering: 'pixelated',
            backgroundColor: 'transparent',
            ...(charConfig.removeBg ? { filter: 'url(#removeWhite)' } : {}),
          }}
        />
      </div>
    </div>
  );
};

// =========================================================================
// 4. HIỆU ỨNG HOA ANH ĐÀO RƠI (CANVAS)
// =========================================================================
const SakuraCanvasOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = screenW;
      canvas.height = screenH;
    }

    const isMobile = screenW < 640;
    const count = isMobile ? 22 : 40;
    const particles: SakuraParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * screenW,
        y: Math.random() * screenH,
        size: 7 + Math.random() * 7,
        speedY: 25 + Math.random() * 35,
        speedX: 10 + Math.random() * 20,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 2,
        opacity: 0.65 + Math.random() * 0.35,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.5 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#FFB7B2' : '#FFCAD4',
      });
    }

    let isRunning = true;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (!isRunning) return;
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const cvs = canvasRef.current;
      if (!cvs) return;

      if (cvs.width !== w || cvs.height !== h) {
        cvs.width = w;
        cvs.height = h;
      }
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.wobblePhase += p.wobbleSpeed * dt;
        p.angle += p.angularSpeed * dt;

        const wobbleX = Math.sin(p.wobblePhase) * 15;
        p.x += (p.speedX + wobbleX * 0.4) * dt;
        p.y += p.speedY * dt;

        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        if (p.x > w + 20) p.x = -20;
        else if (p.x < -20) p.x = w + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.opacity;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.bezierCurveTo(p.size * 0.7, -p.size * 0.5, p.size * 0.9, p.size * 0.5, 0, p.size);
        ctx.bezierCurveTo(-p.size * 0.9, p.size * 0.5, -p.size * 0.7, -p.size * 0.5, 0, -p.size);
        ctx.fill();

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
};
