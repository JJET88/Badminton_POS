"use client";

import Link from "next/link";

export default function AccessDeny() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden p-4">
      {/* Soft floating blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply blur-2xl opacity-70 animate-blob" />
        <div className="absolute -top-32 -right-32 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply blur-2xl opacity-70 animate-blob-delay-2" />
        <div className="absolute bottom-0 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply blur-2xl opacity-70 animate-blob-delay-4" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl p-10 text-center">
          {/* Icon Box */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg transform transition hover:scale-110">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Text */}
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-8">
            You do not have permission to access the admin dashboard.
            
          </p>

          {/* Button */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Go to Login
          </Link>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-blob-delay-2 {
          animation: blob 7s infinite;
          animation-delay: 2s;
        }
        
        .animate-blob-delay-4 {
          animation: blob 7s infinite;
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}