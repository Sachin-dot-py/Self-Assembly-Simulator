import os, re
import subprocess

def create_video_from_images(folder_path, output_video="output.mp4", fps=64):
    """
    Combines all image files named in the pattern frame_0.png, frame_1.png, ... in the folder into a video.

    Args:
        folder_path (str): Path to the folder containing the images.
        output_video (str): Name of the output video file (default is 'output.mp4').
        fps (int): Frames per second for the video (default is 64).
    """
    # Check if the folder exists
    if not os.path.isdir(folder_path):
        raise FileNotFoundError(f"The folder '{folder_path}' does not exist.")
    
    # Pre-process due to missing frames

    # Directory containing PNG files
    directory = folder_path

    # Regex pattern to extract the number in the filename
    pattern = re.compile(r"frame_(\d+)\.png")

    # Collect files and extract numbers
    files = []
    for filename in os.listdir(directory):
        match = pattern.match(filename)
        if match:
            full_path = os.path.join(directory, filename)
            if os.path.getsize(full_path) == 0:
                print(f"Skipping empty file: {filename}")
                continue
            number = int(match.group(1))
            files.append((number, filename))

    # Sort files by extracted number
    files.sort()

    # Renaming step
    for i, (_, old_name) in enumerate(files, start=1):
        new_name = f"frame_{i:04d}.png"
        old_path = os.path.join(directory, old_name)
        new_path = os.path.join(directory, new_name)

        # To avoid overwriting conflicts, rename to a temp name first
        temp_path = os.path.join(directory, f"temp_{i:04d}.tmp")
        os.rename(old_path, temp_path)

    # Rename from temp names to final names
    for i, (_, old_name) in enumerate(files, start=1):
        temp_path = os.path.join(directory, f"temp_{i:04d}.tmp")
        new_path = os.path.join(directory, f"frame_{i:04d}.png")
        os.rename(temp_path, new_path)

    print("Renaming complete!")

    # Ensure images are sorted numerically
    images = [f for f in os.listdir(folder_path) if f.startswith("frame_") and f.endswith(".png")]
    images.sort(key=lambda x: int(x.split("_")[1].split(".")[0]))

    if not images:
        raise ValueError("No images found in the folder matching the pattern 'frame_xxxx.png'.")

    # Create a temporary text file listing all images
    list_file = os.path.join(folder_path, "frame_list.txt")
    with open(list_file, "w") as file:
        for image in images:
            file.write(f"file '{os.path.join(folder_path, image)}'\n")

    # Run ffmpeg to combine the images into a video
    command = [
        "/global/cfs/cdirs/m4537/sachin/self-assembly/temp/ffmpeg-7.0.2-amd64-static/ffmpeg",
        "-framerate", str(fps),
        "-i", os.path.join(folder_path, "frame_%04d.png"),
        "-vf", "scale='iw*min(720/iw\\,720/ih)':'ih*min(720/iw\\,720/ih)',pad=720:720:(720-iw*min(720/iw\\,720/ih))/2:(720-ih*min(720/iw\\,720/ih))/2:color=white",
        "-pix_fmt", "yuv420p",
        "-r", str(fps),
        os.path.join(folder_path, output_video)
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Video created successfully: {output_video}")
    except subprocess.CalledProcessError as e:
        print(f"Error creating video: {e}")
    finally:
        # Clean up the temporary list file
        if os.path.exists(list_file):
            os.remove(list_file)

# Example usage:
# Replace 'path/to/your/folder' with the actual folder containing images
# create_video_from_images("path/to/your/folder")
# path = input("Enter the path to the folder containing images: ")
# if not path:
#     path = "/global/cfs/cdirs/m4537/sachin/self-assembly/temp/frames/final_simulations_300K/Au_OLY_WAT/0.5/results/barplots"
# create_video_from_images(path)

if __name__ == "__main__":
    global_path = "/global/cfs/cdirs/m4537/sachin/self-assembly/temp/frames/final_simulations_300K"
    final_path = "/global/cfs/cdirs/m4537/sachin/self-assembly/temp/gold-nanoparticles"
    codes = ["MPA", "MUA", "OCD", "OLY"]
    ratios = ["0.5", "1.0", "1.5"]

    for code in codes:
        # if code == "NONE":
        #     create_video_from_images(os.path.join(global_path, f"Au_{code}_WAT/0.0/results/barplots"), output_video="barplot.mp4")
        #     continue
        
        for ratio in ratios:
            folder_path_barplot = os.path.join(global_path, f"Au_{code}_WAT/{ratio}/results/barplots")
            create_video_from_images(folder_path_barplot, output_video="barplot.mp4")
            final_path_barplot = os.path.join(final_path, f"Au_{code}_WAT/{ratio}/barplot.mp4")
            print(f"Final path for barplot: {final_path_barplot}")
            os.rename(os.path.join(folder_path_barplot, "barplot.mp4"), final_path_barplot)

            folder_path_clusters = os.path.join(global_path, f"Au_{code}_WAT/{ratio}/results/clusters")
            create_video_from_images(folder_path_clusters, output_video="clusters.mp4")
            final_path_clusters = os.path.join(final_path, f"Au_{code}_WAT/{ratio}/clusters.mp4")
            print(f"Final path for clusters: {final_path_barplot}")
            os.rename(os.path.join(folder_path_clusters, "clusters.mp4"), final_path_clusters)
