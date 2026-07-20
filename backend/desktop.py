import threading
import time
import webview
import uvicorn
from main import app

def start_server():
    # Start the FastAPI server
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

if __name__ == '__main__':
    # Run the server in a separate thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Wait a moment to ensure the server is up
    time.sleep(2)
    
    # Create the desktop window pointing to the local server
    window = webview.create_window('AutoCaps.ai - Subtitle Generator', 'http://127.0.0.1:8000', width=1280, height=800)
    
    # Start the webview application
    webview.start()
