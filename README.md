# BLE Grade

แอป Expo (Android) สำหรับงาน Bluetooth LE: เชื่อมต่ออุปกรณ์ของอาจารย์ → อ่านค่า Characteristic → เขียนชื่อตัวเองและบัดดี้ → อ่านค่าอีกครั้งเพื่อดูเกรดที่ทำนาย

| | UUID |
|---|---|
| Service | `aee04821-1973-4e1f-a590-e84b10d580e7` |
| Characteristic | `cde07b1a-889b-44b7-a99f-c888dddac729` |

## รันแอป

แอปใช้ `react-native-ble-plx` ซึ่งเป็น native module จึง **เปิดใน Expo Go ไม่ได้** ต้อง build ลงมือถือ Android ที่ต่อ USB และเปิด USB debugging ไว้

```bash
npm run android
```

คำสั่งนี้สร้าง debug build และเปิด Metro ไว้ แก้โค้ด JS แล้วเห็นผลทันที

```bash
npm run android:release
```

คำสั่งนี้สร้าง APK แบบ standalone ที่ไม่ต้องต่อคอมพิวเตอร์ ใช้ในห้องเรียน ไฟล์อยู่ที่ `android/app/build/outputs/apk/release/app-release.apk`

ถ้าแก้ `app.json` (permission หรือ plugin) ต้องรัน `npx expo prebuild --clean` แล้ว build ใหม่

ถ้า build ล้มที่ `configureCMake...` พร้อมข้อความ `A restricted method in java.lang.System has been called` แปลว่ากำลังใช้ Java 24 ให้ชี้ `JAVA_HOME` ไปที่ JDK 21 ของ Android Studio (`C:\Program Files\Android\Android Studio\jbr`) ก่อน build

### ทดสอบบนเว็บ

`npx expo start` แล้วกด `w` เบราว์เซอร์ใช้ `react-native-ble-plx` ไม่ได้ เวอร์ชันเว็บจึงคุยกับ **อุปกรณ์จำลอง** (`src/ble/transport.web.ts`) ที่ทำงานเหมือนเครื่องอาจารย์ ใช้ดูหน้าจอและ flow เท่านั้น ส่งงานต้องใช้แอป Android กับอุปกรณ์จริง

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `src/ble/constants.ts` | UUID, เวลาสแกน, timeout |
| `src/ble/use-ble.ts` | state ของแอป: สแกน, เชื่อมต่อ, อ่าน, เขียน, ตัดการเชื่อมต่อ |
| `src/ble/transport.ts` | คุยกับ BLE จริงผ่าน `react-native-ble-plx` และตรวจว่ามี Service/Characteristic |
| `src/ble/transport.web.ts` | อุปกรณ์จำลองสำหรับเวอร์ชันเว็บ |
| `src/ble/model.ts` | type ที่ใช้ร่วมกัน |
| `src/ble/permissions.ts` | ขอสิทธิ์ Nearby devices / Location ของ Android |
| `src/ble/codec.ts` | แปลงข้อความ ↔ Base64 (UTF-8) |
| `src/ble/errors.ts` | error ที่แสดงให้ผู้ใช้ พร้อมบอกหน้า Settings ที่แก้ได้ |
| `src/components/scan-view.tsx` | หน้าสแกนอุปกรณ์ |
| `src/components/device-view.tsx` | หน้าอุปกรณ์ 3 ขั้น: Read → Write → Read again |

## วันใช้งานจริง

- เปิด **Bluetooth และ Location** ถ้า Location ปิด Android จะไม่ส่งผลสแกนให้แอป
- อุปกรณ์ที่ประกาศ Service ตรงกับที่ต้องการจะมีเครื่องหมาย ✓ และอยู่บนสุดของรายการ
- ทำให้จบเร็ว (Read → Write → Read again → แคปจอ) แล้วกด Disconnect หรือปุ่ม Back ให้เพื่อนต่อ
- ภาพที่ต้องแคป: รายการสแกนที่เจออุปกรณ์, ผล Read ครั้งแรก, Alert เขียนสำเร็จ, ผล Read ครั้งที่ 2 (เกรด)
