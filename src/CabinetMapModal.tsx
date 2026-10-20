import React, { useEffect } from 'react';
import { X, KeyRound, MapPin, CheckCircle2 } from 'lucide-react';
import { OfficeMapCanvas } from './OfficeMapCanvas';

interface CabinetMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  device?: string | null;
  laptopPassword?: string | null;
}

export const CabinetMapModal: React.FC<CabinetMapModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  device,
  laptopPassword,
}) => {
  // Lock background page scroll on mobile / desktop when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isLaptop = device === 'LAPTOP';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:w-[96vw] max-w-6xl h-full sm:h-[92vh] bg-white sm:rounded-2xl shadow-2xl border border-[#90E0EF] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Xanh dương --b1 với chữ trắng */}
        <div className="bg-[#03045E] px-4 sm:px-6 py-3 text-white flex items-center justify-between border-b border-[#023E8A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0096C7] flex items-center justify-center text-white shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Lấy thiết bị tại đây • 機器の保管場所</span>
              </h3>
              <p className="text-[11px] text-[#CAF0F8] font-medium leading-tight">
                Sơ đồ mặt bằng văn phòng DYM Vietnam (全フロアマップ)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-[#CAF0F8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng (Close)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 flex flex-col space-y-3">
          {/* LAPTOP Password Highlight Banner (nếu xem khi mượn laptop) */}
          {isLaptop && (
            <div className="p-3 bg-[#CAF0F8]/50 border-2 border-[#0096C7] rounded-xl flex items-start gap-3 text-[#03045E] shadow-2xs shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#0096C7] text-white flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-[#03045E]">
                    Mật khẩu mở máy LAPTOP (パスワード):
                  </span>
                  <span className="px-3 py-0.5 bg-white font-mono font-black text-base tracking-widest text-[#03045E] border border-[#0096C7] rounded-lg shadow-inner select-all">
                    {laptopPassword || '976431'}
                  </span>
                  <span className="text-[10px] font-bold text-[#03045E] bg-[#ADE8F4] px-2 py-0.5 rounded-full border border-[#90E0EF]">
                    Bảo mật
                  </span>
                </div>
                <p className="text-[11px] text-[#03045E]/80 leading-normal">
                  Vui lòng lấy máy tại Ô TỦ (giữa khối VINH & HA) và dùng mật khẩu này để đăng nhập.
                </p>
              </div>
            </div>
          )}

          {/* Hướng dẫn ngắn */}
          <div className="text-xs text-[#03045E]/85 bg-slate-50 border border-[#ADE8F4] p-2.5 rounded-xl flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0096C7] shrink-0" />
              <p className="leading-relaxed">
                Tủ thiết bị <strong className="text-red-600">"TỦ"</strong> nằm ở đầu lối đi giữa hai khối <strong>VINH</strong> và <strong>HA</strong> (sát phía cửa kính 窓ガラス側). Đường nét đứt màu đỏ chỉ dẫn lộ trình đi qua các lối đi trắng.
              </p>
            </div>
          </div>

          {/* Interactive Full Office Map Canvas */}
          <div className="flex-1 min-h-[460px] sm:min-h-[540px] w-full flex flex-col">
            <OfficeMapCanvas userEmail={userEmail} />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#CAF0F8]/20 border-t border-[#ADE8F4] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#023E8A] font-medium hidden sm:inline-block">
            DYM Vietnam Co., Ltd. • 機器貸出管理
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors ml-auto cursor-pointer"
          >
            Đã hiểu, đóng lại • 閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
