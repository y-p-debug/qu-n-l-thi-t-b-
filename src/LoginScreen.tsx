import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Camera, 
  Laptop, 
  Users, 
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { ALLOWED_USERS_LIST } from './types';

interface LoginScreenProps {
  onGoogleSignIn: () => void;
  authError: string | null;
}

interface CarouselItem {
  id: string;
  filename: string;
  src: string;
}

/**
 * Chọn ngẫu nhiên tối đa 4 tấm ảnh từ danh sách đọc từ /assets/assets.json
 */
function pickRandomFourImages(imageList: string[]): CarouselItem[] {
  const shuffled = [...imageList].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
  return selected.map((filename) => ({
    id: filename,
    filename,
    src: `/assets/${filename}`
  }));
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleSignIn, authError }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [imagePool, setImagePool] = useState<string[]>([]);
  const [failedSet, setFailedSet] = useState<Set<string>>(new Set());
  const [backgroundLogo, setBackgroundLogo] = useState<string>('bg_logo.jpg');
  const [activeFourImages, setActiveFourImages] = useState<CarouselItem[]>([]);

  // Chỉ đọc danh sách ảnh và bg_logo.jpg từ /assets/assets.json
  useEffect(() => {
    let isMounted = true;

    async function loadAssetsFromJson() {
      try {
        const res = await fetch(`/assets/assets.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data?.images)) {
          const validNames = data.images.filter(
            (item: unknown): item is string =>
              typeof item === 'string' &&
              item.trim().length > 0 &&
              item !== 'bg_logo.jpg' &&
              item !== 'DYM V2 のコピー.mp4'
          );
          setImagePool(validNames);
          setActiveFourImages(pickRandomFourImages(validNames));
          setCurrentIndex(0);
        }
        if (typeof data?.backgroundLogo === 'string' && data.backgroundLogo.trim()) {
          setBackgroundLogo(data.backgroundLogo.trim());
        }
      } catch {
        // Không làm lỗi giao diện nếu không đọc được assets.json
      }
    }

    loadAssetsFromJson();
    return () => {
      isMounted = false;
    };
  }, []);

  // Tự động xoay chuyển 4 ảnh tuần hoàn mỗi 3.8s
  useEffect(() => {
    if (activeFourImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeFourImages.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [activeFourImages.length]);

  // Đảm bảo currentIndex luôn hợp lệ khi danh sách ảnh thay đổi (ví dụ khi bỏ qua ảnh lỗi)
  useEffect(() => {
    if (activeFourImages.length > 0 && currentIndex >= activeFourImages.length) {
      setCurrentIndex(0);
    }
  }, [activeFourImages.length, currentIndex]);

  const handlePrev = useCallback(() => {
    setActiveFourImages((prevImages) => {
      if (prevImages.length === 0) return prevImages;
      setCurrentIndex((prev) => (prev - 1 + prevImages.length) % prevImages.length);
      return prevImages;
    });
  }, []);

  const handleNext = useCallback(() => {
    setActiveFourImages((prevImages) => {
      if (prevImages.length === 0) return prevImages;
      setCurrentIndex((prev) => (prev + 1) % prevImages.length);
      return prevImages;
    });
  }, []);

  // Xử lý khi 1 ảnh không tải được: tự bỏ qua ảnh đó và bù ảnh khác trong danh sách (nếu còn)
  const handleImageError = useCallback((failedFilename: string) => {
    setFailedSet((prevFailed) => {
      const nextFailed = new Set(prevFailed);
      nextFailed.add(failedFilename);

      setActiveFourImages((prevActive) => {
        const remainingActive = prevActive.filter((item) => item.filename !== failedFilename);
        const activeNames = new Set(remainingActive.map((item) => item.filename));

        // Tìm các ảnh chưa lỗi và chưa nằm trong 4 ảnh đang hiển thị để bù vào đủ 4 ảnh
        const candidates = imagePool.filter(
          (name) => !nextFailed.has(name) && !activeNames.has(name)
        );

        if (candidates.length > 0 && remainingActive.length < 4) {
          const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
          remainingActive.push({
            id: randomCandidate,
            filename: randomCandidate,
            src: `/assets/${randomCandidate}`
          });
        }

        return remainingActive;
      });

      return nextFailed;
    });
  }, [imagePool]);

  const handleRandomizeFour = () => {
    const validPool = imagePool.filter((name) => !failedSet.has(name));
    if (validPool.length === 0) return;
    setActiveFourImages(pickRandomFourImages(validPool));
    setCurrentIndex(0);
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden rounded-3xl my-2">
      {/* LAYER 1: Nền phía dưới đọc bg_logo.jpg từ /assets/ thông qua assets.json */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl">
        <img
          src={`/assets/${backgroundLogo}`}
          alt="DYM Vietnam Background"
          className="w-full h-full object-cover scale-110 filter blur-[20px] opacity-70 brightness-75 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-blue-950/70 to-slate-900/80 backdrop-blur-2xl" />
      </div>

      {/* LAYER 2: Bố cục 2 cột */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        
        {/* CỘT TRÁI: Khung đăng nhập (5/12 cột) */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl shadow-blue-950/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all hover:border-white/60">
            {/* Logo & Header */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 p-2.5">
                  <img 
                    src={`/assets/${backgroundLogo}`} 
                    alt="DYM Logo Icon" 
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                      DYM VIETNAM
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 tracking-wide">
                      PORTAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    機器貸出管理システム • Quản lý thiết bị
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Chào mừng trở lại!
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cổng đăng ký mượn & trả thiết bị chuyên dụng nội bộ (Máy ảnh Sony/Canon, Laptop dự phòng) cho toàn bộ thành viên <strong>DYM Vietnam</strong>.
                </p>
              </div>
            </div>

            {/* Error banner nếu bị từ chối đăng nhập */}
            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left flex items-start gap-2.5 text-xs text-rose-800 animate-in shake">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Đăng nhập bị từ chối:</p>
                  <p className="mt-0.5">{authError}</p>
                </div>
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="space-y-3">
              <button
                onClick={onGoogleSignIn}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-3 text-sm active:scale-[0.99] cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <span>Đăng nhập với Google (@dymvietnam.net)</span>
                <ChevronRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-[11px] text-center text-slate-400">
                Chỉ dành riêng cho cán bộ nhân viên thuộc hệ thống DYM Vietnam
              </p>
            </div>

            {/* Quick feature list badge */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <Camera className="w-4 h-4 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-800">5 Máy ảnh</span>
                <span className="text-[9px] text-slate-400">Kiểm tra lịch bận</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <Laptop className="w-4 h-4 text-amber-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-800">Laptop dự phòng</span>
                <span className="text-[9px] text-slate-400">Mật khẩu tự động</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
                <Users className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-800">Theo Team</span>
                <span className="text-[9px] text-slate-400">{ALLOWED_USERS_LIST.length} thành viên</span>
              </div>
            </div>

            {/* Thanh công cụ chân trang */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Workspace DYM</span>
              </div>

              <button
                type="button"
                onClick={handleRandomizeFour}
                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Random chọn 4 tấm ảnh khác"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Random 4 ảnh</span>
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: 2 vùng (7/12 cột) */}
        <div className="lg:col-span-7 flex flex-col gap-5 justify-between">
          
          {/* VÙNG 1 (TRÊN): 3D COVERFLOW SLIDER ANIMATION */}
          <div className="relative h-64 sm:h-76 w-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center group px-3">
            <div className="relative w-full h-full flex items-center justify-center [perspective:1000px]">
              {activeFourImages.map((img, index) => {
                const count = activeFourImages.length;
                const safeCurrent = count > 0 ? currentIndex % count : 0;
                let offset = count > 0 ? (index - safeCurrent + count) % count : 0;
                if (count >= 3 && offset === count - 1) offset = -1;

                const isCenter = offset === 0;
                const isLeft = count >= 3 && offset === -1;
                const isRight = count >= 2 && offset === 1;

                return (
                  <div
                    key={img.filename}
                    onClick={() => {
                      if (isLeft) handlePrev();
                      if (isRight) handleNext();
                    }}
                    style={{
                      transform: isCenter 
                        ? 'translateX(0%) scale(1) translateZ(0px)' 
                        : isLeft 
                        ? 'translateX(-44%) scale(0.84) translateZ(-80px)' 
                        : isRight
                        ? 'translateX(44%) scale(0.84) translateZ(-80px)'
                        : 'translateX(0%) scale(0.7) translateZ(-120px)',
                      zIndex: isCenter ? 20 : (isLeft || isRight) ? 10 : 0,
                      opacity: isCenter ? 1 : (isLeft || isRight) ? 0.55 : 0,
                      pointerEvents: (isCenter || isLeft || isRight) ? 'auto' : 'none',
                    }}
                    className="absolute w-[68%] sm:w-[62%] h-[82%] sm:h-[86%] rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out cursor-pointer border border-white/25 select-none bg-slate-900"
                  >
                    <img
                      src={img.src}
                      alt={img.filename}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.triedAltCase) {
                          target.dataset.triedAltCase = '1';
                          if (img.filename.endsWith('.JPG')) {
                            target.src = `/assets/${img.filename.slice(0, -4)}.jpg`;
                            return;
                          }
                          if (img.filename.endsWith('.jpg')) {
                            target.src = `/assets/${img.filename.slice(0, -4)}.JPG`;
                            return;
                          }
                        }
                        handleImageError(img.filename);
                      }}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                );
              })}
            </div>

            {/* Nút lùi / tới thủ công */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Ảnh trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Ảnh kế tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* 4 Chấm tròn Pagination */}
            <div className="absolute bottom-3.5 z-30 flex items-center gap-2">
              {activeFourImages.map((img, i) => (
                <button
                  key={img.filename}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentIndex === i 
                      ? 'w-7 bg-lime-400 shadow-sm shadow-lime-400/50' 
                      : 'w-4 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Ảnh ${i + 1} / ${activeFourImages.length}`}
                />
              ))}
            </div>
          </div>

          {/* 
            VÙNG 2 (DƯỚI): KHUNG VIDEO GÓC DƯỚI BÊN PHẢI
            - Phát trực tiếp /assets/DYM V2 のコピー.mp4
          */}
          <div className="relative h-60 sm:h-72 w-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950">
            <video autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover" src={encodeURI("/assets/DYM V2 のコピー.mp4")} />
          </div>

        </div>

      </div>
    </div>
  );
};
