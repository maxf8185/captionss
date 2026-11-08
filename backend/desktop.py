import multiprocessing
import os
import sys
import uvicorn
import webview
from main import app

class Api:
    def save_file_dialog(self, default_filename):
        try:
            window = webview.windows[0]
            result = window.create_file_dialog(
                webview.SAVE_DIALOG, 
                directory='', 
                save_filename=default_filename,
                file_types=('Video files (*.mp4;*.mov;*.mkv;*.webm)',)
            )
            if result and len(result) > 0:
                path = result[0] if isinstance(result, (list, tuple)) else result
                if not str(path).lower().endswith(('.mp4', '.mov', '.mkv', '.webm', '.avi')):
                    path = str(path) + '.mp4'
                return path
        except Exception as e:
            print("Error opening dialog:", e)
        return None

def setup_logging():
    if getattr(sys, 'frozen', False):
        log_dir = os.path.join(os.path.expanduser("~"), "AutoCapsData")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, "app.log")
        sys.stdout = open(log_path, 'w', encoding='utf-8')
        sys.stderr = sys.stdout

def start_server():
    setup_logging()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

if __name__ == '__main__':
    multiprocessing.freeze_support()
    setup_logging()
    
    # Run the server in a separate process to avoid signal errors
    server_process = multiprocessing.Process(target=start_server, daemon=True)
    server_process.start()
    
    # Start the pywebview window
    api = Api()
    webview.create_window('AutoCaps', 'http://127.0.0.1:8000', width=1280, height=800, js_api=api)
    webview.start()
    
    sys.exit(0)
