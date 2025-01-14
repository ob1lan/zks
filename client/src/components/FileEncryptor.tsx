import React, { useRef, useState } from 'react';
import { Button, Form, Spinner, Table } from 'react-bootstrap';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const frontendUrl = process.env.REACT_APP_FRONTEND_URL ?? 'http://localhost:3000';

const FileEncryptor: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; type: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [password, setPassword] = useState('');

  const generateKey = (length: number) => CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      const file = event.target.files[0];
      setFileDetails({
        name: file.name,
        type: file.type || 'Unknown',
        size: file.size,
      });
      setUploadError(null);
      setFileId(null);
      setPassphrase('');
      setPassword('');
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) {
      setUploadError('No file selected.');
      return;
    }

    const file = fileInputRef.current.files[0];
    const generatedPassphrase = generateKey(32);
    const generatedPassword = generateKey(16);
    setPassphrase(generatedPassphrase);
    setPassword(generatedPassword);

    const reader = file.stream().getReader();
    const encryptedChunks: BlobPart[] = [];
    const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const wordArray = CryptoJS.lib.WordArray.create(value);
      const encryptedChunk = CryptoJS.AES.encrypt(wordArray, generatedPassphrase, {
        iv: CryptoJS.enc.Hex.parse(iv),
      }).toString();
      encryptedChunks.push(encryptedChunk);
    }

    const encryptedBlob = new Blob(encryptedChunks, { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', encryptedBlob, file.name);
    formData.append('iv', iv);
    formData.append('password', password);
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
      setUploadError('Failed to upload the file.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFileDetails(null);
    setFileId(null);
    setPassphrase('');
    setPassword('');
    setUploadError(null);
    setUploading(false);
  };

  return (
    <div className="container mt-5">
      <h1>Zero-Knowledge File Sharing</h1>
      <Form>
        <Form.Control type="file" ref={fileInputRef} onChange={handleFileChange} />
      </Form>
      {fileDetails && (
        <Table striped bordered hover className="mt-3">
          <tbody>
            <tr><td>File Name</td><td>{fileDetails.name}</td></tr>
            <tr><td>File Size</td><td>{(fileDetails.size / 1024).toFixed(2)} KB</td></tr>
            {passphrase && <tr><td>Passphrase</td><td><code>{passphrase}</code></td></tr>}
            {password && <tr><td>Password</td><td><code>{password}</code></td></tr>}
            {fileId && <tr><td>Shareable Link</td><td><a href={`${frontendUrl}/decrypt?fileId=${fileId}`}>{`${frontendUrl}/decrypt?fileId=${fileId}`}</a></td></tr>}
          </tbody>
        </Table>
      )}
      <div>
        {fileDetails && !fileId && (
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? <Spinner size="sm" animation="border" /> : 'Securely Upload'}
          </Button>
        )}
        {fileId && <Button variant="secondary" onClick={handleReset}>Reset</Button>}
      </div>
      {uploadError && <div className="text-danger">{uploadError}</div>}
    </div>
  );
};

export default FileEncryptor;
