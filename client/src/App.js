import React from 'react';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>FF Shift - Deployment Test</h1>
            <p>If you can see this, the deployment is working!</p>
            <p>Current time: {new Date().toLocaleString()}</p>
          </div>
        } />
        <Route path="*" element={
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>404 - Page Not Found</h1>
            <p>This is a test page for the 404 route.</p>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
