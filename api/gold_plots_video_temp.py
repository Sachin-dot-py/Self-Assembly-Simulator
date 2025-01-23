import os
import subprocess

def create_video_from_images(folder_path, output_video="output.mp4", fps=64):
    """
    Combines all image files named in the pattern image_0.png, image_1.png, ... in the folder into a video.

    Args:
        folder_path (str): Path to the folder containing the images.
        output_video (str): Name of the output video file (default is 'output.mp4').
        fps (int): Frames per second for the video (default is 64).
    """
    # Check if the folder exists
    if not os.path.isdir(folder_path):
        raise FileNotFoundError(f"The folder '{folder_path}' does not exist.")

    # Ensure images are sorted numerically
    images = [f for f in os.listdir(folder_path) if f.startswith("image_") and f.endswith(".png")]
    images.sort(key=lambda x: int(x.split("_")[1].split(".")[0]))

    if not images:
        raise ValueError("No images found in the folder matching the pattern 'image_xxxx.png'.")

    # Create a temporary text file listing all images
    list_file = os.path.join(folder_path, "image_list.txt")
    with open(list_file, "w") as file:
        for image in images:
            file.write(f"file '{os.path.join(folder_path, image)}'\n")

    # Run ffmpeg to combine the images into a video
    command = [
        "ffmpeg",
        "-r", str(fps),
        "-f", "concat",
        "-safe", "0",
        "-i", list_file,
        "-vf", "scale='iw*min(720/iw\\,720/ih)':'ih*min(720/iw\\,720/ih)',pad=720:720:(720-iw*min(720/iw\\,720/ih))/2:(720-ih*min(720/iw\\,720/ih))/2",
        "-pix_fmt", "yuv420p",
        output_video
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
create_video_from_images("/Users/sachin/Downloads/Au_CA_WAT/1.0/barplot_images")

