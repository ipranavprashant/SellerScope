import SellerDashboard from './components/SellerDashboard';
import { useState } from 'react';

function App() {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {!csvText ? (
        <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">📊 Sales Dashboard</h1>
          <div className="flex flex-col items-center">
            <label className="block mb-4 text-lg font-medium">
              Upload Sales CSV File
            </label>
            <label className="cursor-pointer bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition-colors">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              Choose File
            </label>
            <p className="mt-4 text-sm text-gray-500">
              Supported format: CSV with Date, ITEMS, PAYMENT, GST, etc.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-semibold">Analyzing: {fileName}</h1>
            <button 
              onClick={() => setCsvText('')}
              className="text-blue-500 hover:text-blue-700"
            >
              Upload Different File
            </button>
          </div>
          <SellerDashboard csvText={csvText} />
        </div>
      )}
    </div>
  );
}

export default App;

