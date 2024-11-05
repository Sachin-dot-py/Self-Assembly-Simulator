# Run the visualizations for all the gold nanoparticles examples.

import glob
import os
import subprocess

# Define the base directory and the codes
base_dir = "/root/production/api/temp/gold-nanoparticles"
codes = ["CA", "MPA", "MUA", "OCD", "OLY", "NONE"]
ratios = ["0.5", "1.0", "1.5"]

# Template for the VMD script
vmd_script_template = """
# Load the BGF structure
mol new Au_{code}_WAT.bgf autobonds off

# Load the LAMMPSTRJ trajectory
mol addfile Au_{code}_WAT.visualization.lammpstrj type lammpstrj first 0 last -1 step 1 waitfor all

# Check if the molecule and trajectory are loaded correctly
set mol_id [molinfo top]
if {{ $mol_id == -1 }} {{
    puts "Error: Molecule failed to load."
    exit
}}

set num_frames [molinfo top get numframes]
if {{ $num_frames == 0 }} {{
    puts "Error: Trajectory failed to load."
    exit
}}

puts "Molecule and trajectory loaded successfully."

# Select atoms excluding water
set sel [atomselect top "not resname WAT"]

# Set up the representation for the selected atoms
mol representation VDW
mol color Name
mol selection "not resname WAT"
mol addrep top

# Set up the display
display resetview
display resize 1920 1080

# Zoom in by factor 3.6
display projection orthographic
display scale 3.6

# Define variables for rotation
set rotation_step [expr {{360 / ($num_frames / 10)}}] 
set rotation_angle 0

# Loop over trajectory frames and render each one as an image
for {{set i 0}} {{$i < $num_frames}} {{incr i 5}} {{
    animate goto $i
    rotate y by $rotation_step
    incr rotation_angle $rotation_step
    set new_index [expr {{$i / 5}}]
    render TachyonInternal frame_${{new_index}}.tga
}}

exit
"""

# Function to generate, run VMD, and create video with FFmpeg
def process_visualization(code, ratio):
    # Set the directory path for the current code and ratio
    visual_dir = os.path.join(base_dir, f"Au_{code}_WAT", ratio)

    # Remove all existing .tga files in the visual_dir
    for file in os.listdir(visual_dir):
        if file.endswith('.tga'):
            os.remove(os.path.join(visual_dir, file))
    print(f"Removed .tga files for {code} at ratio {ratio}")

    # Delete visualization.mp4 in visual_dir if it exists
    mp4_file_path = os.path.join(visual_dir, "visualization.mp4")
    if os.path.exists(mp4_file_path):
        os.remove(mp4_file_path)
        print(f"Deleted {mp4_file_path}")
    
    # Replace placeholders in the template
    vmd_script_content = vmd_script_template.format(code=code)
    
    # Write the VMD script to a file in the current directory
    vmd_script_path = os.path.join(visual_dir, "visualize.vmd")
    with open(vmd_script_path, "w") as script_file:
        script_file.write(vmd_script_content)
    
    # Step 1: Run VMD to generate individual frame files (.tga)
    try:
        vmd_command = ['/usr/local/bin/vmd', '-dispdev', 'text', '-e', 'visualize.vmd']
        subprocess.run(vmd_command, cwd=visual_dir, check=True)
        print(f"VMD script ran successfully for {code} at ratio {ratio}")
    except subprocess.CalledProcessError as e:
        print(f"Error running VMD for {code} at ratio {ratio}: {e}")
        return
    
    # Step 2: Combine .tga frames into a video using FFmpeg
    try:
        ffmpeg_command = ['/usr/bin/ffmpeg', '-framerate', '16', '-i', 'frame_%d.tga', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'visualization.mp4']
        subprocess.run(ffmpeg_command, cwd=visual_dir, check=True)
        print(f"Video generated successfully for {code} at ratio {ratio}")
    except subprocess.CalledProcessError as e:
        print(f"Error generating video for {code} at ratio {ratio}: {e}")
        return
    
    # Step 3: Remove all .tga files
    try:
        for file in os.listdir(visual_dir):
            if file.endswith('.tga'):
                os.remove(os.path.join(visual_dir, file))
        print(f"Removed .tga files for {code} at ratio {ratio}")
    except Exception as e:
        print(f"Error cleaning up .tga files for {code} at ratio {ratio}: {e}")

# Loop through each code and ratio combination
for code in codes:
    if code == "NONE":
        process_visualization(code, "0.0")
        continue
    
    for ratio in ratios:
        process_visualization(code, ratio)
