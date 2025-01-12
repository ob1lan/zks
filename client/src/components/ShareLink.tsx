import React, { useState } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const ShareLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId') ?? '';

  const [passphrase, setPassphrase] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false); // To manage decrypting state

  const handleDecrypt = async () => {
    setError(null);
    setDecryptedContent(null);
    setIsDecrypting(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/decrypt`, {
        fileId,
        passphrase,
        password,
      });

      setFilename(response.data.filename);
      setDecryptedContent(response.data.content); // Set decrypted content
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.error || 'Decryption failed. Please check your passphrase and password.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownload = () => {
    if (!decryptedContent || !filename) return;

    const binaryContent = atob(decryptedContent);
    const binaryArray = new Uint8Array(binaryContent.length);
    for (let i = 0; i < binaryContent.length; i++) {
      binaryArray[i] = binaryContent.charCodeAt(i);
    }

    const blob = new Blob([binaryArray], { type: 'application/pdf' }); // Adjust MIME type if needed
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
      <div className="container w-75">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <a href="/">Home</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Decrypt
            </li>
          </ol>
        </nav>
        <h1 className="text-center">Decrypt and Download File</h1>
        <p className="lead">Enter the passphrase to decrypt and download the file.</p>
        <Form>
          <Form.Group>
            <Form.Control
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Control
              type="password"
              placeholder="Enter passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </Form.Group>
          <div className="text-center">
            {!decryptedContent && (
              <Button
                className="mt-3 btn-lg"
                onClick={handleDecrypt}
                disabled={!(fileId && passphrase && password) || isDecrypting}
              >
                {isDecrypting ? 'Decrypting...' : 'Decrypt File'}
              </Button>
            )}
          </div>
        </Form>

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}

        {decryptedContent && (
          <div className="mt-3">
            <Alert variant="success">File decrypted successfully!</Alert>
            <div className="text-center">
              <Button className="mt-3 btn-lg" onClick={handleDownload}>
                Download File
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareLink;
