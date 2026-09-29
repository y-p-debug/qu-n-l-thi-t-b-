import { BookingRecord } from './types';
import { formatDateDisplay, formatDateTimeDisplay } from './utils';

/**
 * Builds email HTML template mirroring the exact table layout in the app
 * matching the columns:
 * NGÀY 日付 | BẮT ĐẦU 開始 | KẾT THÚC 終了 | THIẾT BỊ 機器 | TEAM チーム | NGƯỜI ĐĂNG KÝ 登録者 | MỤC ĐÍCH 目的 | TRẢ LẠI 返却 (+ ẢNH)
 */
export function generateEmailHtml(params: {
  actionType: 'borrow' | 'return' | 'overdue';
  booking: BookingRecord;
  laptopPassword?: string | null;
  returnPhotoUrl?: string | null;
  returnedAt?: string | null;
}): { subject: string; html: string } {
  const { actionType, booking, laptopPassword, returnPhotoUrl, returnedAt } = params;
  const formattedDate = formatDateDisplay(booking.date);
  const timeRange = `${booking.startTime} - ${booking.endTime}`;

  let headingText = '';
  let statusBadgeHtml = '';
  let subject = '';

  if (actionType === 'borrow') {
    subject = `[MƯỢN] ${booking.device}`;
    headingText = `Ngày ${formattedDate} bạn ${booking.registrantName} đã mượn ${booking.device} và khung giờ ${timeRange}`;
    statusBadgeHtml = `<span style="background-color: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 11px;">Đang mượn</span>`;
  } else if (actionType === 'return') {
    subject = `[TRẢ] ${booking.device}`;
    headingText = `Ngày ${formattedDate} bạn ${booking.registrantName} đã trả ${booking.device} và khung giờ ${timeRange}`;
    statusBadgeHtml = `<span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">Đã trả</span>`;
  } else {
    subject = `[QUÁ GIỜ] ${booking.device}`;
    headingText = `Ngày ${formattedDate} bạn ${booking.registrantName} đã mượn quá giờ ${booking.device} và khung giờ ${timeRange}`;
    statusBadgeHtml = `<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">QUÁ GIỜ CHƯA TRẢ</span>`;
  }

  const deviceBadge = booking.device === 'LAPTOP' 
    ? `<span style="background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 4px 8px; border-radius: 6px; font-weight: 700;">💻 LAPTOP</span>`
    : `<span style="background-color: #e2e8f0; color: #1e293b; padding: 4px 8px; border-radius: 6px; font-weight: 700;">📷 ${booking.device}</span>`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07);">
      
      <!-- Top banner -->
      <div style="background: linear-gradient(135deg, #1d4ed8 0%, #3730a3 100%); color: #ffffff; padding: 20px 24px;">
        <div style="font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Hệ thống Quản lý mượn thiết bị • DYM Vietnam</div>
        <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">
          ${actionType === 'borrow' ? '📋 THÔNG BÁO MƯỢN THIẾT BỊ' : actionType === 'return' ? '✅ THÔNG BÁO HOÀN TRẢ THIẾT BỊ' : '⚠️ CẢNH BÁO QUÁ GIỜ MƯỢN THIẾT BỊ'}
        </h2>
      </div>

      <!-- Main message text per user request -->
      <div style="padding: 20px 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a; line-height: 1.6;">
          ${headingText}
        </p>
      </div>

      <!-- Attached Table matching the exact UI design -->
      <div style="padding: 24px; overflow-x: auto;">
        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
          Chi tiết bản ghi mượn thiết bị (Thông tin đính kèm):
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 12px 14px; border: 1px solid #e2e8f0;">NGÀY 日付</th>
              <th style="padding: 12px 10px; border: 1px solid #e2e8f0;">BẮT ĐẦU 開始</th>
              <th style="padding: 12px 10px; border: 1px solid #e2e8f0;">KẾT THÚC 終了</th>
              <th style="padding: 12px 12px; border: 1px solid #e2e8f0;">THIẾT BỊ 機器</th>
              <th style="padding: 12px 10px; border: 1px solid #e2e8f0;">TEAM チーム</th>
              <th style="padding: 12px 14px; border: 1px solid #e2e8f0;">NGƯỜI ĐĂNG KÝ 登録者</th>
              <th style="padding: 12px 14px; border: 1px solid #e2e8f0;">MỤC ĐÍCH 目的</th>
              <th style="padding: 12px 14px; border: 1px solid #e2e8f0; text-align: center;">TRẢ LẠI 返却 (+ ẢNH)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: ${actionType === 'overdue' ? '#fff1f2' : '#ffffff'};">
              <td style="padding: 12px 14px; border: 1px solid #e2e8f0; font-weight: 600; white-space: nowrap;">
                ${formattedDate}
              </td>
              <td style="padding: 12px 10px; border: 1px solid #e2e8f0; white-space: nowrap;">
                ⏰ ${booking.startTime}
              </td>
              <td style="padding: 12px 10px; border: 1px solid #e2e8f0; white-space: nowrap;">
                ⏰ ${booking.endTime}
              </td>
              <td style="padding: 12px 12px; border: 1px solid #e2e8f0; white-space: nowrap;">
                ${deviceBadge}
              </td>
              <td style="padding: 12px 10px; border: 1px solid #e2e8f0; white-space: nowrap;">
                <span style="background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 600; border: 1px solid #cbd5e1;">${booking.team}</span>
              </td>
              <td style="padding: 12px 14px; border: 1px solid #e2e8f0;">
                <div style="font-weight: 700; color: #0f172a;">${booking.registrantName}</div>
                <div style="font-size: 11px; color: #64748b;">${booking.registrantEmail}</div>
              </td>
              <td style="padding: 12px 14px; border: 1px solid #e2e8f0; color: #334155;">
                ${booking.purpose || '-'}
              </td>
              <td style="padding: 12px 14px; border: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">
                ${statusBadgeHtml}
                ${returnedAt ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Trả lúc: ${formatDateTimeDisplay(returnedAt)}</div>` : ''}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Laptop password reminder if applicable -->
        ${booking.device === 'LAPTOP' && actionType === 'borrow' ? `
          <div style="margin-top: 16px; padding: 14px 18px; background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; color: #92400e;">
            <strong style="font-size: 14px;">🔑 Mật khẩu mở máy LAPTOP:</strong> 
            <span style="font-family: monospace; font-size: 18px; background: #ffffff; padding: 3px 8px; border-radius: 6px; font-weight: 800; border: 1px solid #fcd34d; margin-left: 6px;">
              ${laptopPassword || '976431'}
            </span>
          </div>
        ` : ''}

        <!-- Return Photo attachment / preview if returned -->
        ${returnPhotoUrl ? `
          <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 8px;">📷 Ảnh thiết bị đã đặt về vị trí cũ:</div>
            ${!returnPhotoUrl.startsWith('data:') ? `
              <div style="margin-bottom: 12px;">
                <img src="${returnPhotoUrl}" alt="Ảnh hoàn trả thiết bị" style="max-width: 320px; max-height: 240px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block;" />
              </div>
              <div>
                <a href="${returnPhotoUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">Xem ảnh gốc đầy đủ</a>
              </div>
            ` : `
              <div style="font-size: 12px; color: #64748b;">(Đã lưu ảnh xác nhận trên hệ thống cơ sở dữ liệu)</div>
            `}
          </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
        Hệ thống Quản lý mượn thiết bị • DYM Vietnam Co., Ltd. • Email tự động, vui lòng không trả lời thư này.
      </div>
    </div>
  `;

  return { subject, html };
}
