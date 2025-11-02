import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Profile = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        codeforcesHandle: user?.codeforcesHandle || ''
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [warning, setWarning] = useState('');
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                codeforcesHandle: user.codeforcesHandle || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
        setWarning('');
    };

    const verifyCodeforcesHandle = async () => {
        if (!formData.codeforcesHandle.trim()) {
            setError('Please enter a Codeforces handle');
            return false;
        }

        setVerifying(true);
        setWarning('');
        setError('');
        setSuccess('');
        
        try {
            const response = await api.post('/auth/verify-codeforces', {
                handle: formData.codeforcesHandle
            }, {
                timeout: 20000 // 20 second timeout
            });
            
            if (response.data.success) {
                if (response.data.warning) {
                    setWarning(response.data.warning);
                    setSuccess(response.data.message);
                } else {
                    setSuccess('Codeforces handle verified successfully! ✓');
                }
                return true;
            }
            return false;
        } catch (err) {
            // Even on error, allow saving
            setWarning('Verification timed out. You can still save your handle - just make sure it\'s correct.');
            setSuccess('Handle will be saved without verification');
            return true;
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setLoading(true);
        setError('');
        setSuccess('');
        setWarning('');

        try {
            const response = await api.patch('/auth/profile', {
                userId: user.id,
                codeforcesHandle: formData.codeforcesHandle
            });

            if (response.data.success) {
                setSuccess('Profile updated successfully!');
                // Update user in context with all fields
                updateUser({
                    codeforcesHandle: formData.codeforcesHandle,
                    score: response.data.user.score
                });
            }
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Profile Settings</h1>
                        <p className="text-purple-100 text-sm sm:text-base">Manage your account and battle preferences</p>
                    </div>
                    <button
                        onClick={() => navigate('/home')}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white/30 transition font-semibold shadow-lg border border-white/30"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
                    {/* Profile Header */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-gray-200">
                        <div className="relative group">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white text-4xl sm:text-5xl font-bold shadow-xl ring-4 ring-white">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        </div>
                        <div className="text-center sm:text-left flex-1">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">{user?.username}</h2>
                            <p className="text-gray-600 mb-3 text-sm sm:text-base">{user?.email}</p>
                            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-bold shadow-md">
                                    ⭐ Score: {user?.score || 0}
                                </span>
                                {user?.codeforcesHandle && (
                                    <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm font-bold shadow-md">
                                        👤 CF: {user.codeforcesHandle}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Alert Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-3 text-sm text-red-700">{error}</span>
                            </div>
                        </div>
                    )}

                    {warning && (
                        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-3 text-sm text-yellow-700">{warning}</span>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-3 text-sm text-green-700">{success}</span>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Username */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        disabled
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed outline-none text-gray-600"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">🔒 Username cannot be changed</p>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed outline-none text-gray-600"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">🔒 Email cannot be changed</p>
                            </div>
                        </div>

                        {/* Codeforces Handle */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Codeforces Handle <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        name="codeforcesHandle"
                                        value={formData.codeforcesHandle}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all bg-white hover:border-gray-300"
                                        placeholder="Enter Codeforces handle"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={verifyCodeforcesHandle}
                                    disabled={verifying || !formData.codeforcesHandle}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {verifying ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Verifying...
                                        </span>
                                    ) : '✓ Verify'}
                                </button>
                            </div>
                            <div className="mt-3 space-y-2">
                                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <span className="font-bold">⚠️ Required:</span> You need a Codeforces handle to participate in battles.
                                </p>
                                <p className="text-xs text-gray-600">
                                    💡 Enter your Codeforces username (e.g., "tourist", "Benq")
                                </p>
                                <a 
                                    href="https://codeforces.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                                >
                                    Don't have a Codeforces account? Create one →
                                </a>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Updating...
                                    </span>
                                ) : '💾 Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/home')}
                                className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all font-bold text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </form>

                    {/* Info Sections */}
                    <div className="mt-8 space-y-4">
                        {/* Why Codeforces */}
                        <div className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                            <h3 className="text-base font-bold text-blue-900 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Why Codeforces Handle?
                            </h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-2">✓</span>
                                    <span>Required to participate in coding battles</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-2">✓</span>
                                    <span>We fetch problems based on your skill level</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-2">✓</span>
                                    <span>Track your progress and solved problems</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-2">✓</span>
                                    <span>Compete with other coders in real-time</span>
                                </li>
                            </ul>
                        </div>

                        {/* Troubleshooting */}
                        <div className="p-5 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200">
                            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                Troubleshooting
                            </h3>
                            <ul className="space-y-2 text-xs text-gray-700">
                                <li className="flex items-start">
                                    <span className="text-gray-500 mr-2">•</span>
                                    <span>If verification fails, check your internet connection</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-gray-500 mr-2">•</span>
                                    <span>Ensure your Codeforces handle is spelled correctly</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-gray-500 mr-2">•</span>
                                    <span>You can save without verification and verify later</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-gray-500 mr-2">•</span>
                                    <span>Verification may take 15-20 seconds</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                
                .animate-shake {
                    animation: shake 0.5s;
                }
            `}</style>
        </div>
    );
};

export default Profile;
