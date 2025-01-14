import React, { useRef, useState } from 'react';
import { Button, Form, Spinner, Table } from 'react-bootstrap';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const frontendUrl = process.env.REACT_APP_FRONTEND_URL ?? 'http://localhost:3000';

const FileEncryptor: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; type: string; size: number } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  const generateKey = (length: number) => CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFileDetails({
        name: selectedFile.name,
        type: selectedFile.type || 'Unknown',
        size: selectedFile.size,
      });
      setPassphrase('');
      setPassword('');
      setFileId(null);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('No file selected for encryption.');
      return;
    }

    const generatedPassphrase = generateKey(32);
    const generatedPassword = generateKey(16);
    setPassphrase(generatedPassphrase);
    setPassword(generatedPassword);

    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = new Uint8Array(reader.result as ArrayBuffer);
      const wordArray = CryptoJS.lib.WordArray.create(fileContent);

      // Encrypt the file content
      const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
      const encrypted = CryptoJS.AES.encrypt(wordArray, generatedPassphrase, {
        iv: CryptoJS.enc.Hex.parse(iv),
      }).toString();

      const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' });

      const formData = new FormData();
      formData.append('file', encryptedBlob, file.name);
      formData.append('iv', iv);
      formData.append('password', generatedPassword);
      formData.append('filename', file.name);

      try {
        setUploading(true);
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/upload`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
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

  const handleReset = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFile(null);
    setFileDetails(null);
    setPassphrase('');
    setPassword('');
    setFileId(null);
    setUploadError(null);
    setUploading(false);
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">Zero-Knowledge File Sharing</h1>
      <p className="lead">
        Select a file to securely encrypt and upload. A passphrase and password will be generated for encryption. Share
        them with the recipient to allow them to decrypt the file.
      </p>
      <Form>
        <Form.Group>
          <Form.Control type="file" ref={fileInputRef} onChange={handleFileChange} />
        </Form.Group>
      </Form>

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
            {passphrase && (
              <tr>
                <td>Passphrase</td>
                <td>
                  <strong>{passphrase}</strong>
                </td>
              </tr>
            )}
            {password && (
              <tr>
                <td>Password</td>
                <td>
                  <strong>{password}</strong>
                </td>
              </tr>
            )}
            {fileId && (
              <tr>
                <td>Shareable Link</td>
                <td>
                  <a href={`${frontendUrl}/decrypt?fileId=${fileId}`} target="_blank" rel="noopener noreferrer">
                    {`${frontendUrl}/decrypt?fileId=${fileId}`}
                  </a>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}

      {fileDetails && (
        <div className="text-center">
          {!fileId ? (
            <Button onClick={handleUpload} disabled={uploading} className="mt-3 btn-lg">
              {uploading ? <Spinner animation="border" size="sm" /> : 'Securely Upload'}
            </Button>
          ) : (
            <Button onClick={handleReset} variant="secondary" className="mt-3 btn-lg">
              Reset
            </Button>
          )}
        </div>
      )}

      {uploadError && (
        <div className="mt-3">
          <p className="text-danger">{uploadError}</p>
        </div>
      )}
    </div>
  );
};

export default FileEncryptor;
