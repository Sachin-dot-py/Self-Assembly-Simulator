import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

export default function LoadingButton() {
  const [visualId, setVisualId]       = useState(null);
  const [isLoading, setLoading]       = useState(false);
  const [position, setPosition]       = useState(null);
  const [startTime, setStartTime]     = useState(null);
  const [elapsed, setElapsed]         = useState(0);        // ms
  const [status, setStatus]           = useState('');       // in_progress, completed, failed

  // Kick off submission
  useEffect(() => {
    if (!isLoading) return;
    let poller;

    (async () => {
      // 1) grab molfile
      const molfile = await window.ketcher.getMolfile('v3000');

      // 2) POST to visualize
      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({molfile})
      });
      const body = await res.json();
      setVisualId(body.visualId);
      setPosition(body.position);
      setStartTime(new Date(body.startTime));

      // 3) start polling
      poller = setInterval(async () => {
        const r2 = await fetch(`/api/status/${body.visualId}`, {
          headers: {'Accept':'application/json'}
        });
        const s = await r2.json();
        setStatus(s.status);
        setPosition(s.position);

        // update elapsed and est wait
        const now = Date.now();
        const elapsedMs = now - new Date(s.startTime).getTime();
        setElapsed(elapsedMs);

        if (s.status === 'completed') {
          clearInterval(poller);
          window.location.href = '/visualization?visualId=' + body.visualId;
        }
        if (s.status === 'failed') {
          clearInterval(poller);
          alert("Visualization failed – please check your input.");
          setLoading(false);
        }
      }, 5000);
    })();

    return () => clearInterval(poller);
  }, [isLoading]);

  const handleClick = () => setLoading(true);

  // format helpers
  const fmtTime = d => new Date(d).toLocaleTimeString();
  const fmtDur = ms => {
    const totalSec = Math.floor(ms/1000);
    const m = Math.floor(totalSec/60);
    const s = totalSec % 60;
    return `${m}m ${s}s`;
  };
  const estWait = () => {
    const remainSec = position * 2*60 - Math.floor(elapsed/1000);
    if (remainSec <= 0) return 'just about now';
    const m = Math.floor(remainSec/60), s = remainSec%60;
    return `${m}m ${s}s`;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign:'center' }}>
        <div style={{ marginBottom:'0.5rem' }}>
          <strong>Position in queue:</strong> {position ?? '…'}<br/>
          <strong>Submitted at:</strong> {startTime ? fmtTime(startTime) : '…'}<br/>
          <strong>Elapsed:</strong> {fmtDur(elapsed)}<br/>
          <strong>Est. wait:</strong> {estWait()}
        </div>
        <Button variant="primary" disabled>
          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/>
          &nbsp;Running…
        </Button>
      </div>
    );
  }
  return (
    <Button variant="primary" onClick={handleClick}>
      Visualize Self-Assembly
    </Button>
  );
}