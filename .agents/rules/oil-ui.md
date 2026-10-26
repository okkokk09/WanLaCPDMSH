# Rule & Knowledge: oil-ui Component Library Integration

คุณมีความรู้ความเชี่ยวชาญเกี่ยวกับ UI Library ที่ชื่อว่า `oil-ui` (อ้างอิง: https://github.com/oil-oil/oil-ui) และต้องปฏิบัติตามข้อกำหนดการใช้งานดังนี้ทุกครั้งที่มีการเรียกใช้หรือเขียนโค้ดที่เกี่ยวข้อง:

## 1. จุดประสงค์และการใช้งาน (Core Purpose)
- `oil-ui` คือคลังคอมโพเนนต์สำหรับสร้าง User Interface บนเว็บแอปพลิเคชัน
- ใช้เพื่อจัดระเบียบโครงสร้างหน้าเว็บ, สร้างฟอร์ม, จัดวางเลย์เอาต์ และคุมมาตรฐาน Design System

## 2. วิธีการติดตั้ง (Installation Pattern)
- ติดตั้งผ่าน Package Manager จาก Repository หรือ Registry:
  - ผ่าน npm: `npm install github:oil-oil/oil-ui` (หรือ `npm install oil-ui`)
  - ผ่าน yarn: `yarn add github:oil-oil/oil-ui`

## 3. หลักการเขียนโค้ดและเรียกใช้ (Implementation Rules)
- นำเข้าคอมโพเนนต์แบบ Destructuring จากแพ็กเกจเสมอ เช่น:
  ```typescript
  import { Button, Input, Modal, Table } from 'oil-ui';
  ```
- ตรวจสอบและนำเข้าไฟล์ Global Styles หรือ CSS ของ Library เข้ามาที่ Root ของโปรเจกต์เสมอ:
  ```typescript
  import 'oil-ui/dist/index.css';
  ```
- ในการออกแบบ UI ให้จัดลำดับความสำคัญของ Props ตามมาตรฐาน:
  - `variant` / `type`: สำหรับระบุสถานะ เช่น `primary`, `secondary`, `outline`, `danger`
  - `size`: กำหนดขนาด เช่น `sm`, `md`, `lg`
  - `disabled` / `loading`: ควบคุมสถานะการทำงาน
  - `onClick` / `onChange`: ผูก Event Handlers ตามมาตรฐาน Front-end

## 4. แนวทางการให้คำแนะนำ (Behavioral Directive)
- เมื่อผู้ใช้ขอให้สร้างหน้าเว็บหรือฟีเจอร์ใหม่โดยใช้ `oil-ui` ให้เขียนโค้ดสำเร็จรูปที่พร้อมรัน (Production-ready)
- ไม่สร้างคอมโพเนนต์พื้นฐานขึ้นมาซ้ำซ้อนเอง ให้ดึงคอมโพเนนต์จาก `oil-ui` มาประกอบเป็นหลัก
- หากมี Custom Theme หรือ Component พิเศษที่ผู้ใช้นิยามเพิ่มเติม ให้ปรับแต่งต่อยอดบนโครงสร้างเดิมของ `oil-ui` เสมอ
