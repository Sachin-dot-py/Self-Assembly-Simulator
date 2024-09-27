import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import sendMolData from './sendMolData';

function LoadingButton() {
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // When Button is clicked
      sendMolData().then(() => {
        setLoading(false);
      });
    }
  }, [isLoading]);

  const handleClick = () => setLoading(true);

  return (
    <Button
      variant="primary"
      disabled={isLoading}
      onClick={!isLoading ? handleClick : null}
    >
      {isLoading ? 'Loading…' : 'View Visualization'}
    </Button>
  );
}

export default LoadingButton;