import React, { useState } from 'react';
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import Button from '../UI/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';

const StationImport = () => {
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

      const response = await api.post('/admin/import-stations', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResults(response.data.results);
      toast.success(`Import completed! ${response.data.results.created} stations created, ${response.data.results.skipped} skipped.`);
      
      // Clear the file after successful upload
      setFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['name', 'number', 'address', 'totalCapacity', 'shiftACapacity', 'shiftBCapacity', 'shiftCCapacity', 'description', 'phoneNumber', 'email', 'isActive', 'preferredRanks'],
      ['Central Fire Station', '1', '123 Main St, City, State 12345', '18', '6', '6', '6', 'Main downtown fire station', '555-1234', 'station1@city.gov', 'true', 'Firefighter,Engineer,Lieutenant'],
      ['North Fire Station', '2', '456 North Ave, City, State 12345', '15', '5', '5', '5', 'North district station', '555-5678', 'station2@city.gov', 'true', 'Firefighter,Paramedic'],
      ['South Fire Station', '3', '789 South Blvd, City, State 12345', '12', '4', '4', '4', 'South district station', '555-9012', 'station3@city.gov', 'true', 'Firefighter,EMT']
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'station_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Import Stations from Excel</h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload an Excel file to bulk import fire stations into the system
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: 'name', required: true, description: 'Station name' },
                { name: 'number', required: true, description: 'Station number' },
                { name: 'address', required: true, description: 'Full address' },
                { name: 'totalCapacity', required: true, description: 'Total capacity' },
                { name: 'shiftACapacity', required: true, description: 'Shift A capacity' },
                { name: 'shiftBCapacity', required: true, description: 'Shift B capacity' },
                { name: 'shiftCCapacity', required: true, description: 'Shift C capacity' },
                { name: 'description', required: false, description: 'Station description' },
                { name: 'phoneNumber', required: false, description: 'Contact phone' },
                { name: 'email', required: false, description: 'Contact email' },
                { name: 'isActive', required: false, description: 'Active status (true/false)' },
                { name: 'preferredRanks', required: false, description: 'Preferred ranks (comma-separated)' }
              ].map((column) => (
                <div key={column.name} className="flex items-start space-x-2">
                  <div>
                    <span className={`text-sm font-medium ${column.required ? 'text-red-600' : 'text-gray-600'}`}>
                      {column.name}
                    </span>
                    {column.required && <span className="text-red-500 ml-1">*</span>}
                    <div className="text-xs text-gray-500 mt-1">{column.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Station numbers must be unique and greater than 0</li>
              <li>• Capacity values must be non-negative numbers</li>
              <li>• The sum of shift capacities should equal total capacity</li>
              <li>• Preferred ranks should be comma-separated (e.g., "Firefighter,Engineer,Lieutenant")</li>
              <li>• isActive should be "true" or "false" (defaults to true if not specified)</li>
            </ul>
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
                <div className="text-sm text-green-700">Stations Created</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
                <div className="text-sm text-yellow-700">Stations Skipped</div>
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

export default StationImport;
