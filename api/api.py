import threading
import time
from flask import Flask, request
from flask_restful import Resource, Api, reqparse
from flask import send_file, jsonify
import subprocess
import os
import uuid
import sys
import re
from queue import Queue
from collections import deque
from datetime import datetime
import csv

app = Flask(__name__)
api = Api(app)
job_queue = Queue()
pending_jobs = deque()                # holds visualId in submission order
job_start_times = {}                  # visualId → datetime

# ‣ Worker function that processes jobs one at a time
def simulation_worker():
    while True:
        visual_dir, temperature, visual_id = job_queue.get()  # blocks until an item is available
        # once we pull it for processing, pop it off the deque
        if pending_jobs and pending_jobs[0] == visual_id:
            pending_jobs.popleft()
        try:
            Visualize.run_simulation(visual_dir, temperature, visual_id)
        except Exception as e:
            app.logger.error(f"Error during simulation for {visual_id}: {e}")
            # mark the job as failed in its status file
            with open(os.path.join(visual_dir, 'status.txt'), 'w') as f:
                f.write('failed')
        finally:
            job_queue.task_done()

# ‣ Start exactly one background worker thread on import
worker = threading.Thread(target=simulation_worker, daemon=True)
worker.start()

# For CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

def convert_mdl_to_bgf(mdl_filename):
    """Converts an MDL V3000 file to a BGF file using Open Babel."""
    bgf_filename = mdl_filename.replace('.mol', '.bgf')

    # Step 1: Convert MDL to BGF using Open Babel
    subprocess.run(
        ['/usr/bin/obabel', '-imdl', mdl_filename, '-obgf', '-O', bgf_filename],
        check=True
    )
    print(f"Converted {mdl_filename} to {bgf_filename}.")

    # Step 2: Extract charges from the MDL file
    atom_charges = extract_charges_from_mdl(mdl_filename)

    # Step 3: Update BGF file charges using sed
    update_bgf_with_sed(bgf_filename, atom_charges)

    # Center the BGF
    subprocess.run(
        ['/app/ATLAS-toolkit/scripts/centerBGF.pl', '-b', bgf_filename, '-f', 'UFF'],
        check=True
    )

def extract_charges_from_mdl(mdl_filename):
    """Extracts atomic charges from the MDL V3000 file."""
    charges = {}
    in_atom_section = False

    with open(mdl_filename, 'r') as mdl_file:
        for line in mdl_file:
            # Detect the start and end of the ATOM section
            if 'M  V30 BEGIN ATOM' in line:
                in_atom_section = True
                continue
            elif 'M  V30 END ATOM' in line:
                in_atom_section = False

            # Extract atom ID and charge within the ATOM section
            if in_atom_section:
                match = re.match(r'M\s+V30\s+(\d+)\s+\w+\s+[-.\d]+\s+[-.\d]+\s+[-.\d]+\s+\d+\s+CHG=(-?\d+)', line)
                if match:
                    atom_id = int(match.group(1))
                    charge = float(match.group(2))
                    charges[atom_id] = charge

    print(f"Extracted charges: {charges}")
    return charges

def update_bgf_with_sed(bgf_filename, atom_charges):
    """Updates the BGF file with the extracted charges using sed."""
    for atom_id, charge in atom_charges.items():
        # Use sed to replace the charge in-place for the corresponding atom ID
        # Construct a sed command to find the correct line based on atom ID and replace the charge
        sed_command = (
            f"sed -i '/HETATM *{atom_id} /s/\\( *[0-9.-]\\+\\)$/ {charge:8.5f}/' {bgf_filename}"
        )
        subprocess.run(sed_command, shell=True, check=True)

    print(f"Updated {bgf_filename} with correct charges.")


