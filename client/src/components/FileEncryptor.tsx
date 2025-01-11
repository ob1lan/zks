import React, { useState } from 'react';
import { Button, Form, Alert, Spinner } from 'react-bootstrap';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const FileEncryptor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [encryptedFile, setEncryptedFile] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  // Generate a strong passphrase
  const generatePassphrase = () => {
    const randomBytes = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    return randomBytes;
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  // Encrypt the file
  const encryptFile = async () => {
    if (!file) return;

    const passphrase = generatePassphrase();
    setPassphrase(passphrase);

    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = reader.result as string;
      const encrypted = CryptoJS.AES.encrypt(fileContent, passphrase).toString();
      const encryptedBlob = new Blob([encrypted], { type: file.type });
      setEncryptedFile(encryptedBlob);
    };
    reader.readAsText(file);
  };

  // Upload the file
  const uploadFile = async () => {
    if (!encryptedFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('ciphertext', await encryptedFile.text());
      formData.append('filename', file?.name || '');
      formData.append('iv', '[]'); // Replace with actual IV
      formData.append('salt', '[]'); // Replace with actual salt

      const response = await axios.post('http://localhost:4000/api/upload', formData);
      setFileId(response.data.fileId);
    } catch (error) {
      setUploadError('Failed to upload the file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h1>File Sharing with Encryption</h1>
      <Form>
        <Form.Group>
          <Form.Label>Choose a file</Form.Label>
          <Form.Control type="file" onChange={handleFileChange} />
        </Form.Group>
        <Button
          className="mt-3"
          onClick={encryptFile}
          disabled={!file || passphrase !== ''}
        >
          Encrypt File
        </Button>
      </Form>

      {passphrase && (
        <Alert variant="info" className="mt-3">
          Passphrase: <strong>{passphrase}</strong>
          <br />
          Note: This passphrase will not be shown again. Save it securely!
        </Alert>
      )}

      {encryptedFile && (
        <Button
          className="mt-3"
          onClick={uploadFile}
          disabled={uploading}
        >
          {uploading ? <Spinner animation="border" size="sm" /> : 'Upload File'}
        </Button>
      )}

      {uploadError && (
        <Alert variant="danger" className="mt-3">
          {uploadError}
        </Alert>
      )}

      {fileId && (
        <Alert variant="success" className="mt-3">
          File uploaded successfully! Share this link with the recipient: <br />
          <a href={`http://localhost:4000/api/file/${fileId}`}>
            http://localhost:4000/api/file/{fileId}
          </a>
        </Alert>
      )}
    </div>
  );
};

export default FileEncryptor;
