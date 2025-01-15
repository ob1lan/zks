# ZKS: Secure File Encryption and Decryption System
ZKS is a web-based application for securely encrypting and sharing files. It leverages modern cryptographic techniques and integrates AWS S3 for efficient file storage.

## Features
### Client (Frontend)
- User-friendly interface built with React and React Router.
- File encryption with customizable parameters.
- Shareable links for secure file access.

### Server (Backend)
- Powered by Node.js and Express.
- File storage and retrieval via AWS S3.
- File encryption using CryptoJS.
- Routes for file upload, decryption, and metadata management.

## Getting Started
### Prerequisites
- Node.js
- AWS credentials with S3 bucket access
- A frontend environment (e.g., React development server)

### Installation
1. Clone the repository:

```
git clone https://github.com/ob1lan/zks.git
cd zks
```

2. Install dependencies:

- Frontend:

```
cd client
npm install
```

- Backend:

```
cd server
npm install
```

3. Set up environment variables: Create .env files in both the client and server directories:

- Frontend .env:

```
REACT_APP_BACKEND_URL=http://localhost:5000
```

- Backend .env:

```
FRONTEND_URL=http://localhost:3000
BUCKET_NAME=<Your-S3-Bucket-Name>
AWS_ACCESS_KEY_ID=<Your-AWS-Access-Key>
AWS_SECRET_ACCESS_KEY=<Your-AWS-Secret-Key>
REGION=<Your-AWS-Region>
```
### Usage
1. Start the backend server:

```
cd server
npm start
```

2. Start the frontend server:

```
cd client
npm start
```

3. Open the application in your browser at http://localhost:3000.

## API Endpoints
### File Upload
- POST /api/upload
    - Accepts a file and its metadata (IV, password, filename).

### File Decryption
- POST /api/decrypt
    - Requires file ID and decryption passphrase.

### Tech Stack
- Frontend: React, React-Bootstrap
- Backend: Node.js, Express
- Storage: AWS S3
- Encryption: CryptoJS
- Dev Tools: Webpack, TypeScript
