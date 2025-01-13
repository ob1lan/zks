import React, { useState } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const ShareLink: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId') ?? '';

  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const handleDecrypt = async () => {
    setError(null);
    setDecryptedContent(null);

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/decrypt`, {
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
  
    // Decode Base64 content into binary
    const binaryContent = atob(decryptedContent);
    const binaryArray = new Uint8Array(binaryContent.length);
    for (let i = 0; i < binaryContent.length; i++) {
      binaryArray[i] = binaryContent.charCodeAt(i);
    }
  
    const blob = new Blob([binaryArray], { type: 'application/pdf' }); // Adjust MIME type based on the file
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
          <li className="breadcrumb-item"><a href="/">Home</a></li>
          <li className="breadcrumb-item active" aria-current="page">Decrypt</li>
        </ol>
      </nav>
      <h1 className="text-center">Decrypt and Download File</h1>
      <p className="lead">
          Enter the passphrase to decrypt and download the file.
        </p>
        <Form>
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

        {decryptedContent && (
          <div className="mt-3 text-center">
            <Alert variant="success">File decrypted successfully!</Alert>
            <Button className="mt-3 btn-lg" onClick={handleDownload}>Download File</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareLink;