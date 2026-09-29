import React, { useState } from 'react';
import { BookOpen, Shield, Cloud, Terminal, CheckCircle2, Copy, ExternalLink, HelpCircle, Code } from 'lucide-react';

export const DeploymentGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const appsScriptSampleCode = `/**
 * Google Apps Script Webhook (Miễn phí 100% bằng tài khoản Google cá nhân/Workspace)
 * Nhận POST từ backend và dùng GmailApp để gửi mail trực tiếp tới người mượn & y-p@dymvietnam.net
 */
const SECRET_KEY = "DYM_VIETNAM_DEVICE_SECRET"; // Đặt trùng với biến APPS_SCRIPT_SECRET
const ADMIN_EMAIL = "y-p@dymvietnam.net";

function doPost(e) {
  try {
    const raw = e.postData.contents;
    const data = JSON.parse(raw);

    // 1. Kiểm tra mã bí mật
    if (data.secret !== SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Gom danh sách người nhận (tự động đính kèm ADMIN)
    const recipientSet = {};
    if (data.to && Array.isArray(data.to)) {
      data.to.forEach(function(email) { if (email) recipientSet[email.trim().toLowerCase()] = true; });
    }
    recipientSet[ADMIN_EMAIL.toLowerCase()] = true;
    const recipients = Object.keys(recipientSet).join(",");

    // 3. Xử lý ảnh đính kèm (nếu là sự kiện Trả thiết bị có photoBase64)
    const mailOptions = {
      htmlBody: data.html,
      attachments: []
    };

    if (data.photoBase64 && data.photoBase64.indexOf("base64,") !== -1) {
      const base64Data = data.photoBase64.split("base64,")[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const photoBlob = Utilities.newBlob(decodedBytes, "image/jpeg", "thiet_bi_da_tra.jpg");
      mailOptions.attachments.push(photoBlob);
    }

    // 4. Gửi email trực tiếp qua Gmail
    GmailApp.sendEmail(recipients, data.subject, "", mailOptions);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">Hướng dẫn cấu hình Google Apps Script Webhook (Miễn phí 100%)</h3>
              <p className="text-xs text-slate-300">Gửi mail qua backend NodeJS không tốn chi phí Resend / Firebase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-1.5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-600" />
              Cách tạo Google Apps Script Webhook trong 2 phút:
            </h4>
            <ol className="list-decimal pl-5 space-y-1 text-slate-800">
              <li>Truy cập <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline inline-flex items-center gap-0.5">script.google.com <ExternalLink className="w-3 h-3" /></a> bằng tài khoản <strong>y-p@dymvietnam.net</strong>.</li>
              <li>Bấm <strong>Dự án mới (New Project)</strong>, xóa hết code mặc định và dán đoạn mã bên dưới vào.</li>
              <li>Bấm nút <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong>:
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600">
                  <li>Chọn loại: <strong>Ứng dụng web (Web app)</strong>.</li>
                  <li>Thực thi dưới dạng (Execute as): <strong>Tôi (My account)</strong>.</li>
                  <li>Ai có quyền truy cập (Who has access): <strong>Bất kỳ ai (Anyone)</strong>.</li>
                </ul>
              </li>
              <li>Sao chép <strong>URL ứng dụng web</strong> (có dạng <code>https://script.google.com/macros/s/AKfycb.../exec</code>).</li>
              <li>Cấu hình 2 biến môi trường trên server/AI Studio:
                <div className="mt-1 font-mono text-[11px] bg-slate-900 text-emerald-400 p-2 rounded-lg">
                  <div>APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"</div>
                  <div>APPS_SCRIPT_SECRET="DYM_VIETNAM_DEVICE_SECRET"</div>
                </div>
              </li>
            </ol>
          </div>

          {/* Section 2: Code block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Mã nguồn Google Apps Script (Code.gs):</span>
              <button
                onClick={() => copyToClipboard(appsScriptSampleCode, 1)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors"
              >
                {copiedIndex === 1 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                {copiedIndex === 1 ? 'Đã sao chép!' : 'Sao chép mã'}
              </button>
            </div>

            <pre className="bg-slate-950 text-slate-100 p-3.5 rounded-xl overflow-x-auto text-[11px] font-mono border border-slate-800 max-h-72">
              {appsScriptSampleCode}
            </pre>
          </div>

          {/* Section 3: Periodic Scanner */}
          <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-800">Cơ chế quét Quá giờ mỗi 5 phút trên Backend:</h4>
            <p>
              Backend NodeJS chạy tiến trình nền định kỳ mỗi 5 phút tự động quét các bản ghi mượn thiết bị chưa trả (<code>isReturned == false</code>).
              Nếu thời gian hiện tại đã vượt quá <code>endTime</code> và cờ <code>overdueNotified == false</code>, hệ thống sẽ tự động gọi Google Apps Script Webhook để gửi email cảnh báo <code>[QUÁ GIỜ]</code> và đánh dấu <code>overdueNotified = true</code> (đảm bảo chỉ gửi 1 lần duy nhất cho mỗi lượt mượn).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-medium text-xs rounded-xl hover:bg-slate-800 transition-colors"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
