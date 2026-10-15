import os
import json
import base64
import requests
import streamlit as st
import streamlit.components.v1 as components

# ==============================================================================
# 1. การตั้งค่าหน้าเว็บ Streamlit (Page Configuration)
# ==============================================================================
st.set_page_config(
    page_title="ระบบบันทึกวันลา - สำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน",
    page_icon="📅",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ==============================================================================
# 2. ปรับแต่ง CSS เพื่อให้แสดงผล React App เต็มหน้าจอ (Full Viewport) สวยงาม
# ==============================================================================
st.markdown("""
<style>
    /* ซ่อน Header และ Footer ดั้งเดิมของ Streamlit */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .block-container {
        padding: 0rem 0.2rem !important;
        max-width: 100% !important;
    }
    iframe {
        width: 100% !important;
        border: none !important;
        border-radius: 12px;
        box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
    }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# 3. กำหนดค่าเส้นทางไฟล์และ GitHub Repository สำหรับบันทึกข้อมูลถาวร
# ==============================================================================
base_dir = os.path.dirname(os.path.abspath(__file__))
records_file = os.path.join(base_dir, "records.json")

GITHUB_REPO = "okkokk09/WanLaCPDMSH"  # ที่อยู่ Repository บน GitHub
GITHUB_BRANCH = "main"                  # สาขาที่ต้องการบันทึกข้อมูล
GITHUB_FILE_PATH = "records.json"       # ชื่อไฟล์ประวัติการลาบน GitHub

def get_github_token():
    """
    ดึง Personal Access Token จาก Streamlit Secrets หรือ Environment Variable
    เพื่อนำไปใช้ยืนยันตัวตนกับ GitHub REST API
    """
    try:
        if "GITHUB_TOKEN" in st.secrets:
            return st.secrets["GITHUB_TOKEN"]
    except Exception:
        pass
    return os.environ.get("GITHUB_TOKEN", None)

def load_records():
    """
    โหลดข้อมูลประวัติการลาจากไฟล์ records.json ในเครื่องเซิร์ฟเวอร์
    หากไม่พบไฟล์หรือไฟล์เสียหาย จะคืนค่าเป็นรายการว่าง []
    """
    if os.path.exists(records_file):
        try:
            with open(records_file, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            st.error(f"เกิดข้อผิดพลาดในการโหลดไฟล์ records.json: {e}")
    return []

def save_records_locally(records):
    """
    บันทึกข้อมูลประวัติการลาลงไฟล์ records.json ในเครื่องเซิร์ฟเวอร์
    """
    try:
        with open(records_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        st.error(f"ไม่สามารถบันทึก records.json ในเครื่องได้: {e}")
        return False

def commit_to_github(records):
    """
    บันทึกและส่งข้อมูล (Commit & Push) ไฟล์ records.json ขึ้น GitHub Repository ผ่าน GitHub REST API
    ทำให้ข้อมูลคงอยู่ถาวรแม้ Streamlit Cloud จะ Reboot หรือ Sleep
    """
    token = get_github_token()
    if not token:
        return False, "ยังไม่ได้ตั้งค่า GITHUB_TOKEN ใน Streamlit Secrets"

    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_FILE_PATH}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Streamlit-Leave-System"
    }

    # 1. ตรวจสอบ SHA ของไฟล์เดิมบน GitHub เพื่อนำมาใช้ในการอัปเดต (ป้องกัน Concurrency Conflict)
    sha = None
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            sha = res.json().get("sha")
    except Exception as e:
        return False, f"เชื่อมต่อ GitHub ไม่สำเร็จ: {e}"

    # 2. แปลงเนื้อหา JSON เป็น Base64 ตามข้อกำหนดของ GitHub API
    content_str = json.dumps(records, ensure_ascii=False, indent=2)
    b64_content = base64.b64encode(content_str.encode("utf-8")).decode("utf-8")

    # 3. เตรียม Payload สำหรับการ Commit
    payload = {
        "message": f"Auto-update leave records ({len(records)} records) [skip ci]",
        "content": b64_content,
        "branch": GITHUB_BRANCH
    }
    if sha:
        payload["sha"] = sha

    # 4. ส่งคำขอ PUT ไปยัง GitHub เพื่อบันทึกไฟล์
    try:
        put_res = requests.put(url, headers=headers, json=payload, timeout=15)
        if put_res.status_code in [200, 201]:
            return True, "อัปเดตข้อมูลขึ้น GitHub สำเร็จแล้ว"
        else:
            return False, f"GitHub Error {put_res.status_code}: {put_res.text}"
    except Exception as e:
        return False, f"เกิดข้อผิดพลาดในการส่งข้อมูลไป GitHub: {e}"

# ==============================================================================
# 4. จัดการสถานะเซสชัน (State Management)
# ==============================================================================
if "records" not in st.session_state:
    st.session_state["records"] = load_records()

if "last_processed_ts" not in st.session_state:
    st.session_state["last_processed_ts"] = None

github_token = get_github_token()
has_github_token = bool(github_token)

# ==============================================================================
# 5. แถบด้านข้าง (Sidebar) แสดงสถานะการเชื่อมต่อ และวิธีตั้งค่า Token
# ==============================================================================
with st.sidebar:
    st.header("☁️ สถานะการซิงก์ข้อมูลกลาง")
    if has_github_token:
        st.success(f"เชื่อมต่อ GitHub สำเร็จ: **{GITHUB_REPO}**")
        st.caption(f"สาขา: `{GITHUB_BRANCH}` | ประวัติการลา: {len(st.session_state['records'])} รายการ")
    else:
        st.warning("ยังไม่ได้ตั้งค่า `GITHUB_TOKEN` ใน Secrets")
        st.markdown("""
        **วิธีเปิดใช้งาน Auto-Commit บน Streamlit Cloud:**
        1. ไปที่ Dashboard ของ Streamlit Cloud
        2. กดเมนู **App Settings** -> **Secrets**
        3. เพิ่มบรรทัดนี้:
        ```toml
        GITHUB_TOKEN = "ghp_your_token_here"
        ```
        4. กด **Save** ระบบจะซิงก์ขึ้น GitHub อัตโนมัติถาวรทันที!
        """)

# ==============================================================================
# 6. แสดงผล React Component ผ่าน Iframe และรับ Event จาก React
# ==============================================================================
dist_dir = os.path.join(base_dir, "dist")
dist_index = os.path.join(dist_dir, "index.html")

if os.path.exists(dist_index):
    # ประกาศ Custom Component จากโฟลเดอร์ dist ที่ Build แล้ว
    leave_app_component = components.declare_component("leave_system", path=dist_dir)
    # ส่งข้อมูล records และ hasGithubToken เข้าไปใน React App
    component_value = leave_app_component(
        records=st.session_state["records"],
        hasGithubToken=has_github_token,
        key="leave_system_app"
    )

    # ดักรับข้อความเมื่อผู้ใช้บันทึกหรือลบข้อมูลการลาใน React App
    if component_value and isinstance(component_value, dict):
        action = component_value.get("action")
        timestamp = component_value.get("timestamp")

        # ตรวจสอบว่าเป็นการบันทึกใหม่และยังไม่ได้ประมวลผลซ้ำ
        if action == "SAVE_RECORDS" and timestamp != st.session_state["last_processed_ts"]:
            st.session_state["last_processed_ts"] = timestamp
            new_records = component_value.get("records", [])
            st.session_state["records"] = new_records

            # บันทึกลงเครื่องเซิร์ฟเวอร์
            save_records_locally(new_records)

            # Auto-commit ขึ้น GitHub ทันทีถ้ามี Token
            if has_github_token:
                success, msg = commit_to_github(new_records)
                if success:
                    st.toast("✅ บันทึกข้อมูลและซิงก์ขึ้น GitHub เรียบร้อยแล้ว", icon="☁️")
                else:
                    st.toast(f"⚠️ บันทึกในเครื่องแล้ว แต่ซิงก์ GitHub ไม่สำเร็จ: {msg}", icon="⚠️")
            else:
                st.toast("ℹ️ บันทึกในเซิร์ฟเวอร์เรียบร้อยแล้ว (โปรดตั้งค่า GITHUB_TOKEN เพื่อบันทึกถาวร)", icon="💾")

            st.rerun()

else:
    # กรณีไม่ได้ Build โฟลเดอร์ dist ให้แสดง standalone.html สำรอง
    html_file = os.path.join(base_dir, "standalone.html")
    if os.path.exists(html_file):
        with open(html_file, "r", encoding="utf-8") as f:
            html_content = f.read()
        components.html(html_content, height=1200, scrolling=True)
    else:
        st.error("ไม่พบไฟล์ระบบ กรุณารัน npm run build ก่อน")

