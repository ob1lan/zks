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
      setPassphrase('');
      setPassword('');
      setFileId(null);
      setUploadError(null);
    }
  };

  // Encrypt file in chunks
  const encryptFileInChunks = async (
    file: File,
    passphrase: string,
    iv: string
  ): Promise<string[]> => {
    const chunkSize = 64 * 1024; // 64 KB per chunk
    const fileReader = new FileReader();
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const encryptedChunks: string[] = [];
  
    return new Promise((resolve, reject) => {
      fileReader.onload = (event) => {
        try {
          const chunkData = event.target?.result as ArrayBuffer;
          const wordArray = CryptoJS.lib.WordArray.create(chunkData);
          const encryptedChunk = CryptoJS.AES.encrypt(wordArray, passphrase, {
            iv: CryptoJS.enc.Base64.parse(iv),
          }).toString();
  
          encryptedChunks.push(encryptedChunk); // Push each encrypted chunk
          currentChunk++;
  
          if (currentChunk < totalChunks) {
            readNextChunk();
          } else {
            resolve(encryptedChunks); // Resolve when all chunks are processed
          }
        } catch (error) {
          reject(new Error(error instanceof Error ? error.message : String(error)));
        }
      };
  
      fileReader.onerror = (error) => {
        reject(new Error(error instanceof Error ? error.message : String(error)));
      };
  
      const readNextChunk = () => {
        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const blob = file.slice(start, end);
        fileReader.readAsArrayBuffer(blob);
      };
  
      readNextChunk(); // Start reading chunks
    });
  };
  
  // Encrypt and upload file
  const handleUpload = async () => {
    if (!file) {
      setUploadError('No file selected for encryption.');
      return;
    }
  
    const generatedPassphrase = generatePassphrase();
    setPassphrase(generatedPassphrase);
  
    // Generate IV
    const ivArray = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
  
    setUploading(true);
    setUploadError(null);
  
    try {
      const encryptedChunks = await encryptFileInChunks(file, generatedPassphrase, ivArray);
  
      const formData = new FormData();
      formData.append('chunks', JSON.stringify(encryptedChunks)); // Send encrypted chunks as JSON
      formData.append('iv', ivArray);
      formData.append('filename', file.name);
  
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
      setPassword(response.data.password); // Store password returned by backend
    } catch (error) {
      setUploadError('Failed to upload the file. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  // Reset page state
  const handleReset = () => {
    setFile(null);
    setFileDetails(null);
    setPassphrase('');
    setPassword('');
    setFileId(null);
    setUploadError(null);
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mt-5">
      <div className="container w-75">
        <h1 className="text-center">Zero-Knowledge File Sharing</h1>
        <p className="lead">
          Select a file to securely encrypt and upload. A passphrase and password will be generated. Share them with the
          recipient to allow decryption.
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
            {fileId ? (
              <Button className="mt-3 btn-lg" onClick={handleReset} variant="secondary">
                Reset
              </Button>
            ) : (
              <Button className="mt-3 btn-lg" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Spinner animation="border" size="sm" /> : 'Securely Upload'}
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
    </div>
  );
};

export default FileEncryptor;
