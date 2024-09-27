async function sendMolData() {
  // Get the molfile from Ketcher
  const molfile = await window.ketcher.getMolfile('v2000');

  // Send the molfile to the Flask API and wait for the response
  const response = await fetch('/api/visualize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 'molfile': molfile }),
  });

  // Parse the JSON response
  const data = await response.json();

  // Redirect to the visualization page after simulation completed
  window.location.href = '/visualization?visualId=' + data.visualId;
}

export default sendMolData;