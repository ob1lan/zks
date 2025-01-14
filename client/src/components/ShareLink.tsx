import React, { useState } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const ShareLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId') ?? '';

  const [password, setPassword] = useState(''); // Password state
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const handleDecrypt = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/decrypt`,
        { fileId, passphrase, password },
        { responseType: 'blob' }
      );
  
      // Extract the filename from the Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      console.log('Filename match:', filenameMatch);
      const extractedFilename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'download';
  
      setFilename(extractedFilename);
  
      // Create a blob and trigger download
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = extractedFilename; // Use the extracted filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      setError(null); // Clear errors on success
    } catch (error) {
      console.error('Decryption failed:', error);
      setError('Decryption failed. Please check your passphrase and password.');
    }
  };
  

  return (
    <div className="container mt-5">
      <div className="container w-75">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="/">Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Decrypt</li>
          </ol>
        </nav>
        <h1 className="text-center">Decrypt and Download File</h1>
        <p className="lead">
          Enter the password and passphrase to decrypt and download the file.
        </p>
        <Form>
          <Form.Group className="mt-3">
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
            <Button className="mt-3 btn-lg" onClick={handleDecrypt}>
              Decrypt File
            </Button>
          </div>
        </Form>

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}

        {filename && !error && (
          <Alert variant="success" className="mt-3">
            File <strong>{filename}</strong> decrypted and downloaded successfully!
          </Alert>
        )}
      </div>
    </div>
  );
};

export default ShareLink;
