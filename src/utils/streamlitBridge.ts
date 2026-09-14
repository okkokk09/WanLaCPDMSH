import type { LeaveRecord } from '../types';

export interface StreamlitArgs {
  records?: LeaveRecord[];
  githubSynced?: boolean;
  githubMessage?: string;
  hasGithubToken?: boolean;
}

type RenderCallback = (args: StreamlitArgs) => void;

let isComponentReadySent = false;
const renderListeners: RenderCallback[] = [];

export function isRunningInStreamlit(): boolean {
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

export function initStreamlitBridge(onRender: RenderCallback): () => void {
  renderListeners.push(onRender);

  const handleMessage = (event: MessageEvent) => {
    if (!event.data) return;
    if (event.data.type === 'streamlit:render') {
      const args: StreamlitArgs = event.data.args || {};
      renderListeners.forEach((cb) => cb(args));
      setStreamlitFrameHeight();
    }
  };

  window.addEventListener('message', handleMessage);

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
      // safe fallback
    }
  }

  // Initial frame height
  setStreamlitFrameHeight(1200);

  return () => {
    window.removeEventListener('message', handleMessage);
    const idx = renderListeners.indexOf(onRender);
    if (idx !== -1) renderListeners.splice(idx, 1);
  };
}

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
    // safe fallback
  }
}
