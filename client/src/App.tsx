import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FileEncryptor from './components/FileEncryptor';
import ShareLink from './components/ShareLink';

const App = () => {
  return (
    <Router>
      <div className="container mt-5">
        <Routes>
          <Route path="/" element={<FileEncryptor />} />
          <Route path="/decrypt" element={<ShareLink />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;