# HƯỚNG DẪN CẤU HÌNH VÀ DEPLOY FIREBASE CHO HỆ THỐNG MƯỢN THIẾT BỊ DYM VIETNAM

## 1. Firebase Authentication (Google Sign-In)
- Vào [Firebase Console](https://console.firebase.google.com/) -> Project `gen-lang-client-0029147898`.
- Mục **Authentication** -> **Sign-in method** -> Kích hoạt **Google**.
- Thêm domain được cấp phép (Authorized Domains):
  - `localhost`
  - Các domain Cloud Run của ứng dụng (ví dụ `*.run.app`).

## 2. Firestore Database & Security Rules
- Rules đã được triển khai sẵn trong tệp `firestore.rules`.
- Lệnh deploy rules bất kỳ lúc nào:
  ```bash
  firebase deploy --only firestore:rules
  ```
- Kiểm tra danh sách người dùng được phép (47 nhân viên DYM Vietnam) trong collection `users`.
- Mật khẩu Laptop được lưu trong document `settings/laptop` với field `{ password: "976431" }`.

## 3. Firebase Storage (Lưu trữ ảnh hoàn trả thiết bị)
- Vào mục **Storage** trong Firebase Console -> **Get Started**.
- Cấu hình Storage Rules cho phép upload:
  ```
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /returns/{allPaths=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

## 4. Gửi email thông báo tự động (2 Phương án)
Mỗi email gửi đi luôn gửi tới 2 người nhận: email người mượn và `y-p@dymvietnam.net`.

### Phương án A: Dùng Firebase Extension "Trigger Email" (Khuyên dùng)
1. Trong Firebase Console, vào **Extensions** -> Tìm **Trigger Email from Firestore**.
2. Cấu hình SMTP (Resend, SendGrid, Mailgun hoặc Gmail App Password).
3. Đặt collection lắng nghe là `mail`. Ứng dụng đã được lập trình sẵn để tự động đẩy yêu cầu gửi mail vào collection `mail`.

### Phương án B: Cloud Functions v2 + Cloud Scheduler (Quét quá giờ mỗi 5 phút)
1. Thư mục `functions/index.js` lắng nghe `every 5 minutes`.
2. Kiểm tra các bản ghi `isReturned == false` và thời gian kết thúc đã qua thời điểm hiện tại.
3. Gửi email cảnh báo quá giờ và gắn cờ `overdueNotified: true`.
4. Deploy function:
   ```bash
   firebase deploy --only functions
   ```
