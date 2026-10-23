import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, CheckCircle2, X, MapPin } from 'lucide-react';
import { 
  compressImage, 
  uploadReturnPhoto, 
  queueNotificationEmail, 
  db, 
  storage, 
  storageRef, 
  deleteObject 
} from './firebase';
import { generateEmailHtml } from './emailTemplates';
import { doc, updateDoc } from 'firebase/firestore';
import { BookingRecord, ADMIN_EMAIL } from './types';
import confetti from 'canvas-confetti';
import { OfficeMapCanvas } from './OfficeMapCanvas';

interface ReturnDeviceModalProps {
  booking: BookingRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnDeviceModal: React.FC<ReturnDeviceModalProps> = ({
  booking,
  onClose,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedData, setCompressedData] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [uploadedStorageUrl, setUploadedStorageUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdBlobUrlRef = useRef<string | null>(null);

  if (!booking) return null;

  // Handle file selection: Pre-compress immediately in background when user chooses photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, ...)!');
      return;
    }

    // Thu hồi object URL cũ nếu có
    if (createdBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(createdBlobUrlRef.current);
      } catch {}
      createdBlobUrlRef.current = null;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setIsProcessingImage(true);

    try {
      // Nén ảnh nhanh ngay khi người dùng chọn
      const result = await compressImage(file, 1280, 0.78);
      setCompressedData(result);
      setPreviewUrl(result.dataUrl);
    } catch (err) {
      console.warn('Pre-compression failed, using object URL for preview:', err);
      const objUrl = URL.createObjectURL(file);
      createdBlobUrlRef.current = objUrl;
      setPreviewUrl(objUrl);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Sửa nút xóa ảnh: Hủy object URL, xóa file trên Storage nếu đã upload, reset file input và state
  const handleRemoveImage = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Nếu ảnh đã được tải lên Firebase Storage trước đó, xóa khỏi Storage
    if (uploadedStorageUrl) {
      try {
        const photoRef = storageRef(storage, uploadedStorageUrl);
        await deleteObject(photoRef);
      } catch (err) {
        console.error('Error deleting photo from Storage:', err);
      }
    }

    // Hủy Object URL nếu có
    if (createdBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(createdBlobUrlRef.current);
      } catch {}
      createdBlobUrlRef.current = null;
    }

    // Reset toàn bộ state ảnh
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressedData(null);
    setUploadedStorageUrl(null);
    setIsProcessingImage(false);
    setErrorMessage(null);

    // Reset giá trị của thẻ input để có thể chọn lại chính file đó
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmReturn = async () => {
    // ẢNH KHÔNG CÒN BẮT BUỘC: luôn thực hiện trả thành công dù có ảnh hay không
    setUploading(true);
    setErrorMessage(null);

    try {
      let downloadUrl: string | null = null;
      let photoBase64ForEmail: string | undefined = undefined;

      // Nếu có chọn ảnh thì xử lý tải lên Storage và đính kèm email
      if (selectedFile) {
        let finalCompressed = compressedData;
        if (!finalCompressed) {
          finalCompressed = await compressImage(selectedFile, 1280, 0.78);
          setCompressedData(finalCompressed);
        }

        downloadUrl = await uploadReturnPhoto(
          booking.id, 
          finalCompressed.blob, 
          finalCompressed.dataUrl
        );
        photoBase64ForEmail = finalCompressed.dataUrl;
      }

      const returnedAt = new Date().toISOString();

      // Cập nhật Firestore Document (nếu không có ảnh thì lưu null)
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        isReturned: true,
        returnedAt: returnedAt,
        returnPhotoUrl: downloadUrl || null
      });

      // Gửi Email thông báo hoàn trả (vẫn gửi bình thường khi không có ảnh)
      const emailContent = generateEmailHtml({
        actionType: 'return',
        booking: {
          ...booking,
          isReturned: true,
          returnedAt: returnedAt,
          returnPhotoUrl: downloadUrl || null
        },
        returnPhotoUrl: downloadUrl || null,
        returnedAt: returnedAt
      });

      const borrowerEmail = (booking.registrantEmail || '').trim();
      const recipients = Array.from(new Set([borrowerEmail, ADMIN_EMAIL].filter(Boolean)));

      await queueNotificationEmail({
        to: recipients,
        subject: emailContent.subject,
        html: emailContent.html,
        type: 'return',
        ...(photoBase64ForEmail ? { photoBase64: photoBase64ForEmail } : {})
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      onSuccess();
    } catch (err: unknown) {
      console.error('Error during return process:', err);
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi xác nhận trả thiết bị.';
      setErrorMessage(`Lỗi: ${msg}. Vui lòng thử lại.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Trả thiết bị • 機器を返却
            </h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Xác nhận trả lại: <span className="font-semibold underline">{booking.device}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
            <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Yêu cầu trả thiết bị (返却条件):
            </div>
            <p className="text-slate-600 leading-relaxed">
              Vui lòng đặt thiết bị về đúng vị trí trong tủ theo sơ đồ hướng dẫn bên dưới. Nên chụp ảnh xác nhận vị trí để tiện đối chiếu khi cần (không bắt buộc).
            </p>
          </div>

          {/* Sơ đồ vị trí tủ thiết bị khi trả */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-red-600">
              <MapPin className="w-4 h-4 text-red-600 shrink-0" />
              <span>Đặt thiết bị về đúng chỗ tủ • 機器をキャビネットの定位置へ戻してください</span>
            </div>
            <OfficeMapCanvas userEmail={booking.registrantEmail} isCompact={true} />
          </div>

          {/* Booking Summary */}
          <div className="text-xs grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-500">Người mượn:</span>
              <p className="font-semibold text-slate-800">{booking.registrantName}</p>
            </div>
            <div>
              <span className="text-slate-500">Team:</span>
              <p className="font-semibold text-slate-800">{booking.team}</p>
            </div>
            <div>
              <span className="text-slate-500">Ngày mượn:</span>
              <p className="font-medium text-slate-800">{booking.date}</p>
            </div>
            <div>
              <span className="text-slate-500">Khung giờ:</span>
              <p className="font-medium text-slate-800">{booking.startTime} - {booking.endTime}</p>
            </div>
          </div>

          {/* Photo capture section - KHÔNG BẮT BUỘC */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Ảnh xác nhận (không bắt buộc) • 確認写真（任意）
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-emerald-50/40 group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">
                  Bấm để Chụp ảnh hoặc Chọn ảnh (không bắt buộc)
                </div>
                <p className="text-xs text-slate-500 max-w-xs">
                  (Khuyến khích chụp trực tiếp vị trí cất thiết bị để lưu bằng chứng đối chiếu)
                </p>
                <button
                  type="button"
                  tabIndex={-1}
                  className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors pointer-events-none"
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  Mở camera / Tải ảnh lên
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                <img
                  src={previewUrl}
                  alt="Ảnh hoàn trả"
                  className="w-full max-h-56 object-contain bg-black/40"
                />

                {/* Nút hành động nổi trên ảnh khi hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 p-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-3.5 py-2 bg-white text-slate-900 text-xs font-semibold rounded-xl shadow-md hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4 text-slate-700" />
                    <span>Đổi ảnh khác</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3.5 py-2 bg-[#C0392B] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#A93226] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4" />
                    <span>Xóa ảnh</span>
                  </button>
                </div>

                {/* Thanh trạng thái và nút Xóa luôn thấy được dưới ảnh (đặc biệt tiện lợi cho Mobile/Safari) */}
                <div className="p-2.5 bg-slate-900 text-white text-xs font-medium flex items-center justify-between border-t border-slate-800">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    {isProcessingImage ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang tối ưu ảnh...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Đã đính kèm ảnh</span>
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-[11px] font-semibold text-slate-300 hover:text-white underline cursor-pointer md:hidden"
                    >
                      Đổi ảnh
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-2.5 py-1 bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Xóa ảnh</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions: Nút xác nhận luôn bấm được dù chưa chọn ảnh */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy • キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirmReturn}
            disabled={uploading || isProcessingImage}
            className="px-5 py-2 text-xs font-bold text-white bg-[#0077B6] rounded-xl hover:bg-[#023E8A] shadow-md transition-all disabled:bg-[#90E0EF] disabled:text-[#023E8A] disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer active:scale-98"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang hoàn tất...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận đã trả • 返却完了</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
