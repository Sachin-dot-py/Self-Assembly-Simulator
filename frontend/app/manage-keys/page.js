'use client';

import { useState, useEffect } from 'react';
import { Table, Form, InputGroup, Button, Spinner, Alert } from 'react-bootstrap';
import { FaKey, FaUserShield, FaPlus, FaLock } from 'react-icons/fa';
import Navigation from '../components/Navigation';

/** Admin page: list / add credentials */
export default function ManageKeys() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [newName, setNewName]   = useState('');
  const [newPass, setNewPass]   = useState('');

  // --- login form state ------------------------------------------------------
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError,   setLoginError]   = useState(null);

  const accessKey = typeof window !== 'undefined'
    ? localStorage.getItem('ACCESS_KEY')
    : null;

  // ── helper ────────────────────────────────────────────────────────────────
  const fetchKeys = async () => {
    try {
      const r = await fetch(
        `/api/passwords?password=${encodeURIComponent(accessKey)}`
      );
      if (r.status === 401) {
        setShowLoginForm(true);
        setLoading(false);
        return;
      }
      const data = await r.json();
      setRecords(data);
    } catch (e) {
      setError(e.message || 'Unable to load keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessKey) {
      setShowLoginForm(true);
      setLoading(false);
      return;
    }
    fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch(
        `/api/login?password=${encodeURIComponent(passwordInput)}&master=true`
      );
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem('ACCESS_KEY', passwordInput);
        setShowLoginForm(false);
        setPasswordInput('');
        setLoading(true);
        fetchKeys();               // refresh table
      } else {
        setLoginError('Incorrect admin password.');
      }
    } catch {
      setLoginError('Error contacting server.');
    }
  };

  const handleAdd = async () => {
    if (!newName || !newPass) return;
    try {
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, password: newPass, masterpassword: accessKey })
      });
      setNewName('');
      setNewPass('');
      fetchKeys();           // refresh
    } catch {
      setError('Could not create credential');
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Navigation />
      {showLoginForm ? (
        <div style={{ maxWidth: 320, margin: '2rem auto' }}>
          <h4><FaUserShield style={{ marginRight: 4 }} />Admin&nbsp;Login</h4>
          <Form onSubmit={handleLoginSubmit}>
            <InputGroup className="mb-2">
              <InputGroup.Text><FaLock /></InputGroup.Text>
              <Form.Control
                type="password"
                placeholder="Admin password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                autoFocus
              />
            </InputGroup>
            {loginError && (
              <Alert variant="danger" className="py-1">
                {loginError}
              </Alert>
            )}
            <Button variant="primary" type="submit" size="sm">
              Login
            </Button>
          </Form>
        </div>
      ) : loading ? (
        <Spinner animation="border" className="mt-3" />
      ) : error ? (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      ) : (
        <div style={{ maxWidth: 720, margin: '2rem auto' }}>
          <h3><FaUserShield style={{ marginRight: 6 }} />Manage Access Keys</h3>

          <Table bordered hover responsive>
            <thead className="table-light">
              <tr>
                <th><FaUserShield /> Name</th>
                <th><FaKey /> Access Key</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.password}</td>
                  <td className="text-center">
                    <Form.Check
                      type="checkbox"
                      disabled
                      checked={
                        String(r.master).toLowerCase() === 'true' || r.master === 1
                      }
                    />
                  </td>
                </tr>
              ))}
              {/* add-new row */}
              <tr>
                <td>
                  <Form.Control
                    placeholder="New name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    size="sm"
                  />
                </td>
                <td>
                  <Form.Control
                    placeholder="New password"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    size="sm"
                  />
                </td>
                <td className="text-center">
                  <Button size="sm" variant="success" onClick={handleAdd}>
                    <FaPlus />
                  </Button>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}