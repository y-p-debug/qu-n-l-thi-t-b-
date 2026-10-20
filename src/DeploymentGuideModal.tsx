import React, { useState } from 'react';
import { 
  BookOpen, 
  LogIn, 
  Laptop, 
  MapPin, 
  RotateCcw, 
  AlertTriangle, 
  Sparkles, 
  HelpCircle, 
  Code, 
  Copy, 
  CheckCircle2, 
  ChevronDown, 
  ExternalLink, 
  ShieldAlert,
  Info,
  PackageCheck,
  Check,
  Clock,
  Mail,
  UserCheck
} from 'lucide-react';

interface DeploymentGuideModalProps {
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({ onClose }) => {
  // Quản lý trạng thái mở/đóng của các accordion, mặc định mục 1 mở sẵn
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    '1': true,
    '2': false,
    '3': false,
    '4': false,
    '5': false,
    '6': false,
    '7': false,
    '8': false
  });

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string, idx: number) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-[#ADE8F4] animate-in fade-in">
        
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#03045E] via-[#023E8A] to-[#0077B6] text-white flex items-center justify-between shrink-0 border-b border-[#48CAE4]/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
              <BookOpen className="w-5 h-5 text-[#ADE8F4]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                Hướng dẫn sử dụng & Rules • ご利用案内・利用規約
              </h3>
              <p className="text-[11px] sm:text-xs text-[#ADE8F4] truncate">
                Hệ thống quản lý mượn thiết bị DYM Vietnam • 機器貸出管理システム
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-[#ADE8F4] hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            title="Đóng cửa sổ"
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 text-xs text-slate-700 leading-relaxed max-w-full overflow-x-hidden">
          
          {/* ============================================================== */}
          {/* MỤC 1: ĐĂNG NHẬP / ログイン */}
          {/* ============================================================== */}
          <div className="border border-[#ADE8F4] rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('1')}
              className="w-full px-4 py-3 bg-[#CAF0F8]/30 hover:bg-[#CAF0F8]/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#03045E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <LogIn className="w-4 h-4 text-[#0077B6] shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#03045E]">
                    Đăng nhập • ログイン
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Tài khoản Google Workspace công ty
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#0077B6] shrink-0 transition-transform duration-200 ${openSections['1'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['1'] && (
              <div className="p-4 space-y-3 border-t border-[#ADE8F4]/50 bg-white">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#03045E] flex items-start gap-2">
                    <span className="text-[#0096C7] font-bold">•</span>
                    <span>Bấm <strong>"Đăng nhập với Google"</strong> và chọn email công ty (<code>@dymvietnam.net</code> hoặc <code>le-v@dymvietnam.jp</code>). Email ngoài danh sách phân quyền sẽ không thể truy cập hệ thống.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-4 font-normal">
                    「Googleでログイン」をクリックし、会社のメールアドレス（@dymvietnam.net または le-v@dymvietnam.jp）を選択してください。権限リストに含まれていないメールアドレスではログインできません。
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#03045E] flex items-start gap-2">
                    <span className="text-[#0096C7] font-bold">•</span>
                    <span>Trên điện thoại, hãy mở trang web bằng trình duyệt <strong>Safari</strong> hoặc <strong>Chrome</strong>. Không mở trong trình duyệt nội bộ của Messenger, Zalo, Facebook vì Google chặn đăng nhập.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-4 font-normal">
                    スマートフォンの場合は、SafariまたはChromeで開いてください。Messenger、Zalo、Facebookなどのアプリ内ブラウザではGoogleのログイン制限によりエラーが発生します。
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MỤC 2: ĐĂNG KÝ MƯỢN THIẾT BỊ / 機器の貸出登録 */}
          {/* ============================================================== */}
          <div className="border border-[#ADE8F4] rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('2')}
              className="w-full px-4 py-3 bg-[#CAF0F8]/30 hover:bg-[#CAF0F8]/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#03045E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <Laptop className="w-4 h-4 text-[#0077B6] shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#03045E]">
                    Đăng ký mượn thiết bị • 機器の貸出登録
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Các bước đặt trước thiết bị theo khung giờ
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#0077B6] shrink-0 transition-transform duration-200 ${openSections['2'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['2'] && (
              <div className="p-4 space-y-3.5 border-t border-[#ADE8F4]/50 bg-white">
                <div className="text-xs font-bold text-[#03045E] uppercase tracking-wider">
                  Các bước thực hiện • 登録手順:
                </div>

                {/* Danh sách các bước với vòng tròn xanh #03045E */}
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">Chọn Ngày mượn.</div>
                      <div className="text-[11px] text-slate-500">利用日（日付）を選択します。</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">Chọn giờ Bắt đầu và giờ Kết thúc.</div>
                      <div className="text-[11px] text-slate-500">開始時刻と終了時刻を選択します。</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">
                        Mở ô Thiết bị: hệ thống chỉ hiện các thiết bị còn trống trong khung giờ đã chọn (thiết bị đã có người mượn trùng giờ sẽ bị ẩn). Số <strong>"SẴN SÀNG"</strong> cho biết còn bao nhiêu thiết bị.
                      </div>
                      <div className="text-[11px] text-slate-500">
                        「機器」の選択欄を開きます。指定した時間帯に空いている機器のみが表示されます（同じ時間帯に予約済みの機器は選択不可となります）。「SẴN SÀNG」の数字で利用可能な機器の数を確認できます。
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">Chọn Team.</div>
                      <div className="text-[11px] text-slate-500">所属チーム（1課、2課、3課など）を選択します。</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      5
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">Chọn tên Người đăng ký (tên của chính bạn).</div>
                      <div className="text-[11px] text-slate-500">登録者名（ご自身のお名前）を選択します。</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      6
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">Nhập Mục đích sử dụng.</div>
                      <div className="text-[11px] text-slate-500">利用目的を入力します（例：会議、撮影、研修など）。</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      7
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">Bấm nút đăng ký.</div>
                      <div className="text-[11px] text-slate-500">「Đăng ký mượn • 登録する」ボタンをクリックします。</div>
                    </div>
                  </div>
                </div>

                {/* Khung Lưu ý quan trọng (Nền vàng nhạt) */}
                <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 text-amber-950">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Lưu ý quan trọng • 注意事項:</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-amber-950">
                    <li>
                      <div>Phải chọn ngày và giờ trước thì mới thấy danh sách thiết bị còn trống.</div>
                      <div className="text-[10px] text-amber-800">機器一覧を確認・選択するには、先に日付と開始・終了時刻を選択する必要があります。</div>
                    </li>
                    <li>
                      <div>Nếu chọn <strong>LAPTOP</strong>, mật khẩu mở máy sẽ hiện ra ngay sau khi đăng ký. Tuyệt đối không chia sẻ mật khẩu cho người ngoài công ty.</div>
                      <div className="text-[10px] text-amber-800">LAPTOPを選択した場合、登録完了後にログイン用パスワードが表示されます。社外の人には絶対に共有しないでください。</div>
                    </li>
                    <li>
                      <div>Sau khi đăng ký, email xác nhận tự động gửi tới email của người mượn và người quản lý.</div>
                      <div className="text-[10px] text-amber-800">登録完了後、借用者および管理者宛てに確認通知メールが自動送信されます。</div>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MỤC 3: LẤY THIẾT BỊ / 機器の受け取り */}
          {/* ============================================================== */}
          <div className="border border-[#ADE8F4] rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('3')}
              className="w-full px-4 py-3 bg-[#CAF0F8]/30 hover:bg-[#CAF0F8]/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#03045E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <MapPin className="w-4 h-4 text-[#0077B6] shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#03045E]">
                    Lấy thiết bị • 機器の受け取り
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Nhận thiết bị tại tủ và kiểm tra phụ kiện
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#0077B6] shrink-0 transition-transform duration-200 ${openSections['3'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['3'] && (
              <div className="p-4 space-y-3 border-t border-[#ADE8F4]/50 bg-white">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#03045E] flex items-start gap-2">
                    <span className="text-[#0096C7] font-bold">•</span>
                    <span>Lấy thiết bị tại tủ theo đúng ngày giờ đã đăng ký. Bấm nút <strong>"Sơ đồ tủ"</strong> ở thanh trên để xem vị trí chính xác và đường đi trong văn phòng.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-4 font-normal">
                    登録した日時に従って、専用キャビネット（TỦ）から機器を受け取ってください。キャビネットの位置はヘッダーの「Sơ đồ tủ」で確認できます。
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#03045E] flex items-start gap-2">
                    <span className="text-[#0096C7] font-bold">•</span>
                    <span>Trước khi mang đi, kiểm tra thiết bị còn nguyên vẹn, đầy đủ phụ kiện (pin, dây sạc, thẻ nhớ... nếu có). Nếu hỏng hoặc thiếu, báo ngay cho người quản lý.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-4 font-normal">
                    持ち出す前に、機器に破損がないか、付属品（バッテリー、充電ケーブル、SDカードなど）が揃っているかを必ず確認してください。故障や欠品がある場合は、直ちに管理者に報告してください。
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MỤC 4: TRẢ THIẾT BỊ / 機器の返却 (QUAN TRỌNG) */}
          {/* ============================================================== */}
          <div className="border-2 border-[#0096C7] rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
            <button
              type="button"
              onClick={() => toggleSection('4')}
              className="w-full px-4 py-3 bg-[#CAF0F8]/50 hover:bg-[#CAF0F8]/80 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#0096C7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  4
                </div>
                <RotateCcw className="w-4 h-4 text-[#0077B6] shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#03045E] flex items-center gap-2 flex-wrap">
                    <span>Trả thiết bị • 機器の返却</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#C0392B] text-white font-extrabold uppercase tracking-wide">
                      QUAN TRỌNG • 重要
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Bắt buộc chụp ảnh vị trí đặt thiết bị trong tủ
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#0077B6] shrink-0 transition-transform duration-200 ${openSections['4'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['4'] && (
              <div className="p-4 space-y-3.5 border-t border-[#ADE8F4] bg-white">
                {/* Chuẩn bị */}
                <div className="p-3 bg-blue-50/70 border border-[#ADE8F4] rounded-xl space-y-1">
                  <div className="font-bold text-xs text-[#03045E] flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-[#0077B6] shrink-0" />
                    <span>Cần chuẩn bị • 事前準備:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#03045E]">
                    <li>
                      <div>Thiết bị cùng đầy đủ phụ kiện đã nhận (dây sạc, bao da, thẻ nhớ...).</div>
                      <div className="text-[10px] text-slate-500">借用した機器および受け取ったすべての付属品。</div>
                    </li>
                    <li>
                      <div>Điện thoại hoặc máy ảnh để chụp ảnh xác nhận vị trí trả.</div>
                      <div className="text-[10px] text-slate-500">返却確認写真を撮影するためのスマートフォンまたはカメラ。</div>
                    </li>
                  </ul>
                </div>

                <div className="text-xs font-bold text-[#03045E] uppercase tracking-wider">
                  Các bước trả thiết bị • 返却手順:
                </div>

                {/* Các bước với vòng tròn xanh #03045E */}
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">
                        Đặt thiết bị và phụ kiện về <strong>ĐÚNG VỊ TRÍ CŨ</strong> trong tủ.
                      </div>
                      <div className="text-[11px] text-slate-500">
                        機器と付属品をキャビネット内の「元の定位置」に正しく戻します。
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">
                        Vào tab <strong>"Lịch sử mượn"</strong>, tìm bản ghi của bạn (đang ở trạng thái chưa trả).
                      </div>
                      <div className="text-[11px] text-slate-500">
                        「Lịch sử mượn」タブを開き、ご自身の未返却の予約レコードを探します。
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">
                        Bấm nút <strong>"Trả thiết bị"</strong>.
                      </div>
                      <div className="text-[11px] text-slate-500">
                        「Trả thiết bị」ボタンをクリックします。
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">
                        Chụp ảnh thiết bị đã đặt đúng vị trí cũ trong tủ rồi tải ảnh lên. Ảnh phải rõ nét, thấy được thiết bị và vị trí đặt. <strong>BẮT BUỘC có ảnh</strong> thì mới trả được.
                      </div>
                      <div className="text-[11px] text-slate-500">
                        キャビネット内の元の位置に設置された機器の写真を撮影し、アップロードします。写真には機器と配置場所が鮮明に写っている必要があります。写真の添付は【必須】です。
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      5
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#03045E]">
                        Bấm xác nhận. Trạng thái chuyển thành "Đã trả" và email thông báo trả thiết bị được gửi đi.
                      </div>
                      <div className="text-[11px] text-slate-500">
                        確認ボタンを押して完了します。ステータスが「Đã trả（返却済み）」に変わり、返却通知メールが自動送信されます。
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khung Lưu ý quan trọng */}
                <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 text-amber-950">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Lưu ý khi trả thiết bị • 返却時の注意:</span>
                  </div>
                  <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-amber-950">
                    <li>
                      <div>Nếu chưa chụp ảnh tải lên, hệ thống sẽ <strong>không cho xác nhận trả</strong>.</div>
                      <div className="text-[10px] text-amber-800">写真がアップロードされていない場合、システムは返却確認を受け付けません。</div>
                    </li>
                    <li>
                      <div>Trả đúng giờ kết thúc đã đăng ký để người sau có thể mượn đúng hẹn.</div>
                      <div className="text-[10px] text-amber-800">次の利用者がスムーズに借用できるよう、必ず登録した終了時刻までに返却してください。</div>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MỤC 5: QUÁ GIỜ CHƯA TRẢ / 返却遅延 (MÀU ĐỎ CẢNH BÁO) */}
          {/* ============================================================== */}
          <div className="border border-rose-300 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('5')}
              className="w-full px-4 py-3 bg-rose-50/70 hover:bg-rose-50 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#C0392B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  5
                </div>
                <AlertTriangle className="w-4 h-4 text-[#C0392B] shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#C0392B]">
                    Quá giờ chưa trả • 返却遅延
                  </div>
                  <div className="text-[11px] text-rose-800 font-medium">
                    Hệ thống cảnh báo quá hạn tự động
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#C0392B] shrink-0 transition-transform duration-200 ${openSections['5'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['5'] && (
              <div className="p-4 space-y-3 border-t border-rose-200 bg-rose-50/30">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-rose-900 flex items-start gap-2">
                    <span className="text-[#C0392B] font-bold">•</span>
                    <span>Nếu đã qua giờ kết thúc mà chưa bấm <strong>"Trả thiết bị"</strong>, hệ thống tự động gửi email nhắc nhở tới người mượn và người quản lý, đồng thời bản ghi trong lịch sử sẽ chuyển sang <strong>màu đỏ cảnh báo</strong>.</span>
                  </div>
                  <div className="text-[11px] text-rose-700 pl-4 font-normal">
                    終了時刻を過ぎても「Trả thiết bị」が完了していない場合、システムが借用者および管理者に催促メールを自動送信し、レコードが赤色で強調表示されます。
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-rose-900 flex items-start gap-2">
                    <span className="text-[#C0392B] font-bold">•</span>
                    <span>Nếu cần mượn thêm thời gian, vui lòng đăng ký lại một khung giờ mới (nếu thiết bị còn trống) hoặc liên hệ trực tiếp với người quản lý.</span>
                  </div>
                  <div className="text-[11px] text-rose-700 pl-4 font-normal">
                    利用時間を延長したい場合は、（機器が空いていれば）新しい時間枠で再度登録するか、または管理者に直接ご相談ください。
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MỤC 6: CÁC CHỨC NĂNG KHÁC / その他の機能 */}
          {/* ============================================================== */}
          <div className="border border-[#ADE8F4] rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('6')}
              className="w-full px-4 py-3 bg-[#CAF0F8]/30 hover:bg-[#CAF0F8]/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#03045E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  6
                </div>
                <Sparkles className="w-4 h-4 text-[#0077B6] shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#03045E]">
                    Các chức năng khác • その他の機能
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Lịch sử mượn, Hàng đợi Email và Sơ đồ tủ
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#0077B6] shrink-0 transition-transform duration-200 ${openSections['6'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['6'] && (
              <div className="p-4 space-y-3 border-t border-[#ADE8F4]/50 bg-white">
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#03045E] flex items-start gap-2">
                    <span className="text-[#0096C7] font-bold">•</span>
                    <span><strong>Lịch sử mượn:</strong> Xem toàn bộ các lượt mượn trong công ty, lọc theo ngày/thiết bị/trạng thái và xem ảnh xác nhận trả thiết bị.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-4 font-normal">
                    Lịch sử mượn（貸出一覧）：社内全体の貸出履歴の確認、日付・機器・ステータス別の絞り込み、返却写真の閲覧が可能です。
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#03045E] flex items-start gap-2">
                    <span className="text-[#0096C7] font-bold">•</span>
                    <span><strong>Hàng đợi Email:</strong> Xem danh sách các email thông báo đã tạo và trạng thái gửi tới người mượn và người quản lý.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-4 font-normal">
                    Hàng đợi Email（メール送信履歴）：作成された通知メール一覧と、借用者および管理者への送信状況を確認できます。
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#03045E] flex items-start gap-2">
                    <span className="text-[#0096C7] font-bold">•</span>
                    <span><strong>Sơ đồ tủ:</strong> Xem vị trí chính xác của tủ đựng thiết bị trên sơ đồ mặt bằng văn phòng kèm đường dẫn hướng từ chỗ ngồi của bạn.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-4 font-normal">
                    Sơ đồ tủ（キャビネット配置図）：オフィスフロアマップ上で機器キャビネットの正確な位置と、自席からの案内ルートを確認できます。
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MỤC 7: CẦN HỖ TRỢ / お問い合わせ */}
          {/* ============================================================== */}
          <div className="border border-[#ADE8F4] rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('7')}
              className="w-full px-4 py-3 bg-[#CAF0F8]/30 hover:bg-[#CAF0F8]/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#03045E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  7
                </div>
                <HelpCircle className="w-4 h-4 text-[#0077B6] shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-[#03045E]">
                    Cần hỗ trợ • お問い合わせ
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Liên hệ người quản trị khi gặp sự cố
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#0077B6] shrink-0 transition-transform duration-200 ${openSections['7'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['7'] && (
              <div className="p-4 space-y-2 border-t border-[#ADE8F4]/50 bg-white">
                <div className="text-xs sm:text-sm font-semibold text-[#03045E]">
                  Khi gặp sự cố kỹ thuật, phát hiện thiết bị hỏng hoặc cần hỗ trợ:
                </div>
                <div className="text-[11px] text-slate-500 font-normal">
                  システム障害、機器の破損、またはサポートが必要な場合：
                </div>
                <div className="mt-2 p-3 bg-[#CAF0F8]/40 border border-[#90E0EF] rounded-xl flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#0077B6] shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-[#03045E]">Email quản trị viên: </span>
                    <a href="mailto:y-p@dymvietnam.net" className="font-bold text-xs text-[#0077B6] hover:underline">
                      y-p@dymvietnam.net
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MỤC 8: CẤU HÌNH KỸ THUẬT, WEBHOOK & RULES (GIỮ NGUYÊN TOÀN BỘ) */}
          {/* ============================================================== */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => toggleSection('8')}
              className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200/80 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  8
                </div>
                <Code className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                    Cấu hình Kỹ thuật, Webhook & Rules (Quản trị viên) • 技術設定・Webhook・Rules
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Google Apps Script Webhook & Tiến trình quét quá hạn tự động
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-700 shrink-0 transition-transform duration-200 ${openSections['8'] ? 'rotate-180' : ''}`} />
            </button>

            {openSections['8'] && (
              <div className="p-4 space-y-4 border-t border-slate-200 bg-white">
                {/* Section 1 */}
                <div className="space-y-1.5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Cách tạo Google Apps Script Webhook trong 2 phút:</span>
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
                      type="button"
                      onClick={() => copyToClipboard(appsScriptSampleCode, 1)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Cơ chế quét Quá giờ mỗi 5 phút trên Backend:</span>
                  </h4>
                  <p className="text-slate-700">
                    Backend NodeJS chạy tiến trình nền định kỳ mỗi 5 phút tự động quét các bản ghi mượn thiết bị chưa trả (<code>isReturned == false</code>).
                    Nếu thời gian hiện tại đã vượt quá <code>endTime</code> và cờ <code>overdueNotified == false</code>, hệ thống sẽ tự động gọi Google Apps Script Webhook để gửi email cảnh báo <code>[QUÁ GIỜ]</code> và đánh dấu <code>overdueNotified = true</code> (đảm bảo chỉ gửi 1 lần duy nhất cho mỗi lượt mượn).
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-[#ADE8F4] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            DYM Vietnam Co., Ltd. • IT Management
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#023E8A] hover:bg-[#03045E] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Đã hiểu & Đóng • 閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
