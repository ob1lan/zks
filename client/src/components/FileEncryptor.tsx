import React, { useState } from 'react';
import { Button, Form, Alert, Spinner } from 'react-bootstrap';
import CryptoJS from 'crypto-js';
import axios from 'axios';

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const frontendUrl = process.env.REACT_APP_FRONTEND_URL ?? 'http://localhost:3000';

const FileEncryptor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [encryptedFile, setEncryptedFile] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  const [iv, setIv] = useState<string | null>(null);
  const [salt, setSalt] = useState<string | null>(null);

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

  const encryptFile = async () => {
    if (!file) {
      setUploadError("No file selected for encryption.");
      return;
    }
  
    const generatedPassphrase = generatePassphrase();
    setPassphrase(generatedPassphrase);
  
    // Generate IV and salt
    const ivArray = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
    const saltArray = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
    setIv(ivArray);
    setSalt(saltArray);
  
    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = new Uint8Array(reader.result as ArrayBuffer);
  
      // Encrypt binary data
      const wordArray = CryptoJS.lib.WordArray.create(fileContent);
      const encrypted = CryptoJS.AES.encrypt(wordArray, generatedPassphrase, {
        iv: CryptoJS.enc.Base64.parse(ivArray),
      }).toString();
  
      const encryptedBlob = new Blob([encrypted], { type: "application/octet-stream" });
      setEncryptedFile(encryptedBlob);
    };
    reader.readAsArrayBuffer(file);
  };
  
  const uploadFile = async () => {
    if (!encryptedFile || !iv || !salt) {
      setUploadError("Missing required fields: IV, salt, or encrypted file.");
      return;
    }
  
    setUploading(true);
    setUploadError(null);
  
    const formData = new FormData();
    formData.append("file", encryptedFile, file?.name || "file");
    formData.append("iv", iv);
    formData.append("salt", salt);
    formData.append("filename", file?.name || "");
  
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      setFileId(response.data.fileId);
    } catch (error) {
      setUploadError("Failed to upload the file. Please try again.");
    } finally {
      setUploading(false);
    }
  };  

  return (
    <div className="container mt-5">
      <h1>File Sharing with Encryption</h1>
      <Form>
        {/* File Input */}
        <Form.Group>
          <Form.Label>Choose a file</Form.Label>
          <Form.Control type="file" onChange={handleFileChange} />
        </Form.Group>

        {/* Encrypt Button */}
        <Button className="mt-3" onClick={encryptFile} disabled={!file || passphrase !== ''}>
          Encrypt File
        </Button>
      </Form>

      {/* Passphrase Display */}
      {passphrase && (
        <Alert variant="info" className="mt-3">
          Passphrase: <strong>{passphrase}</strong>
          <br />
          <b>Note:</b> This passphrase is required to decrypt the file. Save it securely. It will <strong>not</strong> be stored or recoverable by us.
        </Alert>
      )}

      {/* Upload Button */}
      {encryptedFile && (
        <Button className="mt-3" onClick={uploadFile} disabled={uploading}>
          {uploading ? <Spinner animation="border" size="sm" /> : 'Upload File'}
        </Button>
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
          <strong>Note:</strong> Share the passphrase securely with the recipient. Without it, the file cannot be decrypted.
        </Alert>
      )}
    </div>
  );
};

export default FileEncryptor;
