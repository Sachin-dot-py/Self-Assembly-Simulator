# Run the visualizations for all the gold nanoparticles examples.

import os
import subprocess

# Define the base directory and the codes
base_dir = "/root/production/api/temp/gold-nanoparticles"
codes = ["CA", "MPA", "MUA", "OCD", "OLY", "NONE"]
ratios = ["0.5", "1.0", "1.5"]

# Function to generate, run VMD, and create video with FFmpeg
def generate_video(code, ratio):
    # Set the directory path for the current code and ratio
    visual_dir = os.path.join(base_dir, f"Au_{code}_WAT", ratio)

    # Delete barplot.mp4 or clusters.mp4 in visual_dir if it exists
    mp4_file_path = os.path.join(visual_dir, "barplot.mp4")
    if os.path.exists(mp4_file_path):
        os.remove(mp4_file_path)
        print(f"Deleted {mp4_file_path}")
    mp4_file_path = os.path.join(visual_dir, "clusters.mp4")
    if os.path.exists(mp4_file_path):
        os.remove(mp4_file_path)
        print(f"Deleted {mp4_file_path}")

    # TODO: Combine .extension frames into two videos using FFmpeg
    # try:
    #     ffmpeg_command = ['/usr/bin/ffmpeg', '-framerate', '16', '-i', 'frame_%d.tga', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'barplot.mp4']
    #     subprocess.run(ffmpeg_command, cwd=visual_dir, check=True)
    #     print(f"Video generated successfully for {code} at ratio {ratio}")
    # except subprocess.CalledProcessError as e:
    #     print(f"Error generating video for {code} at ratio {ratio}: {e}")
    #     return
    
    # TODO & Optional: Remove all image files
    # try:
    #     for file in os.listdir(visual_dir):
    #         if file.endswith('.extension'):
    #             os.remove(os.path.join(visual_dir, file))
    #     print(f"Removed .extension files for {code} at ratio {ratio}")
    # except Exception as e:
    #     print(f"Error cleaning up .extension files for {code} at ratio {ratio}: {e}")

# Loop through each code and ratio combination
for code in codes:
    if code == "NONE":
        generate_video(code, "0.0")
        continue
    
    for ratio in ratios:
        generate_video(code, ratio)
