import type { LeaveRecord } from '../types';

/**
 * โครงสร้างข้อมูล Arguments ที่ Streamlit ส่งมาให้ React ผ่านข้อความ 'streamlit:render'
 */
export interface StreamlitArgs {
  records?: LeaveRecord[];      // รายการประวัติการลาที่ดึงมาจาก records.json บนเซิร์ฟเวอร์
  githubSynced?: boolean;       // สถานะการบันทึก/Sync กับ GitHub สำเร็จหรือไม่
  githubMessage?: string;       // ข้อความแจ้งเตือนหรือข้อผิดพลาดจากการ Sync กับ GitHub
  hasGithubToken?: boolean;     // แจ้งว่าเซิร์ฟเวอร์มี GITHUB_TOKEN หรือไม่
}

/**
 * ชนิดฟังก์ชัน Callback สำหรับรับข้อมูลเมื่อ Streamlit สั่ง Render
 */
type RenderCallback = (args: StreamlitArgs) => void;

// ตัวแปรสถานะตรวจสอบว่าได้ส่งสัญญาณ 'streamlit:componentReady' ไปยังหน้าต่างแม่ (Parent Window) แล้วหรือยัง
let isComponentReadySent = false;
// รายการ Listener ที่รอรับข้อมูล render
const renderListeners: RenderCallback[] = [];

/**
 * ตรวจสอบว่าแอปพลิเคชันกำลังทำงานอยู่ภายใน iframe ของ Streamlit หรือไม่
 * @returns true หากรันอยู่ภายใน iframe, false หากรันบนเบราว์เซอร์ปกติแบบ standalone
 */
export function isRunningInStreamlit(): boolean {
  try {
    return window.parent !== window;
  } catch {
    return true; // หากเกิดข้อผิดพลาดด้าน Cross-origin ถือว่าอยู่ใต้ iframe
  }
}

/**
 * เริ่มต้นการเชื่อมต่อสื่อสารระหว่าง React iframe กับ Streamlit (PostMessage Bridge)
 * @param onRender Callback ที่จะถูกเรียกเมื่อได้รับข้อมูลใหม่จาก Streamlit
 * @returns ฟังก์ชันสำหรับยกเลิกการเชื่อมต่อ (Cleanup)
 */
export function initStreamlitBridge(onRender: RenderCallback): () => void {
  renderListeners.push(onRender);

  // ฟังก์ชันดักจับข้อความ window.message จาก Parent (Streamlit)
  const handleMessage = (event: MessageEvent) => {
    if (!event.data) return;
    if (event.data.type === 'streamlit:render') {
      const args: StreamlitArgs = event.data.args || {};
      // ส่งข้อมูลต่อไปยังทุก Listener ที่ลงทะเบียนไว้
      renderListeners.forEach((cb) => cb(args));
      // ปรับขนาดความสูงของ iframe อัตโนมัติหลัง Render
      setStreamlitFrameHeight();
    }
  };

  window.addEventListener('message', handleMessage);

  // หากเพิ่งโหลดเสร็จและยังไม่เคยส่งสัญญาณ ready ให้ส่งข้อความแจ้ง Streamlit ทันที
  if (!isComponentReadySent && isRunningInStreamlit()) {
    isComponentReadySent = true;
    try {
      window.parent.postMessage(
        {
          isStreamlitMessage: true,
          type: 'streamlit:componentReady',
          apiVersion: 1,
        },
        '*'
      );
    } catch {
      // ดักจับข้อผิดพลาดกรณีไม่สามารถส่ง postMessage ได้
    }
  }

  // ปรับความสูงเริ่มต้นของ iframe
  setStreamlitFrameHeight(1200);

  // คืนค่าฟังก์ชันสำหรับยกเลิก Event Listener เมื่อ Unmount
  return () => {
    window.removeEventListener('message', handleMessage);
    const idx = renderListeners.indexOf(onRender);
    if (idx !== -1) renderListeners.splice(idx, 1);
  };
}

/**
 * ส่งข้อมูลประวัติการลา (LeaveRecord[]) กลับไปยัง Python backend (Streamlit)
 * เพื่อนำไปบันทึกไฟล์ records.json และ Auto-commit ขึ้น GitHub Repository
 * @param records รายการประวัติการลาทั้งหมด
 */
export function sendRecordsToStreamlit(records: LeaveRecord[]): void {
  if (!isRunningInStreamlit()) return;
  try {
    window.parent.postMessage(
      {
        isStreamlitMessage: true,
        type: 'streamlit:setComponentValue',
        value: {
          action: 'SAVE_RECORDS',
          records,
          timestamp: Date.now(),
        },
      },
      '*'
    );
  } catch (err) {
    console.warn('Failed to send records to Streamlit:', err);
  }
}

/**
 * ปรับขนาดความสูงของ iframe บนหน้าจอ Streamlit แบบไดนามิกตามขนาดความสูงจริงของหน้าเว็บ
 * ช่วยป้องกันไม่ให้เกิดแถบเลื่อนซ้อน (Double scrollbars)
 * @param height ความสูงที่ต้องการกำหนด (เป็นพิกเซล) หากไม่ระบุจะคำนวณจาก scrollHeight
 */
export function setStreamlitFrameHeight(height?: number): void {
  if (!isRunningInStreamlit()) return;
  try {
    const h =
      height ||
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        1000
      );
    window.parent.postMessage(
      {
        isStreamlitMessage: true,
        type: 'streamlit:setFrameHeight',
        height: h + 40,
      },
      '*'
    );
  } catch {
    // ป้องกันกรณีเกิดข้อผิดพลาดด้าน Cross-origin
  }
}
