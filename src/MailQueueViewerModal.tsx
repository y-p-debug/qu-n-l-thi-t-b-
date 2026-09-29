import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  ExternalLink, 
  X,
  Settings,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { db, updateClientCachedWebhook } from './firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';

interface MailLog {
  id: string;
  to: string[];
  type?: string;
  message?: {
    subject?: string;
    html?: string;
  };
  createdAt?: any;
}

export const MailQueueViewerModal: React.FC<{ 
  userEmail: string;
  onClose: () => void;
}> = ({ userEmail, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'config'>('logs');
  const [mailLogs, setMailLogs] = useState<MailLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Webhook settings state
  const [scriptUrl, setScriptUrl] = useState('');
  const [secretKey, setSecretKey] = useState('DYM_VIETNAM_DEVICE_SECRET');
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  const isAdmin = userEmail === 'y-p@dymvietnam.net';

  // Load current webhook config
  useEffect(() => {
    async function loadConfig() {
      try {
        const snap = await getDoc(doc(db, 'system_settings', 'apps_script'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.url) {
            setScriptUrl(data.url);
            updateClientCachedWebhook({ url: data.url, secret: data.secret || '' });
          }
          if (data.secret) setSecretKey(data.secret);
        }
      } catch (err) {
        console.warn('Could not read system_settings/apps_script:', err);
      }
    }
    loadConfig();
  }, []);

  // Listen to Firestore mail logs
  useEffect(() => {
    setLoading(true);
    const mailCol = collection(db, 'mail');
    const q = query(mailCol, orderBy('createdAt', 'desc'), limit(30));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: MailLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as MailLog);
      });
      setMailLogs(logs);
      setLoading(false);
    }, (err) => {
      console.warn('Mail queue snapshot note:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save Webhook config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptUrl.trim()) return;

    setIsConfigSaving(true);
    setConfigSuccess(null);
    setTestResult(null);

    try {
      // 1. Call server API to update process.env & firestore
      const res = await fetch('/api/configure-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scriptUrl.trim(), secret: secretKey.trim() })
      });
      const data = await res.json();

      // 2. Also write to firestore directly from client
      await setDoc(doc(db, 'system_settings', 'apps_script'), {
        url: scriptUrl.trim(),
        secret: secretKey.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      updateClientCachedWebhook({ url: scriptUrl.trim(), secret: secretKey.trim() });

      if (data.ok) {
        setConfigSuccess('Đã lưu cấu hình Google Apps Script Webhook thành công!');
      } else {
        setConfigSuccess('Đã lưu cài đặt. Hãy bấm nút "Gửi thư thử nghiệm" để kiểm tra kết nối.');
      }
    } catch (err) {
      // Direct Firestore write fallback
      await setDoc(doc(db, 'system_settings', 'apps_script'), {
        url: scriptUrl.trim(),
        secret: secretKey.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      updateClientCachedWebhook({ url: scriptUrl.trim(), secret: secretKey.trim() });
      setConfigSuccess('Đã lưu cấu hình Google Apps Script Webhook!');
    } finally {
      setIsConfigSaving(false);
    }
  };

  // Test Webhook
  const handleTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetEmail: userEmail,
          url: scriptUrl.trim(),
          secret: secretKey.trim()
        })
      });
      const data = await res.json();

      if (data.ok) {
        updateClientCachedWebhook({ url: scriptUrl.trim(), secret: secretKey.trim() });
        setTestResult({
          ok: true,
          message: `Gửi email thử nghiệm thành công! Vui lòng kiểm tra hộp thư đến của ${userEmail} và y-p@dymvietnam.net.`
        });
      } else {
        setTestResult({
          ok: false,
          message: `Lỗi kết nối Webhook: ${data.error || 'Vui lòng kiểm tra lại URL Web App và quyền truy cập (Anyone)'}`
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, message: `Không thể gọi tới máy chủ backend: ${msg}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="font-bold text-base">Hàng đợi & Cấu hình Gửi Email (Google Apps Script)</h3>
              <p className="text-xs text-blue-100">Miễn phí 100% • Tự động gửi tới người mượn và y-p@dymvietnam.net</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Nhật ký gửi email gần đây
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'config'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Cài đặt & Thử nghiệm Webhook
          </button>
        </div>

        {/* Tab 1: Logs */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Info callout */}
            <div className="p-4 bg-emerald-50 border-b border-emerald-200/70 text-xs text-emerald-950 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Cơ chế gửi qua Google Apps Script Webhook:</strong>
                <p className="mt-0.5 leading-relaxed text-emerald-800">
                  Mỗi khi mượn, trả hoặc quá giờ, backend sẽ gọi webhook của bạn. Nếu chưa nhận được email, vui lòng chuyển qua tab <strong>"Cài đặt & Thử nghiệm Webhook"</strong> để dán URL Web App và bấm <strong>"Gửi thử"</strong>.
                </p>
              </div>
            </div>

            {/* List */}
            <div className="p-4 flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Đang tải danh sách email đã ghi nhận...
                </div>
              ) : mailLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Chưa có email nào trong hàng đợi. Hãy thử mượn hoặc trả một thiết bị.
                </div>
              ) : (
                <div className="space-y-3">
                  {mailLogs.map((m) => {
                    const toList = Array.isArray(m.to) ? m.to.join(', ') : m.to;

                    return (
                      <div
                        key={m.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-400 transition-colors space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              m.type === 'borrow' 
                                ? 'bg-blue-100 text-blue-800' 
                                : m.type === 'return' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {m.type === 'borrow' ? 'MƯỢN' : m.type === 'return' ? 'TRẢ' : 'QUÁ GIỜ'}
                            </span>
                            <span className="font-bold text-slate-800">
                              {m.message?.subject || 'Không có tiêu đề'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">ID: {m.id.slice(0, 8)}...</span>
                        </div>

                        <div className="text-slate-600">
                          <strong>Người nhận (To):</strong> <span className="font-mono text-blue-700 font-semibold">{toList || 'Người mượn'}</span>
                          <span className="text-slate-400 ml-2">(+ tự động gửi tới y-p@dymvietnam.net)</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Đã chuyển tiếp qua Backend Webhook</span>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Đã gửi lệnh Webhook
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Config & Test */}
        {activeTab === 'config' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Cấu hình Google Apps Script Webhook (Dành cho Quản trị viên)
              </h4>
              <p className="text-slate-600">
                Nếu bạn chưa cấu hình biến môi trường trên server, bạn có thể dán trực tiếp URL Web App của bạn vào đây. Hệ thống sẽ lưu trữ và tự động sử dụng URL này để gửi mail:
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  1. Google Apps Script Web App URL (Bắt buộc):
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * URL có đuôi <code>/exec</code> nhận được sau khi bấm "Triển khai mới (New deployment) &gt; Ứng dụng web" trên script.google.com.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  2. Mã bí mật (Secret Key):
                </label>
                <input
                  type="text"
                  required
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * Mặc định là <code>DYM_VIETNAM_DEVICE_SECRET</code> (khớp với biến SECRET_KEY trong Google Apps Script).
                </span>
              </div>

              {configSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{configSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isConfigSaving || !scriptUrl.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isConfigSaving ? 'Đang lưu...' : 'Lưu cấu hình Webhook'}
                </button>

                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTesting || !scriptUrl.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang gửi thử...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Gửi thử 1 email kiểm tra ngay
                    </>
                  )}
                </button>
              </div>
            </form>

            {testResult && (
              <div className={`p-4 rounded-xl border flex items-start gap-2.5 animate-in fade-in ${
                testResult.ok 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.ok ? 'Thành công!' : 'Chưa thành công'}</div>
                  <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Trực tiếp gọi Webhook từ Backend Server không thông qua trung gian
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
