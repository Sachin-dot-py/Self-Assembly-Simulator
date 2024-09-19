from flask import Flask
from flask_restful import Resource, Api, reqparse
import subprocess
import os
import sys
import requests

p = None # Jupyter notebook server process
TOKEN = "f9a3bd4e9f2c3be01cd629154cfb224c2703181e050254b5" # Arbitrary token chosen for authentication
app = Flask(__name__)
api = Api(app)

# For CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

# Run jupyter notebook server
@app.before_request
def run_jupyter():
    global p
    # Ensure this only runs before the first request
    app.before_request_funcs[None].remove(run_jupyter)

    # Starts running the Jupyter notebook server
    p = subprocess.Popen(["python3", "-m", "jupyter", "notebook", "--port=8888", f"--IdentityProvider.token={TOKEN}", "--no-browser"])

class HelloWorld(Resource):
    def get(self):
        return {'hello': 'world'}

class TempFileHandler(Resource):
    def get(self, filename):
        # parser = reqparse.RequestParser()
        # parser.add_argument('filename', type=str, help='The file name that you wish to retrieve from the temp directory')
        # args = parser.parse_args()

        if "/" in filename or not os.path.exists(f'temp/{filename}'):
            return {"error": "Invalid filename"}

        with open(f'temp/{filename}', 'r') as f:
            output = f.read()
        
        return {"content": output}

class Visualize(Resource):
    def post(self):
        # Parse the input data
        parser = reqparse.RequestParser()
        parser.add_argument('molfile', type=str, help='The molfile input (v2000)')
        args = parser.parse_args()

        # Find an unused filename from molfile1.mol, molfile2.mol, ...
        if not os.path.exists('temp'):
            os.makedirs('temp')
        
        i = 1
        while os.path.exists(f'temp/molfile{i}.mol'):
            i += 1

        # Save the molfile to a new file in the temp directory
        with open(f'temp/molfile{i}.mol', 'w') as f:
            f.write(args['molfile'])

        # Run the scripts to generate output files
        # Need to create the topology{}.html, trajectory{}.html, visual{}.html, logfile{}.html
        # For now, executes a Jupyter notebook to visualize the same mol file.
        
        # Duplicate the visualizer notebook to a new file
        with open('visuals_template.ipynb', 'r') as f:
            notebook = f.read()

        notebook.replace("-19", str(i)) # Set the visual_id in the notebook

        with open(f'temp/notebook{i}.ipynb', 'w') as f:
            f.write(notebook)

        # Execute the notebook


        # Read output files and return the data
        # with open(f'temp/molfile{i}.mol', 'r') as f:
        #     output = f.read()

        # Delete all the temp files created in the process
        # os.remove(f'temp/molfile{i}.mol')

        return {'visualId': i}

class Calculate(Resource):
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument('num1', type=int, help='Number 1')
        parser.add_argument('num2', type=int, help='Number 2')
        args = parser.parse_args()
        result = args['num1'] + args['num2']
        return "The result is " + result


# test
api.add_resource(HelloWorld, '/api/')
api.add_resource(TempFileHandler, '/api/getfile/<string:filename>')
api.add_resource(Visualize, '/api/visualize')
api.add_resource(Calculate, '/api/calculate/')

if __name__ == '__main__':
    port = 8000  # Default port
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])  # Get the port number from command-line arguments
        except ValueError:
            print("Invalid port number. Using default port 8000.")
    try:
        app.run(host='0.0.0.0', port=port)
    finally:
        if p:
            p.kill()
        requests.post(f"http://localhost:8888/api/shutdown?token={TOKEN}")
