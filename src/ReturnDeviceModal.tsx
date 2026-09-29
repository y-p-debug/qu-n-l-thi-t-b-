import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { compressImage, uploadReturnPhoto, queueNotificationEmail, db } from './firebase';
import { generateEmailHtml } from './emailTemplates';
import { doc, updateDoc } from 'firebase/firestore';
import { BookingRecord, ADMIN_EMAIL } from './types';
import confetti from 'canvas-confetti';

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
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!booking) return null;

  // Handle file selection: Pre-compress immediately in background when user chooses photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, ...)!');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setIsProcessingImage(true);

    try {
      // Fast compression happens right upon selecting photo
      const result = await compressImage(file, 1280, 0.78);
      setCompressedData(result);
      setPreviewUrl(result.dataUrl);
    } catch (err) {
      console.warn('Pre-compression failed, using object URL for preview:', err);
      setPreviewUrl(URL.createObjectURL(file));
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedFile) {
      setErrorMessage('BẮT BUỘC chụp hoặc tải lên hình ảnh thiết bị đã đặt về đúng vị trí cũ trước khi hoàn tất.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      // 1. Ensure compressed data is ready
      let finalCompressed = compressedData;
      if (!finalCompressed) {
        finalCompressed = await compressImage(selectedFile, 1280, 0.78);
        setCompressedData(finalCompressed);
      }

      // 2. Upload to Firebase Storage with fast 3.5s timeout fallback
      const downloadUrl = await uploadReturnPhoto(
        booking.id, 
        finalCompressed.blob, 
        finalCompressed.dataUrl
      );

      const returnedAt = new Date().toISOString();

      // 3. Update Firestore Document
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        isReturned: true,
        returnedAt: returnedAt,
        returnPhotoUrl: downloadUrl
      });

      // 4. Send Return Notification Email (non-blocking) with exact user requested layout
      // Script automatically adds y-p@dymvietnam.net, only send borrower email
      const emailContent = generateEmailHtml({
        actionType: 'return',
        booking: {
          ...booking,
          isReturned: true,
          returnedAt: returnedAt,
          returnPhotoUrl: downloadUrl
        },
        returnPhotoUrl: downloadUrl,
        returnedAt: returnedAt
      });

      const borrowerEmail = (booking.registrantEmail || '').trim();
      queueNotificationEmail({
        to: borrowerEmail ? [borrowerEmail] : [],
        subject: emailContent.subject,
        html: emailContent.html,
        type: 'return',
        photoBase64: finalCompressed.dataUrl // compressed base64 data:image/jpeg;base64,...
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
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
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
            <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Yêu cầu trả thiết bị (返却条件):
            </div>
            <p className="text-slate-600 leading-relaxed">
              Theo quy định, bạn <strong className="text-slate-900">bắt buộc</strong> phải chụp ảnh thiết bị đã được cất/đặt đúng vị trí ban đầu để hệ thống lưu bằng chứng hoàn tất.
            </p>
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

          {/* Photo capture section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Chụp ảnh thiết bị tại chỗ • 返却写真 (Bắt buộc)
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
                  Bấm để Chụp ảnh hoặc Chọn ảnh
                </div>
                <p className="text-xs text-slate-500 max-w-xs">
                  (Khuyến khích chụp trực tiếp từ camera điện thoại vị trí cất thiết bị)
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
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
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-900 text-xs font-medium rounded-lg shadow-sm hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> Chụp lại ảnh khác
                  </button>
                </div>
                <div className="p-2 bg-emerald-600 text-white text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {isProcessingImage ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang tối ưu ảnh...
                      </>
                    ) : (
                      <>✓ Đã sẵn sàng hoàn tất</>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setCompressedData(null);
                    }}
                    className="underline text-emerald-100 hover:text-white cursor-pointer"
                  >
                    Xóa
                  </button>
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

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Hủy • キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirmReturn}
            disabled={uploading || !selectedFile || isProcessingImage}
            className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang hoàn tất...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận đã trả • 返却完了
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
