import os
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="ระบบบันทึกวันลา - สำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน",
    page_icon="📅",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom Styling to maximize viewport
st.markdown("""
<style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .block-container {
        padding: 0.5rem 0.5rem !important;
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

# Load standalone HTML
base_dir = os.path.dirname(os.path.abspath(__file__))
html_file = os.path.join(base_dir, "standalone.html")

if not os.path.exists(html_file):
    dist_html = os.path.join(base_dir, "dist", "standalone.html")
    if os.path.exists(dist_html):
        html_file = dist_html

if os.path.exists(html_file):
    with open(html_file, "r", encoding="utf-8") as f:
        html_content = f.read()
    components.html(html_content, height=1200, scrolling=True)
else:
    st.error("ไม่พบไฟล์ระบบ (standalone.html) กรุณาตรวจสอบไฟล์ในโฟลเดอร์โครงการ")
