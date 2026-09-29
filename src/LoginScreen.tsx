import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  ShieldAlert, 
  ShieldCheck, 
  Camera, 
  Laptop, 
  Users, 
  Volume2, 
  VolumeX, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { ALLOWED_USERS_LIST } from './types';

interface LoginScreenProps {
  onGoogleSignIn: () => void;
  authError: string | null;
}

// 13 tệp ảnh gốc của người dùng được đặt sẵn trong repo public/assets/
export const DEFAULT_ORIGINAL_IMAGES = [
  'TKT01968.JPG',
  'TKT01948.JPG',
  'TKT01795.JPG',
  'TKT01309.JPG',
  'TKT01182.JPG',
  'DSC06471.JPG',
  'DSC06946.JPG',
  'DSC07428.JPG',
  'DSC07753.JPG',
  'DSC07863.JPG',
  '_N2K1748.jpg',
  'TKT00800.JPG',
  'TKT00988.JPG'
];

// Ảnh dự phòng đã xác minh có sẵn trong thư mục assets
const VERIFIED_FALLBACK_IMAGES = [
  '/assets/teambuilding_beach.jpg',
  '/assets/office_team.jpg',
  '/assets/teambuilding_gala.jpg',
  '/assets/bg_logo.jpg'
];

interface CarouselItem {
  id: number;
  filename: string;
  src: string;
  fallbackSrc: string;
}

/**
 * Thuật toán xáo trộn và chọn ngẫu nhiên 4 tấm
 */
