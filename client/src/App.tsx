import React from 'react';
import FileEncryptor from './components/FileEncryptor';

const App = () => {
  return (
    <div className="container mt-5">
      <h1>Zero-Knowledge File Sharing</h1>
      <FileEncryptor />
    </div>
  );
};

export default App;
