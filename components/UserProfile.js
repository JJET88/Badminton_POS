"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import useAuthStore from "@/app/store/useAuthStore";
import { useParams, useRouter } from "next/navigation";
import LogoutBtn from "./LogoutBtn";

export default function UserProfile() {
  const params = useParams();
  const userId = params.id;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const authUser = useAuthStore((s) => s.user);

  const router = useRouter();

  // Fetch user on mount
  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error);
      }
      
      const data = await res.json();
      setUser(data);
      setName(data.name);
      setEmail(data.email);
    } catch (err) {
      toast.error(err.message || 'Failed to load user');
      console.error('❌ Fetch user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!name || name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long');
      return;
    }

    if (!email || !email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password validation if provided
    if (password) {
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }
    
    try {
      setIsUpdating(true);
      
      const updateData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: user.role
      };

      // Only include password if it's not empty
      if (password && password.trim() !== "") {
        updateData.password = password;
      }

      console.log('📤 Updating user:', { ...updateData, password: updateData.password ? '***' : undefined });

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || 'Update failed');
      }
      
      const updatedUser = await res.json();
      console.log('✅ User updated:', updatedUser);
      
      setUser(updatedUser);
      
      // Update auth store only if updating own profile
      if (authUser?.id == userId) {
        updateAuthUser({ name: updatedUser.name, email: updatedUser.email });
      }
      
      // Clear password fields
      setPassword("");
      setConfirmPassword("");
      
      toast.success('✅ Profile updated successfully!');
      
      // Redirect after 1 second
      setTimeout(() => {
        router.push("/");
      }, 1000);
      
    } catch (err) {
      toast.error(err.message || 'Update failed');
      console.error('❌ Update error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-96">
            <div className="h-20 w-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-600 mb-6">The user you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            User Profile
          </h2>
          <p className="text-gray-600">Update your personal information</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-gray-900 font-medium mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              minLength={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-900 font-medium mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Password Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Change Password (Optional)
            </h3>
            
            {/* New Password */}
            <div className="mb-4">
              <label className="block text-gray-900 font-medium mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                minLength={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              {password && password.length < 6 && (
                <p className="text-xs text-red-600 mt-1">
                  ❌ Password must be at least 6 characters
                </p>
              )}
              {password && password.length >= 6 && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Password length is valid
                </p>
              )}
            </div>

            {/* Confirm Password - Only show if password is entered */}
            {password && (
              <div>
                <label className="block text-gray-900 font-medium mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  minLength={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    ❌ Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 mt-1">
                    ✅ Passwords match
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 items-center pt-4">
            <button
              type="submit"
              disabled={isUpdating || (password && password !== confirmPassword)}
              className="flex-1 bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-white font-semibold py-3 px-6 rounded-lg"
            >
              {isUpdating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Updating...
                </span>
              ) : 'Update Profile'}
            </button>
            <LogoutBtn />
          </div>
        </form>

        {/* User Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Role:</span>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                user.role === 'admin' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {user.role.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">User ID:</span>
              <span className="text-gray-900 font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Member since:</span>
              <span className="text-gray-900">
                {new Date(user.created_at || user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}