function pickRandomFourImages(imageList: string[]): CarouselItem[] {
  const shuffled = [...imageList].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
  return selected.map((filename, index) => ({
    id: index,
    filename,
    src: `/assets/${filename}`,
    fallbackSrc: VERIFIED_FALLBACK_IMAGES[index % VERIFIED_FALLBACK_IMAGES.length]
  }));
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleSignIn, authError }) => {
  // Trạng thái carousel: chỉ số ảnh đang hiển thị trung tâm (0 -> 3)
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const [imagePool, setImagePool] = useState<string[]>(DEFAULT_ORIGINAL_IMAGES);

  // Khởi tạo 4 ảnh ngẫu nhiên MỖI LẦN VÀO LINK / TẢI LẠI TRANG
  const [activeFourImages, setActiveFourImages] = useState<CarouselItem[]>(() => {
    return pickRandomFourImages(DEFAULT_ORIGINAL_IMAGES);
  });

  // Tải danh sách ảnh từ public/assets/assets.json nếu có
  useEffect(() => {
    async function loadAssetsList() {
      try {
        const res = await fetch('/assets/assets.json');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.images) && data.images.length > 0) {
            setImagePool(data.images);
            setActiveFourImages(pickRandomFourImages(data.images));
          }
        }
      } catch {
        // Fallback sang danh sách 13 ảnh gốc mặc định trong code
      }
    }
    loadAssetsList();
  }, []);

  // Tự động xoay chuyển 4 ảnh tuần hoàn mượt mà mỗi 3.8s
  useEffect(() => {
    if (activeFourImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeFourImages.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [activeFourImages.length]);

  const handlePrev = useCallback(() => {
    setActiveFourImages(prevImages => {
      setCurrentIndex((prev) => (prev - 1 + prevImages.length) % prevImages.length);
      return prevImages;
    });
  }, []);

  const handleNext = useCallback(() => {
    setActiveFourImages(prevImages => {
      setCurrentIndex((prev) => (prev + 1) % prevImages.length);
      return prevImages;
    });
  }, []);

  // Đổi bộ 4 tấm ngẫu nhiên khác ngay lập tức
  const handleRandomizeFour = () => {
    setActiveFourImages(pickRandomFourImages(imagePool));
    setCurrentIndex(0);
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden rounded-3xl my-2">
      {/* 
        LAYER 1: Nền phía dưới là ảnh Logo DYM Vietnam navy blue nguyên bản 
        kèm hiệu ứng Blur tầm 70%
      */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl">
        <img
          src="/assets/bg_logo.jpg"
          alt="DYM Vietnam Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover scale-110 filter blur-[20px] opacity-70 brightness-75 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-blue-950/70 to-slate-900/80 backdrop-blur-2xl" />
      </div>

      {/* 
        LAYER 2: Bố cục 2 cột
        - Bên trái: Khung đăng nhập (Login Box)
        - Bên phải: 2 vùng (Vùng 1: 3D Coverflow hiển thị ngẫu nhiên 4 tấm ảnh; Vùng 2: Video hoạt động)
      */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        
        {/* CỘT TRÁI: Khung đăng nhập (5/12 cột) */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl shadow-blue-950/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all hover:border-white/60">
            {/* Logo & Header */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 p-2.5">
                  <img 
                    src="/assets/bg_logo.jpg" 
                    alt="DYM Logo Icon" 
                    referrerPolicy="no-referrer"
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

              <div className="flex items-center gap-1.5">
                {/* Nút random 4 tấm ảnh khác ngay */}
                <button
                  type="button"
                  onClick={handleRandomizeFour}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Random chọn 4 tấm ảnh khác từ kho ảnh"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Random 4 ảnh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: 2 vùng (7/12 cột) */}
        <div className="lg:col-span-7 flex flex-col gap-5 justify-between">
          
          {/* 
            VÙNG 1 (TRÊN): 3D COVERFLOW SLIDER ANIMATION
            - Luôn hiển thị ngẫu nhiên 4 tấm ảnh mỗi lần vào link
            - Ảnh trung tâm phóng to (scale 1), ảnh 2 bên thu nhỏ (scale 0.84)
            - Tuyệt đối KHÔNG có bất kỳ chữ nào đè lên ảnh
            - Tuyệt đối KHÔNG chỉnh màu hay xử lý pixel của ảnh
          */}
          <div className="relative h-64 sm:h-76 w-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center group px-3">
            
            {/* Carousel Track Container with Perspective */}
            <div className="relative w-full h-full flex items-center justify-center [perspective:1000px]">
              {activeFourImages.map((img, index) => {
                const count = activeFourImages.length;
                let offset = (index - currentIndex + count) % count;
                if (offset === count - 1) offset = -1; // Item bên trái
                
                const isCenter = offset === 0;
                const isLeft = offset === -1;
                const isRight = offset === 1;

                if (!isCenter && !isLeft && !isRight) {
                  return null;
                }

                return (
                  <div
                    key={`${img.filename}-${img.id}`}
                    onClick={() => {
                      if (isLeft) handlePrev();
                      if (isRight) handleNext();
                    }}
                    style={{
                      transform: isCenter 
                        ? 'translateX(0%) scale(1) translateZ(0px)' 
                        : isLeft 
                        ? 'translateX(-44%) scale(0.84) translateZ(-80px)' 
                        : 'translateX(44%) scale(0.84) translateZ(-80px)',
                      zIndex: isCenter ? 20 : 10,
                      opacity: isCenter ? 1 : 0.55,
                    }}
                    className="absolute w-[68%] sm:w-[62%] h-[82%] sm:h-[86%] rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out cursor-pointer border border-white/25 select-none bg-slate-900"
                  >
                    {/* Ảnh nguyên bản 100%, không chỉnh màu, có fallback an toàn */}
                    <img
                      src={img.src}
                      alt={img.filename}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== img.fallbackSrc) {
                          target.src = img.fallbackSrc;
                        }
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

            {/* 4 Chấm tròn Pagination tương ứng đúng 4 tấm ảnh ngẫu nhiên */}
            <div className="absolute bottom-3.5 z-30 flex items-center gap-2">
              {activeFourImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentIndex === i 
                      ? 'w-7 bg-lime-400 shadow-sm shadow-lime-400/50' 
                      : 'w-4 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Ảnh ${i + 1} / 4`}
                />
              ))}
            </div>
          </div>

          {/* 
            VÙNG 2 (DƯỚI): VIDEO HOẠT ĐỘNG NGUYÊN BẢN
            - Tự động phát lặp video trong public/assets/teambuilding.mp4
            - KHÔNG có bất kỳ chữ nào đè lên video
            - Có nút bật/tắt âm thanh tiện lợi
          */}
          <div className="relative h-60 sm:h-72 w-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950 flex flex-col justify-end group">
            <video
              autoPlay
              loop
              muted={isVideoMuted}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              poster="/assets/teambuilding_beach.jpg"
            >
              <source src="/assets/teambuilding.mp4" type="video/mp4" />
              <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
              Trình duyệt không hỗ trợ phát video.
            </video>

            {/* Nút bật/tắt âm thanh nhỏ góc phải dưới */}
            <div className="relative z-10 p-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVideoMuted(!isVideoMuted)}
                className="p-2.5 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                title={isVideoMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isVideoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-lime-400" />}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
