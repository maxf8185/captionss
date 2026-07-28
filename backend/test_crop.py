import subprocess
import imageio_ffmpeg
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

# Create a dummy video (1920x1080)
subprocess.run([ffmpeg_exe, '-y', '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:d=1', 'dummy.mp4'], check=True)

# Now run the crop filter on it, but with a crop outside its width (pretending it was rotated to 1080x1920)
# But wait, let's just pass an x offset that is larger than the input width!
cmd = [
    ffmpeg_exe, '-y', '-i', 'dummy.mp4',
    '-filter_complex', '[0:v]crop=607:1080:1313:0[v_crop]',
    '-map', '[v_crop]',
    'out.mp4'
]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Return Code:", res.returncode)
print("Stderr:", res.stderr[-500:])
