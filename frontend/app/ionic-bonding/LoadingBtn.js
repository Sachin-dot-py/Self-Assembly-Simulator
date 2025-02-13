import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import sendMolData from './sendMolData';

function LoadingButton() {
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // When Button is clicked
      sendMolData(setLoading).then(() => {
        // setLoading(false);
      });
    }
  }, [isLoading]);

  const handleClick = () => setLoading(true);
  if (isLoading) {
    return (
      <Button variant="primary" disabled>
        <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
        />
        &nbsp;Running Simulations...
      </Button>
    );
  }
  
  return (
    <Button
      variant="primary"
      disabled={isLoading}
      onClick={!isLoading ? handleClick : null}
    >
      View Visualization
    </Button>
  );
}

export default LoadingButton;
