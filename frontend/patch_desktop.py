import os

def patch_layout():
    path = "src/app/layout.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("import { ClerkProvider } from '@clerk/nextjs';", "")
    content = content.replace("<ClerkProvider>", "")
    content = content.replace("</ClerkProvider>", "")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def patch_page():
    import re
    path = "src/app/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    content = re.sub(r'import\s+\{.*?\}\s+from\s+["\']@clerk/nextjs["\'];', "", content)
    content = content.replace("const { userId } = useAuth();", "const userId = 'desktop';")
    content = content.replace("<UserButton />", "")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def patch_next_config():
    path = "next.config.ts"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    # add output: 'export',
    content = content.replace("const nextConfig: NextConfig = {", "const nextConfig: NextConfig = {\n  output: 'export',")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def main():
    if os.environ.get("DESKTOP_BUILD") == "true":
        print("Patching Next.js for Desktop build (removing Clerk and forcing export)")
        patch_layout()
        patch_page()
        patch_next_config()
        if os.path.exists("src/middleware.ts"):
            os.remove("src/middleware.ts")
            
        # Remove @clerk/nextjs from package.json to prevent Next.js from complaining
        import json
        with open("package.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        if "@clerk/nextjs" in data.get("dependencies", {}):
            del data["dependencies"]["@clerk/nextjs"]
        with open("package.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

if __name__ == "__main__":
    main()
