import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import { FaLock } from 'react-icons/fa';

export default function LoadingButton() {
  const [visualId, setVisualId]       = useState(null);
  const [isLoading, setLoading]       = useState(false);
  const [position, setPosition]       = useState(null);
  const [startTime, setStartTime]     = useState(null);
  const [elapsed, setElapsed]         = useState(0);        // ms
  const [status, setStatus]           = useState('');       // in_progress, completed, failed

  const [loggedIn, setLoggedIn]         = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError]       = useState(null);

  const [atomCount, setAtomCount] = useState(0);

  //  Check localStorage for saved password
  useEffect(() => {
    const saved = localStorage.getItem('ACCESS_KEY');
    if (saved) {
      setLoggedIn(true);
    }
  }, []);

useEffect(() => {
  let intervalId;
  let listenerAttached = false;

  const tryAttachListener = () => {
    if (
      window.ketcher &&
      window.ketcher.editor &&
      window.ketcher.editor.struct &&
      window.ketcher.editor.event &&
      window.ketcher.editor.event.change
    ) {
      // Update atom count immediately
      const updateAtomCount = () => {
        const count = window.ketcher.editor.struct().atoms.size;
        setAtomCount(count);
      };

      updateAtomCount();

      // Listen to structure changes
      window.ketcher.editor.event.change.add(updateAtomCount);
      listenerAttached = true;

      // Stop polling
      clearInterval(intervalId);
    }
  };

  // Start polling every 500ms
  intervalId = setInterval(tryAttachListener, 500);

  return () => {
    if (listenerAttached && window.ketcher?.editor?.event?.change) {
      window.ketcher.editor.event.change.remove(updateAtomCount);
    }
    clearInterval(intervalId);
  };
  }, []);


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


  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch(`/api/login?password=${encodeURIComponent(passwordInput)}`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem('ACCESS_KEY', passwordInput);
        setLoggedIn(true);
        setShowLoginForm(false);
        setPasswordInput('');
      } else {
        setLoginError('Incorrect password, please try again.');
      }
    } catch (err) {
      setLoginError('Error contacting server.');
    }
  };

  const handleVisualizeClick = () => setLoading(true);

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

  // -------------------------------------------------------------------------
  //  Render – gate visualize UI behind login
  // -------------------------------------------------------------------------
  if (!loggedIn) {
    // not yet authenticated
    if (!showLoginForm) {
      return (
        <Button variant="secondary" onClick={() => setShowLoginForm(true)}>
          <FaLock style={{ marginRight:'0.35rem' }}/>
          Login&nbsp;to&nbsp;Visualize
        </Button>
      );
    }

    // show small inline login form
    return (
      <Form onSubmit={handleLoginSubmit} style={{ maxWidth:'260px', margin:'0 auto' }}>
        <InputGroup className="mb-2">
          <InputGroup.Text><FaLock/></InputGroup.Text>
          <Form.Control
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            autoFocus
          />
        </InputGroup>
        {loginError && <div style={{ color:'red', fontSize:'0.9rem' }}>{loginError}</div>}
        <Button variant="primary" type="submit" size="sm">
          Submit
        </Button>{' '}
        <Button variant="link" size="sm" onClick={() => { setShowLoginForm(false); setLoginError(null); }}>
          Cancel
        </Button>
        <br />
        <small style={{ color:'gray' }}>
        If you want to request access, <br /> contact <a href="mailto:ytheriault@ucsd.edu">ytheriault@ucsd.edu</a>
        </small>
      </Form>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign:'center' }}>
        <div style={{ marginBottom:'0.5rem' }}>
          <strong>Position in queue:</strong> {position ?? '…'}<br/>
          <strong>Submitted at:</strong> {startTime ? fmtTime(startTime) : '…'}<br/>
          <strong>Est. wait:</strong> {estWait()}
        </div>
        <Button variant="primary" disabled>
          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/>
          &nbsp;Running…
        </Button>
      </div>
    );
  }

  // idle, logged‑in button
  return (
    <>
      <Button
        variant="primary"
        onClick={handleVisualizeClick}
        disabled={atomCount > 20}
      >
        Visualize Self-Assembly
      </Button>
      <div style={{ marginTop: '0.25rem', color: 'gray' }}>
      Ion count: <b>{atomCount}</b> (max 20)
      </div>
      {atomCount > 20 && (
        <div style={{ color: 'red', marginTop: '0.5rem' }}>
          Please reduce the number of ions (max 20).
        </div>
      )}
    </>
  );
}