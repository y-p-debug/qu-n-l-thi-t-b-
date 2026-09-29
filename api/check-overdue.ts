import { getDb, formatDateDisplay, sendViaGoogleAppsScript } from './_shared.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify CRON_SECRET if configured in Vercel Environment Variables
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (expectedSecret) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const querySecret = req.query?.secret || '';

    if (token !== expectedSecret && querySecret !== expectedSecret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid CRON_SECRET' });
    }
  }

  try {
    const db = getDb();
    const now = new Date();
    const bookingsCol = collection(db, 'bookings');
    const q = query(
      bookingsCol,
      where('isReturned', '==', false),
      where('overdueNotified', '==', false)
    );

    const snapshot = await getDocs(q);
    let notifiedCount = 0;

    for (const d of snapshot.docs) {
      const b = d.data();
      if (!b.date || !b.endTime) continue;

      const [year, month, day] = b.date.split('-').map(Number);
      const [hour, min] = b.endTime.split(':').map(Number);
      const endDateTime = new Date(year, month - 1, day, hour, min, 0);

      if (now.getTime() > endDateTime.getTime()) {
        const formattedDate = formatDateDisplay(b.date);
        const timeRange = `${b.startTime} - ${b.endTime}`;
        const subject = `[QUÁ GIỜ] ${b.device}`;

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07);">
            <div style="background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%); color: #ffffff; padding: 20px 24px;">
              <div style="font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Hệ thống Quản lý mượn thiết bị • DYM Vietnam</div>
              <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                ⚠️ CẢNH BÁO QUÁ GIỜ MƯỢN THIẾT BỊ
              </h2>
            </div>
            <div style="padding: 20px 24px; background-color: #fff1f2; border-bottom: 1px solid #fecdd3;">
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #991b1b; line-height: 1.6;">
                Ngày ${formattedDate} bạn ${b.registrantName} đã mượn quá giờ ${b.device} và khung giờ ${timeRange}
              </p>
            </div>
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
                    <th style="padding: 12px 14px; border: 1px solid #e2e8f0; text-align: center;">TRẢ LẠI 返却</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background-color: #fff1f2;">
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0; font-weight: 600; white-space: nowrap;">${formattedDate}</td>
                    <td style="padding: 12px 10px; border: 1px solid #e2e8f0; white-space: nowrap;">⏰ ${b.startTime}</td>
                    <td style="padding: 12px 10px; border: 1px solid #e2e8f0; white-space: nowrap;">⏰ ${b.endTime}</td>
                    <td style="padding: 12px 12px; border: 1px solid #e2e8f0; font-weight: 700; color: #b91c1c;">${b.device}</td>
                    <td style="padding: 12px 10px; border: 1px solid #e2e8f0;">${b.team}</td>
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0;">
                      <div style="font-weight: 700; color: #0f172a;">${b.registrantName}</div>
                      <div style="font-size: 11px; color: #64748b;">${b.registrantEmail}</div>
                    </td>
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0;">${b.purpose || '-'}</td>
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0; text-align: center;">
                      <span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">QUÁ GIỜ CHƯA TRẢ</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style="margin-top: 16px; padding: 12px 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 13px;">
                Vui lòng đặt thiết bị về đúng vị trí và vào hệ thống bấm <strong>"Trả thiết bị"</strong> kèm hình ảnh chụp để hoàn tất.
              </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
              Hệ thống Quản lý mượn thiết bị • DYM Vietnam Co., Ltd.
            </div>
          </div>
        `;

        const borrowerEmail = (b.registrantEmail || '').trim();
        const toList = borrowerEmail ? [borrowerEmail] : [];

        const sendResult = await sendViaGoogleAppsScript({
          to: toList,
          subject,
          html
        });

        // Mark overdueNotified: true so it only notifies once per overdue booking
        if (sendResult.ok) {
          await updateDoc(doc(db, 'bookings', d.id), {
            overdueNotified: true,
            overdueNotifiedAt: new Date().toISOString()
          });
          notifiedCount++;
        }
      }
    }

    return res.json({ ok: true, checked: snapshot.docs.length, notified: notifiedCount });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[CHECK OVERDUE ERROR]:', errMsg);
    return res.status(500).json({ ok: false, error: errMsg });
  }
}
