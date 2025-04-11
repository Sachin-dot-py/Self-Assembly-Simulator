import NGLViewer from "./NGLViewer";

const App = () => {
  return (
    <div>
      <h2>LAMMPS Trajectory Viewer</h2>
      <NGLViewer trajUrl="http://localhost:8080/data/sample.lammpstrj" />
    </div>
  );
};

export default App;