from flask import Flask
from flask_restful import Resource, Api, reqparse
from flask import send_file, jsonify
import subprocess
import os
import uuid
import sys

app = Flask(__name__)
api = Api(app)

# For CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

class HelloWorld(Resource):
    def get(self):
        return {'hello': 'world'}

class VisualFileHandler(Resource):
    def get(self, visualId):
        # Directory path for the requested visualId
        visual_dir = os.path.join('temp', visualId)

        # Check if the visualId directory exists
        if not os.path.exists(visual_dir):
            return {"error": "Invalid visualId"}, 404

        # Define file paths
        bgf_file = os.path.join(visual_dir, 'input.bgf')
        traj_file = os.path.join(visual_dir, 'master.lammpstrj')
        log_file = os.path.join(visual_dir, 'log.lammps')

        # Ensure that all files exist
        if not all([os.path.exists(bgf_file), os.path.exists(traj_file), os.path.exists(log_file)]):
            return {"error": "One or more files not found"}, 404

        # Read and return the contents of each file
        with open(bgf_file, 'r') as f:
            bgf_content = f.read()
        with open(traj_file, 'r') as f:
            traj_content = f.read()
        with open(log_file, 'r') as f:
            log_content = f.read()

        return jsonify({
            'topology': bgf_content,
            'trajectory': traj_content,
            'log': log_content
        })
    
class VideoFileHandler(Resource):
    def get(self, visualId):
        # Directory path for the requested visualId
        visual_dir = os.path.join('temp', visualId)

        # Define the path for the video file
        video_file = os.path.join(visual_dir, 'visualization.mp4')

        # Check if the video file exists
        if not os.path.exists(video_file):
            return {"error": "Video file not found"}, 404

        # Send the video file to the frontend
        return send_file(video_file, mimetype='video/mp4')


class Visualize(Resource):
    def post(self):
        # Parse the input data
        parser = reqparse.RequestParser()
        parser.add_argument('molfile', type=str, help='The molfile input (v2000)')
        parser.add_argument('temperature', type=int, help='The simulation temperature in Kelvin', default=298)
        args = parser.parse_args()

        # Generate a unique visualId using UUID
        visual_id = str(uuid.uuid4())

        # Create a directory with the visualId as the name
        visual_dir = os.path.join('temp', visual_id)
        os.makedirs(visual_dir, exist_ok=True)

        # Save the molfile to a new file in the directory
        molfile_path = os.path.join(visual_dir, 'input.mol')
        with open(molfile_path, 'w') as f:
            f.write(args['molfile'])

        # Perform the simulation

        # Step 1: Run Open Babel to convert .mol to .bgf format
        obabel_command = ['/root/anaconda3/bin/obabel', '-imol', 'input.mol', '-obgf', '-O', 'input.bgf']
        subprocess.run(obabel_command, cwd=visual_dir, check=True)

        # Step 2: Run the createLammpsInput.pl script with the .bgf file and merge generated in.lammps with template in.lammps
        create_lammps_input_command = ['/root/ATLAS-toolkit/scripts/createLammpsInput.pl', '-b', 'input.bgf', '-f', 'UFF']
        subprocess.run(create_lammps_input_command, cwd=visual_dir, check=True)

        with open(os.path.join(visual_dir, 'in.lammps'), 'r') as f:
            current_lines = f.readlines()

        with open('in.lammps', 'r') as f:
            template_lines = f.readlines()

        # Find the index of 'timestep 1' in both files
        timestep_line = 'timestep             1'
        current_split_idx = next(i for i, line in enumerate(current_lines) if timestep_line in line)
        outer_split_idx = next(i for i, line in enumerate(template_lines) if timestep_line in line)

        # Combine everything before the 'timestep 1' line from the current file
        # with everything after the 'timestep 1' line from the outer file
        merged_content = current_lines[:current_split_idx + 1] + template_lines[outer_split_idx + 1:]

        # Overwrite the current in.lammps with the merged content
        with open(os.path.join(visual_dir, 'in.lammps'), 'w') as f:
            f.writelines(merged_content)
    
        # Step 3: Remove the files 'in.lammps_singlepoint' and 'lammps.lammps.slurm'
        files_to_remove = ['in.lammps_singlepoint', 'lammps.lammps.slurm']
        for filename in files_to_remove:
            file_path = os.path.join(visual_dir, filename)
            if os.path.exists(file_path):
                os.remove(file_path)

        # Step 4: Run LAMMPS with the given temperature
        lammps_command = ['/root/lammps/build/lmp', '-in', 'in.lammps', '-var', 'rtemp', str(args['temperature'])]
        subprocess.run(lammps_command, cwd=visual_dir, check=True)

        # Step 5: Concatenate lammps.min.lammpstrj and lammps.heat.lammpstrj into master.lammpstrj
        # with open(os.path.join(visual_dir, 'master.lammpstrj'), 'wb') as master_file:
        #     for file_name in ['lammps.min.lammpstrj', 'lammps.heat.lammpstrj']:
        #         file_path = os.path.join(visual_dir, file_name)
        #         if os.path.exists(file_path):
        #             with open(file_path, 'rb') as f:
        #                 master_file.write(f.read())

        # Above lines removed because it's now called lammps.visualize.lammpstrj
        
        os.rename(os.path.join(visual_dir, 'lammps.visualize.lammpstrj'), os.path.join(visual_dir, 'master.lammpstrj'))

        # Create the visualization

        # Step 1: Run VMD to generate individual frame files (.tga)
        vmd_command = ['/usr/local/bin/vmd', '-dispdev', 'text', '-e', '../../visualize.vmd']
        subprocess.run(vmd_command, cwd=visual_dir, check=True)

        # Step 2: Combine .tga frames into a video using FFmpeg
        ffmpeg_command = ['/usr/bin/ffmpeg', '-framerate', '3', '-i', 'frame_%d.tga', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'visualization.mp4']
        subprocess.run(ffmpeg_command, cwd=visual_dir, check=True)

        # Step 3: Remove all .tga files
        for file in os.listdir(visual_dir):
            if file.endswith('.tga'):
                os.remove(os.path.join(visual_dir, file))

        # Output files: visualization.mp4, input.bgf (topology), master.lammpstrj (trajectory), log.lammps (LAMMPS log)

        # Return the visualId to the client
        return {'visualId': visual_id}


api.add_resource(HelloWorld, '/api/')
api.add_resource(VisualFileHandler, '/api/getfiles/<string:visualId>')
api.add_resource(VideoFileHandler, '/api/getvideo/<string:visualId>')
api.add_resource(Visualize, '/api/visualize')

if __name__ == '__main__':
    port = 8000  # Default port
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])  # Get the port number from command-line arguments
        except ValueError:
            print("Invalid port number. Using default port 8000.")
    app.run(host='0.0.0.0', port=port)