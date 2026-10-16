var __defProp=Object.defineProperty;var __name=(target,value)=>__defProp(target,"name",{value,configurable:true});import{getDb,formatDateDisplay,sendViaGoogleAppsScript}from"./_shared.js";import{collection,query,where,getDocs,updateDoc,doc}from"firebase/firestore";async function handler(req,res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");if(req.method==="OPTIONS"){return res.status(200).end()}const expectedSecret=process.env.CRON_SECRET?.trim();if(expectedSecret){const authHeader=req.headers.authorization||"";const token=authHeader.replace(/^Bearer\s+/i,"").trim();const querySecret=req.query?.secret||"";if(token!==expectedSecret&&querySecret!==expectedSecret){return res.status(401).json({ok:false,error:"Unauthorized: Invalid CRON_SECRET"})}}try{const db=getDb();const now=new Date;const bookingsCol=collection(db,"bookings");const q=query(bookingsCol,where("isReturned","==",false),where("overdueNotified","==",false));const snapshot=await getDocs(q);let notifiedCount=0;for(const d of snapshot.docs){const b=d.data();if(!b.date||!b.endTime)continue;const[year,month,day]=b.date.split("-").map(Number);const[hour,min]=b.endTime.split(":").map(Number);const endDateTime=new Date(year,month-1,day,hour,min,0);if(now.getTime()>endDateTime.getTime()){const formattedDate=formatDateDisplay(b.date);const timeRange=`${b.startTime} - ${b.endTime}`;const subject=`[QU\xC1 GI\u1EDC] ${b.device}`;const html=`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07);">
            <div style="background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%); color: #ffffff; padding: 20px 24px;">
              <div style="font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">H\u1EC7 th\u1ED1ng Qu\u1EA3n l\xFD m\u01B0\u1EE3n thi\u1EBFt b\u1ECB \u2022 DYM Vietnam</div>
              <h2 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                \u26A0\uFE0F C\u1EA2NH B\xC1O QU\xC1 GI\u1EDC M\u01AF\u1EE2N THI\u1EBET B\u1ECA
              </h2>
            </div>
            <div style="padding: 20px 24px; background-color: #fff1f2; border-bottom: 1px solid #fecdd3;">
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #991b1b; line-height: 1.6;">
                Ng\xE0y ${formattedDate} b\u1EA1n ${b.registrantName} \u0111\xE3 m\u01B0\u1EE3n qu\xE1 gi\u1EDD ${b.device} v\xE0 khung gi\u1EDD ${timeRange}
              </p>
            </div>
            <div style="padding: 24px; overflow-x: auto;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
                Chi ti\u1EBFt b\u1EA3n ghi m\u01B0\u1EE3n thi\u1EBFt b\u1ECB (Th\xF4ng tin \u0111\xEDnh k\xE8m):
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 12px 14px; border: 1px solid #e2e8f0;">NG\xC0Y \u65E5\u4ED8</th>
                    <th style="padding: 12px 10px; border: 1px solid #e2e8f0;">B\u1EAET \u0110\u1EA6U \u958B\u59CB</th>
                    <th style="padding: 12px 10px; border: 1px solid #e2e8f0;">K\u1EBET TH\xDAC \u7D42\u4E86</th>
                    <th style="padding: 12px 12px; border: 1px solid #e2e8f0;">THI\u1EBET B\u1ECA \u6A5F\u5668</th>
                    <th style="padding: 12px 10px; border: 1px solid #e2e8f0;">TEAM \u30C1\u30FC\u30E0</th>
                    <th style="padding: 12px 14px; border: 1px solid #e2e8f0;">NG\u01AF\u1EDCI \u0110\u0102NG K\xDD \u767B\u9332\u8005</th>
                    <th style="padding: 12px 14px; border: 1px solid #e2e8f0;">M\u1EE4C \u0110\xCDCH \u76EE\u7684</th>
                    <th style="padding: 12px 14px; border: 1px solid #e2e8f0; text-align: center;">TR\u1EA2 L\u1EA0I \u8FD4\u5374</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background-color: #fff1f2;">
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0; font-weight: 600; white-space: nowrap;">${formattedDate}</td>
                    <td style="padding: 12px 10px; border: 1px solid #e2e8f0; white-space: nowrap;">\u23F0 ${b.startTime}</td>
                    <td style="padding: 12px 10px; border: 1px solid #e2e8f0; white-space: nowrap;">\u23F0 ${b.endTime}</td>
                    <td style="padding: 12px 12px; border: 1px solid #e2e8f0; font-weight: 700; color: #b91c1c;">${b.device}</td>
                    <td style="padding: 12px 10px; border: 1px solid #e2e8f0;">${b.team}</td>
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0;">
                      <div style="font-weight: 700; color: #0f172a;">${b.registrantName}</div>
                      <div style="font-size: 11px; color: #64748b;">${b.registrantEmail}</div>
                    </td>
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0;">${b.purpose||"-"}</td>
                    <td style="padding: 12px 14px; border: 1px solid #e2e8f0; text-align: center;">
                      <span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px;">QU\xC1 GI\u1EDC CH\u01AFA TR\u1EA2</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style="margin-top: 16px; padding: 12px 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 13px;">
                Vui l\xF2ng \u0111\u1EB7t thi\u1EBFt b\u1ECB v\u1EC1 \u0111\xFAng v\u1ECB tr\xED v\xE0 v\xE0o h\u1EC7 th\u1ED1ng b\u1EA5m <strong>"Tr\u1EA3 thi\u1EBFt b\u1ECB"</strong> k\xE8m h\xECnh \u1EA3nh ch\u1EE5p \u0111\u1EC3 ho\xE0n t\u1EA5t.
              </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
              H\u1EC7 th\u1ED1ng Qu\u1EA3n l\xFD m\u01B0\u1EE3n thi\u1EBFt b\u1ECB \u2022 DYM Vietnam Co., Ltd.
            </div>
          </div>
        `;const borrowerEmail=(b.registrantEmail||"").trim();const toList=Array.from(new Set([borrowerEmail,"y-p@dymvietnam.net"].filter(Boolean)));const sendResult=await sendViaGoogleAppsScript({to:toList,subject,html});if(sendResult.ok){await updateDoc(doc(db,"bookings",d.id),{overdueNotified:true,overdueNotifiedAt:new Date().toISOString()});notifiedCount++}}}return res.json({ok:true,checked:snapshot.docs.length,notified:notifiedCount})}catch(err){const errMsg=err instanceof Error?err.message:String(err);console.error("[CHECK OVERDUE ERROR]:",errMsg);return res.status(500).json({ok:false,error:errMsg})}}__name(handler,"handler");export{handler as default};
