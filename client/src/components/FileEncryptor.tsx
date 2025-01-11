import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Table } from 'react-bootstrap';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const frontendUrl = process.env.REACT_APP_FRONTEND_URL ?? 'http://localhost:3000';

const FileEncryptor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; type: string; size: number } | null>(null);
  const [passphrase, setPassphrase] = useState('');
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
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFileDetails({
        name: selectedFile.name,
        type: selectedFile.type || 'Unknown',
        size: selectedFile.size,
      });
      setPassphrase(''); // Reset passphrase when a new file is selected
      setFileId(null); // Reset fileId
      setUploadError(null); // Reset any errors
    }
  };

  // Encrypt and upload file
  const handleUpload = async () => {
    if (!file) {
      setUploadError('No file selected for encryption.');
      return;
    }

    const generatedPassphrase = generatePassphrase();
    setPassphrase(generatedPassphrase);

    // Generate IV and salt
    const ivArray = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
    const saltArray = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);

    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = new Uint8Array(reader.result as ArrayBuffer);

      // Encrypt binary data
      const wordArray = CryptoJS.lib.WordArray.create(fileContent);
      const encrypted = CryptoJS.AES.encrypt(wordArray, generatedPassphrase, {
        iv: CryptoJS.enc.Base64.parse(ivArray),
      }).toString();

      const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' });

      // Upload the encrypted file
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', encryptedBlob, file.name);
      formData.append('iv', ivArray);
      formData.append('salt', saltArray);
      formData.append('filename', file.name);

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        setFileId(response.data.fileId);
      } catch (error) {
        setUploadError('Failed to upload the file. Please try again.');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Zero-Knowledge File Sharing</h1>
      <div className="container w-75">
        <p className="lead">
          Select a file to securely encrypt and upload. A passphrase will be generated for the encryption. Share the
          passphrase with the recipient to allow them to decrypt the file.
        </p>
        <Form>
          <Form.Group>
            <Form.Control type="file" onChange={handleFileChange} />
          </Form.Group>
        </Form>

        {/* File Details */}
        {fileDetails && (
          <Table striped bordered hover className="mt-3">
            <tbody>
              <tr>
                <td>File Name</td>
                <td>{fileDetails.name}</td>
              </tr>
              <tr>
                <td>File Type</td>
                <td>{fileDetails.type}</td>
              </tr>
              <tr>
                <td>File Size</td>
                <td>{(fileDetails.size / 1024).toFixed(2)} KB</td>
              </tr>
            </tbody>
          </Table>
        )}

        {/* Securely Upload Button */}
        {fileDetails && (
          <div className="text-center">
            <Button className="mt-3 btn-lg" onClick={handleUpload} disabled={uploading}>
              {uploading ? <Spinner animation="border" size="sm" /> : 'Securely Upload'}
            </Button>
          </div>
        )}

        {/* Passphrase Display */}
        {passphrase && (
          <Alert variant="danger" className="mt-3">
            <b>Passphrase:</b> <br />
            <pre>{passphrase}</pre>
            <br />
            <b>Note:</b> This passphrase is required to decrypt the file. Save it securely. It will <strong>not</strong>{' '}
            be stored or recoverable by us.
          </Alert>
        )}

        {/* Error Message */}
        {uploadError && (
          <Alert variant="danger" className="mt-3">
            {uploadError}
          </Alert>
        )}

        {/* Success Message */}
        {fileId && (
          <Alert variant="success" className="mt-3">
            File uploaded successfully! Share this link with the recipient: <br />
            <a href={`${frontendUrl}/decrypt?fileId=${fileId}`} target="_blank" rel="noopener noreferrer">
              {`${frontendUrl}/decrypt?fileId=${fileId}`}
            </a>
            <br />
            <strong>Note:</strong> Share the passphrase securely with the recipient. Without it, the file cannot be
            decrypted.
          </Alert>
        )}
      </div>
    </div>
  );
};

export default FileEncryptor;
