import threading
import time
import uvicorn
import multiprocessing
import webbrowser
import os
import sys
import tkinter as tk
from main import app

def start_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

def open_browser():
    url = 'http://127.0.0.1:8000'
    time.sleep(2)
    
    # Try to open as a standalone app window (looks native)
    opened = False
    try:
        chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if os.path.exists(chrome_path):
            os.system(f'"{chrome_path}" --app={url}')
            opened = True
        elif os.path.exists(edge_path):
            os.system(f'"{edge_path}" --app={url}')
            opened = True
    except:
        pass
        
    if not opened:
        webbrowser.open(url)

if __name__ == '__main__':
    multiprocessing.freeze_support()
    
    # Run the server in a separate thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Open browser in a separate thread
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Create a small control window using built-in Tkinter
    root = tk.Tk()
    root.title("AutoCaps")
    root.geometry("350x150")
    
    # Try to center the window safely
    try:
        root.eval('tk::PlaceWindow . center')
    except:
        pass
    
    label = tk.Label(root, text="AutoCaps Server is Running!\n\nYour app has opened in a browser window.\nClose THIS window to fully exit the program.", justify="center", pady=15)
    label.pack()
    
    btn = tk.Button(root, text="Open App UI Again", command=lambda: webbrowser.open("http://127.0.0.1:8000"))
    btn.pack()
    
    # Blocks until closed
    root.mainloop()
    
    # Exit cleanly
    sys.exit(0)
