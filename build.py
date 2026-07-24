import os
import sys
import subprocess
import shutil

def run_command(cmd, cwd=None, env=None):
    print(f"Очікування виконання команди: {' '.join(cmd)}")
    process = subprocess.Popen(cmd, cwd=cwd, env=env, shell=sys.platform.startswith("win"))
    process.communicate()
    if process.returncode != 0:
        print(f"Помилка виконання команди: {' '.join(cmd)}")
        sys.exit(1)

def build_frontend():
    print("=== Збірка Frontend (Next.js) ===")
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    if not os.path.exists(frontend_dir):
        print("Папка frontend не знайдена!")
        sys.exit(1)
        
    run_command(["npm", "install"], cwd=frontend_dir)
    run_command(["npm", "run", "build"], cwd=frontend_dir)
    print("Frontend успішно зібрано.")

def build_backend(target_os):
    print("=== Збірка Backend та пакування в Executable ===")
    backend_dir = os.path.join(os.getcwd(), "backend")
    if not os.path.exists(backend_dir):
        print("Папка backend не знайдена!")
        sys.exit(1)

    # Визначаємо шлях до Python
    python_exe = sys.executable
    if sys.platform.startswith("win"):
        venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        if os.path.exists(venv_python):
            python_exe = venv_python
    else:
        venv_python = os.path.join(backend_dir, "venv", "bin", "python")
        if os.path.exists(venv_python):
            python_exe = venv_python

    print(f"Використовується Python: {python_exe}")

    # Встановлюємо pyinstaller
    run_command([python_exe, "-m", "pip", "install", "pyinstaller"], cwd=backend_dir)

    # Формуємо команду pyinstaller
    pyinstaller_cmd = [
        python_exe, "-m", "PyInstaller",
        "--noconfirm",
        "--windowed",
        "--name", "AutoCaps",
        "--collect-all", "faster_whisper",
        "--collect-all", "mediapipe",
    ]

    frontend_out = os.path.abspath(os.path.join("frontend", "out"))
    
    if target_os == "win":
        pyinstaller_cmd.extend(["--onedir"]) # Краще onedir для великих додатків на Windows
        pyinstaller_cmd.extend(["--add-data", f"{frontend_out};frontend/out"])
        icon_path = os.path.join(backend_dir, "logo.ico")
        if os.path.exists(icon_path):
            pyinstaller_cmd.extend(["--icon", icon_path])
    elif target_os == "mac":
        pyinstaller_cmd.extend(["--add-data", f"{frontend_out}:frontend/out"])
        # icon_path = os.path.join(backend_dir, "logo.icns")
        # if os.path.exists(icon_path):
        #     pyinstaller_cmd.extend(["--icon", icon_path])

    pyinstaller_cmd.append("desktop.py")
    
    run_command(pyinstaller_cmd, cwd=backend_dir)
    print(f"Додаток для {target_os} успішно зібрано. Шукайте в папці backend/dist/")
    
    if target_os == "win":
        # Спробуємо запустити Inno Setup, якщо він встановлений
        inno_path = r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
        installer_script = os.path.join(os.getcwd(), "installer.iss")
        if os.path.exists(inno_path) and os.path.exists(installer_script):
            print("=== Створення інсталятора через Inno Setup ===")
            run_command([inno_path, installer_script])
            print("Інсталятор успішно створено. Шукайте в папці release/")

def main():
    print("=== AutoCaps Build System ===")
    print("Оберіть платформу для збірки:")
    print("1. Windows (.exe та Інсталятор)")
    print("2. MacOS (.app)")
    
    choice = input("Ваш вибір (1/2): ").strip()
    
    if choice == "1":
        if not sys.platform.startswith("win"):
            print("ПОПЕРЕДЖЕННЯ: Ви намагаєтесь зібрати Windows додаток не на Windows.")
            print("PyInstaller не підтримує крос-компіляцію. Запустіть цей скрипт на Windows.")
            sys.exit(1)
        build_frontend()
        build_backend("win")
    elif choice == "2":
        if not sys.platform == "darwin":
            print("ПОПЕРЕДЖЕННЯ: Ви намагаєтесь зібрати MacOS додаток не на MacOS.")
            print("PyInstaller не підтримує крос-компіляцію. Запустіть цей скрипт на Mac.")
            sys.exit(1)
        build_frontend()
        build_backend("mac")
    else:
        print("Невірний вибір. Вихід.")
        sys.exit(1)

if __name__ == "__main__":
    main()