def is_valid_password(password: str) -> bool:
    """
    Return True if *password* is present in access.csv, regardless of master status.
    """
    ACCESS_FILE = os.path.join('temp', 'access.csv')
    try:
        with open(ACCESS_FILE, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['password'] == password:
                    return True
    except FileNotFoundError:
        pass
    return False


def is_master_password(password: str) -> bool:
    """
    Return True if *password* is present in access.csv AND the master column is truthy.
    """
    ACCESS_FILE = os.path.join('temp', 'access.csv')
    try:
        with open(ACCESS_FILE, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if (
                    row['password'] == password
                    and row['master'].strip().lower() in ('1', 'true', 'yes')
                ):
                    return True
    except FileNotFoundError:
        pass
    return False

class Login(Resource):
    """
    POST /login  – register a new (non‑master) password.
    GET  /login  – validate a password; if ?master=true is supplied, require master status.
    """

    def post(self):
        ACCESS_FILE = os.path.join('temp', 'access.csv')
        try:
            parser = reqparse.RequestParser()
            parser.add_argument('name', type=str, required=True, help='User name')
            parser.add_argument('password', type=str, required=True, help='Password')
            parser.add_argument('masterpassword', type=str, required=True, help='Master Password')
            args = parser.parse_args()

            if not is_master_password(args['masterpassword']):
                return {'error': 'Unauthorized'}, 401   

            # Append the new credentials as non‑master
            with open(ACCESS_FILE, 'a', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow([args['name'], args['password'], 'false'])

            return {'success': True}, 201
        except Exception as e:
            app.logger.error(f"Error in /login POST: {e}")
            return {'success': False, 'error': str(e)}, 500

    def get(self):
        try:
            parser = reqparse.RequestParser()
            parser.add_argument('password', type=str, required=True, help='Password', location='args')
            parser.add_argument('master', type=bool, required=False, default=False, location='args')
            args = parser.parse_args()

            if args['master']:
                valid = is_master_password(args['password'])
            else:
                valid = is_valid_password(args['password'])

            if valid:
                LOGIN_LOG_FILE = os.path.join('temp', 'logins.csv')
                try:
                    epoch_time = int(time.time())
                    human_time = datetime.now().strftime('%A, %B %d %Y %-I:%M%p').lower()
                    user_agent = request.user_agent.string
                    ip_address = request.environ.get('HTTP_X_REAL_IP', request.headers.get('X-Forwarded-For', request.remote_addr))
                    
                    file_exists = os.path.isfile(LOGIN_LOG_FILE)
                    with open(LOGIN_LOG_FILE, 'a', newline='') as csvfile:
                        writer = csv.writer(csvfile)
                        if not file_exists:
                            writer.writerow(['Epoch Time', 'Time', 'User Agent', 'IP Address', 'password'])
                        writer.writerow([epoch_time, human_time, user_agent, ip_address, args['password']])
                except Exception as e:
                    app.logger.error(f"Error during login logging: {e}")

            return {'valid': valid}, 200
        except Exception as e:
            app.logger.error(f"Error in /login GET: {e}")
            return {'error': str(e)}, 500


class PasswordList(Resource):
    """
    GET /passwords – return every credential in temp/access.csv.
    """
    def get(self):
        ACCESS_FILE = os.path.join('temp', 'access.csv')
        parser = reqparse.RequestParser()
        parser.add_argument('password', type=str, required=True, help='A Master Password', location='args')
        args = parser.parse_args()

        if not is_master_password(args['password']):
            return {'error': 'Unauthorized'}, 401   

        try:
            records = []
            if os.path.exists(ACCESS_FILE):
                with open(ACCESS_FILE, newline='') as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        records.append({
                            'name': row.get('name'),
                            'password': row.get('password'),
                            'master': row.get('master')
                        })
            return records, 200
        except Exception as e:
            app.logger.error(f"Error in /passwords GET: {e}")
            return {'error': str(e)}, 500

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
        try:
            # Parse the input data
            parser = reqparse.RequestParser()
            parser.add_argument('molfile', type=str, help='The molfile input (v3000)')
            parser.add_argument('temperature', type=int, help='The simulation temperature in Kelvin', default=350)
            args = parser.parse_args()

            # Generate a unique visualId using UUID
            visual_id = str(uuid.uuid4())

            # Log this request
            IONIC_LOG_FILE = os.path.join('temp', 'ioniclog.csv')
            try:
                epoch_time = int(time.time())
                human_time = datetime.now().strftime('%A, %B %d %Y %-I:%M%p').lower()
                user_agent = request.user_agent.string
                ip_address = request.environ.get('HTTP_X_REAL_IP', request.headers.get('X-Forwarded-For', request.remote_addr))

                file_exists = os.path.isfile(IONIC_LOG_FILE)
                with open(IONIC_LOG_FILE, 'a', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    if not file_exists:
                        writer.writerow(['Epoch Time', 'Time', 'User Agent', 'IP Address', 'Visual ID'])
                    writer.writerow([epoch_time, human_time, user_agent, ip_address, visual_id])
            except Exception as e:
                app.logger.error(f"Error during ionic bonding request log: {e}")

            # Create a directory with the visualId as the name
            visual_dir = os.path.join('temp', visual_id)
            os.makedirs(visual_dir, exist_ok=True)

            # Save the molfile to a new file in the directory
            molfile_path = os.path.join(visual_dir, 'input.mol')
            with open(molfile_path, 'w') as f:
                f.write(args['molfile'])

            # record timestamp & enqueue
            job_start_times[visual_id] = datetime.utcnow()
            pending_jobs.append(visual_id)
            job_queue.put((visual_dir, args['temperature'], visual_id))
            position = len(pending_jobs)       # 1-indexed

            # ‣ Return where they are in line (1 = next to run)
            position = job_queue.qsize()
            return jsonify({
                'visualId': visual_id,
                'position': position,
                'startTime': job_start_times[visual_id].isoformat() + 'Z'
            })
        except Exception as e:
            app.logger.error(f"Error occurred: {str(e)}")
            return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

    @staticmethod
    def run_simulation(visual_dir, temperature, visual_id):
        try:
            visual_dir = os.path.join('temp', visual_id)
            
            # Step 1: Run Open Babel to convert .mol to .bgf format
            convert_mdl_to_bgf(os.path.join(visual_dir, 'input.mol'))

            # Step 2: Run the createLammpsInput.pl script with the .bgf file and merge generated in.lammps with template in.lammps
            create_lammps_input_command = ['/app/ATLAS-toolkit/scripts/createLammpsInput.pl', '-b', 'input.bgf', '-f', 'UFF']
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
                # f.writelines(merged_content)
                f.writelines(template_lines) # TODO: Removed the Create Lammps Input step for now. Just using the master in.lammps due to bug.

            # Step 3: Remove the files 'in.lammps_singlepoint' and 'lammps.lammps.slurm'
            files_to_remove = ['in.lammps_singlepoint', 'lammps.lammps.slurm']
            for filename in files_to_remove:
                file_path = os.path.join(visual_dir, filename)
                if os.path.exists(file_path):
                    os.remove(file_path)

            # Step 4: Run LAMMPS with the given temperature
            lammps_command = ['mpirun', '--allow-run-as-root', 'lmp', '-in', 'in.lammps', '-var', 'rtemp', str(temperature)]
            subprocess.run(lammps_command, cwd=visual_dir, check=True)

            # Step 5: Rename lammps.visualize.lammpstrj to master.lammpstrj
            # os.rename(os.path.join(visual_dir, 'lammps.visualize.lammpstrj'), os.path.join(visual_dir, 'master.lammpstrj'))

            # Step 5: Merge all the trajectory files into a single file
            files_to_merge = [
                "lammps.minimization.lammpstrj",
                "lammps.heat1.lammpstrj",
                "lammps.pressure1.lammpstrj",
                "lammps.heat2.lammpstrj",
                "lammps.pressure2.lammpstrj",
                "lammps.cool.lammpstrj",
                "lammps.equilibrate.lammpstrj",
            ]
            output_file = os.path.join(visual_dir, "master.lammpstrj")

            # Open the output file in write mode
            with open(output_file, "w") as master_file:
                for traj_file in files_to_merge:
                    file_path = os.path.join(visual_dir, traj_file)
                    if os.path.exists(file_path):
                        with open(file_path, "r") as single_file:
                            master_file.write(single_file.read())

            # Create the visualization

            # Step 1: Run VMD to generate individual frame files (.tga)

            # Non-parallel version:
            vmd_command = ['/usr/local/bin/vmd', '-dispdev', 'text', '-e', '../../visualize.vmd']
            subprocess.run(vmd_command, cwd=visual_dir, check=True)

            # Parallel version:
            # vmd_command_even = ['/usr/local/bin/vmd', '-dispdev', 'text', '-e', '../../visualize-even.vmd']
            # vmd_command_odd = ['/usr/local/bin/vmd', '-dispdev', 'text', '-e', '../../visualize-odd.vmd']

            # process_even = subprocess.Popen(vmd_command_even, cwd=visual_dir)
            # process_odd = subprocess.Popen(vmd_command_odd, cwd=visual_dir)

            # process_even.wait()
            # process_odd.wait()

            # Step 2: Combine .tga frames into a video using FFmpeg
            ffmpeg_command = ['/usr/bin/ffmpeg', '-framerate', '7', '-i', 'frame_%d.tga', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'visualization.mp4']
            subprocess.run(ffmpeg_command, cwd=visual_dir, check=True)

            # Step 3: Remove all .tga files
            for file in os.listdir(visual_dir):
                if file.endswith('.tga'):
                    os.remove(os.path.join(visual_dir, file))

            # Output files: visualization.mp4, input.bgf (topology), master.lammpstrj (trajectory), log.lammps (LAMMPS log)

            # Mark the visualization as completed
            with open(os.path.join(visual_dir, 'status.txt'), 'w') as status_file:
                status_file.write('completed')
        except Exception as e:
            app.logger.error(f"Error occurred during background processing: {str(e)}")
            with open(os.path.join(visual_dir, 'status.txt'), 'w') as status_file:
                status_file.write('failed')

class VisualizationStatus(Resource):
    def get(self, visualId):
        try:
            # Determine status
            visual_dir = os.path.join('temp', visualId)
            status_file_path = os.path.join(visual_dir, 'status.txt')
            if os.path.exists(status_file_path):
                with open(status_file_path, 'r') as f:
                    status = f.read().strip()
            else:
                status = 'in_progress'

            # Compute queue position
            if visualId in pending_jobs:
                position = pending_jobs.index(visualId) + 1
            else:
                position = 0

            # Retrieve start time
            start_time = job_start_times.get(visualId)
            startTimeStr = start_time.isoformat() + 'Z' if start_time else None

            return jsonify({
                'status': status,
                'position': position,
                'startTime': startTimeStr
            })
        except Exception as e:
            app.logger.error(f"Error occurred while checking status: {str(e)}")
            return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

class GoldNanoparticleVisualFileHandler(Resource):
    def get(self, surfactant, ratio):
        # Directory path for the requested surfactant and ratio
        base_dir = os.path.join('temp', 'gold-nanoparticles', f'Au_{surfactant}_WAT', ratio)

        # Check if the directory for the requested surfactant and ratio exists
        if not os.path.exists(base_dir):
            return {"error": "Invalid surfactant or ratio"}, 404

        # Define file paths
        bgf_file = os.path.join(base_dir, f'Au_{surfactant}_WAT.bgf')
        traj_file = os.path.join(base_dir, f'Au_{surfactant}_WAT.visualization.lammpstrj')
        log_file = os.path.join(base_dir, f'Au_{surfactant}_WAT.298K.equil.lammps.log')
        explanation_file = os.path.join(base_dir, 'explanation.txt')

        # Ensure that all files exist
        if not all([os.path.exists(bgf_file), os.path.exists(traj_file), os.path.exists(log_file)]):
            return {"error": "One or more files not found"}, 404

        # Read and return the contents of log file
        with open(log_file, 'r') as f:
            log_content = f.read()

        if os.path.exists(explanation_file):
            with open(explanation_file, 'r') as f:
                explanation_text = f.read()
        else:
            explanation_text = ""

        return jsonify({
            'log': log_content,
            'explanationText': explanation_text
        })

class GoldNanoparticleVideoFileHandler(Resource):
    def get(self, surfactant, ratio):
        # Directory path for the requested surfactant and ratio
        base_dir = os.path.join('temp', 'gold-nanoparticles', f'Au_{surfactant}_WAT', ratio)

        # Define the path for the video file
        video_file = os.path.join(base_dir, 'visualization.mp4')

        # Check if the video file exists
        if not os.path.exists(video_file):
            return {"error": "Video file not found"}, 404
        
        GOLD_LOG_FILE = os.path.join('temp', 'goldlog.csv')
        try:
            epoch_time = int(time.time())
            human_time = datetime.now().strftime('%A, %B %d %Y %-I:%M%p').lower()
            user_agent = request.user_agent.string
            ip_address = request.environ.get('HTTP_X_REAL_IP', request.headers.get('X-Forwarded-For', request.remote_addr))

            file_exists = os.path.isfile(GOLD_LOG_FILE)
            with open(GOLD_LOG_FILE, 'a', newline='') as csvfile:
                writer = csv.writer(csvfile)
                if not file_exists:
                    writer.writerow(['Epoch Time', 'Time', 'User Agent', 'IP Address', 'surfactant', 'ratio'])
                writer.writerow([epoch_time, human_time, user_agent, ip_address, surfactant, ratio])
        except Exception as e:
            app.logger.error(f"Error during gold nanoparticle video log: {e}")

        # Send the video file to the frontend
        return send_file(video_file, mimetype='video/mp4')
    
class GoldNanoparticlePlotsFileHandler(Resource):
    def get(self, display, surfactant, ratio):
        # Directory path for the requested surfactant and ratio
        base_dir = os.path.join('temp', 'gold-nanoparticles', f'Au_{surfactant}_WAT', ratio)

        # Define the path for the video file
        video_file = os.path.join(base_dir, f'{display}.mp4')

        # Check if the video file exists
        if not os.path.exists(video_file):
            return {"error": "Video file not found"}, 404

        # Send the video file to the frontend
        return send_file(video_file, mimetype='video/mp4')


api.add_resource(VisualFileHandler, '/api/getfiles/<string:visualId>')
api.add_resource(VideoFileHandler, '/api/getvideo/<string:visualId>')
api.add_resource(GoldNanoparticleVisualFileHandler, '/api/getfiles/<string:surfactant>/<string:ratio>')
api.add_resource(GoldNanoparticleVideoFileHandler, '/api/getvideo/<string:surfactant>/<string:ratio>')
api.add_resource(GoldNanoparticlePlotsFileHandler, '/api/getplot/<string:display>/<string:surfactant>/<string:ratio>')
api.add_resource(Visualize, '/api/visualize')
api.add_resource(VisualizationStatus, '/api/status/<string:visualId>')
api.add_resource(Login, '/api/login')
api.add_resource(PasswordList, '/api/passwords')

if __name__ == '__main__':
    port = 8000  # Default port
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])  # Get the port number from command-line arguments
        except ValueError:
            print("Invalid port number. Using default port 8000.")
    app.run(host='0.0.0.0', port=port)