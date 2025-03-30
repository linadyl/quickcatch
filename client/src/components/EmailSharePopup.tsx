import React, { useState } from 'react';

interface EmailSharePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
  teamName?: string;
}

const EmailSharePopup: React.FC<EmailSharePopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
  teamName
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setSending(true);
    setError(null);
    onSubmit(email);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-lime-100 bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative border border-lime-300">
        <div className="bg-gradient-to-r from-lime-50 to-white absolute inset-x-0 top-0 h-16 rounded-t-2xl"></div>
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl flex items-center justify-center bg-white rounded-full h-8 w-8 border border-gray-300 hover:border-red-300 shadow-sm transition-colors z-10"
        >
          ✕
        </button>
        
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Send {teamName} Analysis to Email
          </h3>
          
          <p className="text-gray-600 mb-4">
            Enter your email address to receive this {teamName} highlight analysis.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 border border-gray-300"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-lime-600 rounded-md hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-lime-500 shadow-sm"
                disabled={sending}
              >
                {sending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Analysis'
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Decorative element */}
        <div className="absolute bottom-3 left-3 w-16 h-16 rounded-full bg-lime-100 opacity-50 -z-10"></div>
        <div className="absolute top-12 right-4 w-8 h-8 rounded-full bg-lime-200 opacity-30 -z-10"></div>
      </div>
    </div>
  );
};

export default EmailSharePopup;