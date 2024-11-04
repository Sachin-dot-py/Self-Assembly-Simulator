async function sendMolData() {
  // Get the molfile from Ketcher
  const molfile = await window.ketcher.getMolfile('v3000');

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

  // Get the visualId from the response
  const visualId = data.visualId;

  // Poll the server to check if the visualization is ready
  const interval = setInterval(async () => {
    const checkResponse = await fetch(`/api/status/` + visualId, {
      headers: {
        'Accept': 'application/json',
      },
    });
    const checkData = await checkResponse.json();

    if (checkData.status === 'completed') {
      clearInterval(interval);
      // Redirect to the visualization page after simulation completed
      window.location.href = '/visualization?visualId=' + visualId;
    } else if (checkData.status === 'failed') {
      clearInterval(interval);
      // Display an alert if the status is failed
      alert("The visualization failed. Please check your input structures and try again.");
    }
  }, 5000); // Poll every 5 seconds
}

export default sendMolData;