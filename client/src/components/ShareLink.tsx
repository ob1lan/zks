import React, { useState, useEffect } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const ShareLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId') || '';

  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const handleDecrypt = async () => {
    setError(null);
    setDecryptedContent(null);

    try {
      const response = await axios.post('http://localhost:4000/api/decrypt', {
        fileId,
        passphrase,
      });

      setFilename(response.data.filename);
      setDecryptedContent(response.data.content);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.error || 'Decryption failed.');
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  const handleDownload = () => {
    if (!decryptedContent || !filename) return;

    const blob = new Blob([decryptedContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container mt-5">
      <h1>Decrypt and Download File</h1>
      <Form>
        <Form.Group className="mt-3">
          <Form.Label>Passphrase</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        </Form.Group>
        <Button className="mt-3" onClick={handleDecrypt}>
          Decrypt File
        </Button>
      </Form>

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}

      {decryptedContent && (
        <div className="mt-3">
          <Alert variant="success">File decrypted successfully!</Alert>
          <Button onClick={handleDownload}>Download File</Button>
        </div>
      )}
    </div>
  );
};

export default ShareLink;
