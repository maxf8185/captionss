import subprocess
import os
import imageio_ffmpeg
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

subprocess.run([ffmpeg_exe, '-y', '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:d=1', 'dummy.mp4'], check=True)

with open('dummy.ass', 'w', encoding='utf-8') as f:
    f.write('''[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,50,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,5,10,10,50,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,Hello World
''')

abs_ass = os.path.abspath('dummy.ass').replace('\\', '/').replace(':', '\\:')
abs_fonts = os.path.abspath('.').replace('\\', '/').replace(':', '\\:')

cmd = [
    ffmpeg_exe, '-y', '-i', 'dummy.mp4',
    '-filter_complex', f"[0:v]ass='{abs_ass}':fontsdir='{abs_fonts}',format=yuv420p,pad=ceil(iw/2)*2:ceil(ih/2)*2[outv]",
    '-map', '[outv]', '-map', '0:a?',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast',
    '-c:a', 'copy',
    'out.mp4'
]
print('Running:', ' '.join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True)
print('Return code:', res.returncode)
print('Stderr:', res.stderr[-1500:])
