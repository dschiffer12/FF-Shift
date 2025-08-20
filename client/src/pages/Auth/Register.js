import React from 'react';
import { Link } from 'react-router-dom';

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Register Page</h1>
        <p className="mb-4">Registration functionality coming soon...</p>
        <Link to="/login" className="text-primary-600 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default Register;
