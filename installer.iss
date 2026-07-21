[Setup]
AppName=AutoCaps
AppVersion=1.0.0
DefaultDirName={autopf}\AutoCaps
DefaultGroupName=AutoCaps
OutputDir=release
OutputBaseFilename=AutoCaps-Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest
DisableProgramGroupPage=yes

[Files]
Source: "backend\dist\AutoCaps\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\AutoCaps"; Filename: "{app}\AutoCaps.exe"
Name: "{autodesktop}\AutoCaps"; Filename: "{app}\AutoCaps.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
