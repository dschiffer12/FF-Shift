import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Button from '../UI/Button';
import toast from 'react-hot-toast';

const UserImport = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const isValidFile = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const validExtensions = ['.xlsx', '.xls'];
    
    const isValidType = validTypes.includes(file.type);
    const isValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!isValidType && !isValidExtension) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return false;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('File size must be less than 5MB');
      return false;
    }
    
    return true;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import-users', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResults(data.results);
      toast.success(`Import completed! ${data.results.created} users created, ${data.results.skipped} skipped.`);
      
      // Clear the file after successful upload
      setFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['firstName', 'lastName', 'email', 'employeeId', 'rank', 'position', 'yearsOfService'],
      ['John', 'Doe', 'john.doe@example.com', '1234', 'Firefighter', 'Firefighter', '5'],
      ['Jane', 'Smith', 'jane.smith@example.com', '5678', 'Lieutenant', 'Paramedic', '8']
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Import Users from Excel</h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload an Excel file to bulk import users into the system
          </p>
        </div>
        
        <div className="card-body">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-rigroster-red bg-rigroster-red/5' 
                : 'border-gray-300 hover:border-rigroster-red'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            
            {!file ? (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your Excel file here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports .xlsx and .xls files up to 5MB
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button as="span" variant="outline">
                    Choose File
                  </Button>
                </label>
              </div>
            ) : (
              <div>
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  File selected: {file.name}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="space-x-2">
                  <Button onClick={handleUpload} loading={isUploading}>
                    {isUploading ? 'Uploading...' : 'Upload & Import'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                  >
                    Remove File
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Template Download */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Need a template?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Download our Excel template with the correct column headers
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* Required Columns Info */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Required Columns:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'firstName', required: true },
                { name: 'lastName', required: true },
                { name: 'email', required: true },
                { name: 'employeeId', required: true },
                { name: 'rank', required: false },
                { name: 'position', required: false },
                { name: 'yearsOfService', required: false }
              ].map((column) => (
                <div key={column.name} className="flex items-center space-x-2">
                  <span className={`text-sm ${column.required ? 'text-red-600' : 'text-gray-600'}`}>
                    {column.name}
                  </span>
                  {column.required && <span className="text-red-500">*</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Import Results</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.created}</div>
                <div className="text-sm text-green-700">Users Created</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
                <div className="text-sm text-yellow-700">Users Skipped</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{results.total}</div>
                <div className="text-sm text-gray-700">Total Rows</div>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Errors:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-red-900">
                          Row {error.row}
                        </div>
                        <div className="text-sm text-red-700">
                          {error.error}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserImport;
