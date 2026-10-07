# 🇹🇭 Thai Heat Map

เว็บไซต์แผนที่ความร้อนประเทศไทย 77 จังหวัด

## โครงสร้าง
- `index.html` — หน้าเว็บหลัก
- `css/style.css` — รูปแบบ/Responsive
- `js/app.js` — แผนที่, การดึงข้อมูลอากาศ และการคำนวณ Heat Index
- `.github/workflows/deploy.yml` — deploy อัตโนมัติไป GitHub Pages

## แหล่งข้อมูลปัจจุบัน
- ขอบเขตจังหวัด: OpenGISData-Thailand GeoJSON
- อากาศ: Open-Meteo โดยใช้จุดกึ่งกลางจังหวัด

> หมายเหตุ: ข้อมูล Open-Meteo ในเวอร์ชันนี้เป็นข้อมูลแบบจำลอง ไม่ใช่ค่าจากสถานีตรวจอากาศของกรมอุตุนิยมวิทยาโดยตรง หากต้องการความแม่นยำระดับสถานี ควรเปลี่ยน data adapter ใน `js/app.js` ไปใช้ข้อมูลสถานี/AWS ของ TMD เมื่อมี endpoint/API ที่เหมาะสม

## Deploy
1. สร้าง GitHub repository เช่น `thai-heat-map`
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
3. ไปที่ Settings → Pages → Source → GitHub Actions
4. รอ workflow `Deploy Thai Heat Map` ทำงานสำเร็จ
5. เปิด URL ที่ GitHub แสดงใน Pages/Actions

หลังจากนั้นแก้ไฟล์ใน repository แล้ว push ไป `main` เว็บไซต์จะ deploy เวอร์ชันใหม่อัตโนมัติ
