import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const JoinRoom = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    
    const [formData, setFormData] = useState({
        roomId: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [requirePassword, setRequirePassword] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();

        if (!formData.roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }

        if (!socket || !connected) {
            setError('Not connected to server. Please try again.');
            return;
        }

        setLoading(true);
        setError('');

        // Emit join-room event
        socket.emit('join-room', {
            roomId: formData.roomId.toUpperCase(),
            userId: user.id,
            username: user.username,
            password: formData.password || null
        });

        // Listen for responses
        const handleRoomJoined = (data) => {
            if (data.success) {
                navigate(`/room/${data.room.roomId}`);
            }
            setLoading(false);
        };

        const handleError = (errorData) => {
            setError(errorData.message);
            setLoading(false);
            
            // If error is about password, show password field
            if (errorData.message.includes('password')) {
                setRequirePassword(true);
            }
        };

        socket.once('room-joined', handleRoomJoined);
        socket.once('error', handleError);

        // Cleanup listeners after 10 seconds
        setTimeout(() => {
            socket.off('room-joined', handleRoomJoined);
            socket.off('error', handleError);
            if (loading) {
                setLoading(false);
                setError('Request timeout. Please try again.');
            }
        }, 10000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/home')}
                    className="mb-4 flex items-center text-white hover:text-gray-200 transition"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Home
                </button>

                {/* Main Card */}
                <div className="bg-white rounded-lg shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Join a Room</h1>
                        <p className="text-gray-600">Enter the room ID to join a battle</p>
                    </div>

                    {/* Connection Status */}
                    <div className="mb-6 flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-600">
                            {connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Join Form */}
                    <form onSubmit={handleJoinRoom} className="space-y-6">
                        <div>
                            <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
                                Room ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="roomId"
                                name="roomId"
                                value={formData.roomId}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition uppercase text-center text-2xl font-bold tracking-widest"
                                placeholder="ABC123"
                                maxLength={6}
                                disabled={loading}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Enter the 6-character room code
                            </p>
                        </div>

                        {requirePassword && (
                            <div className="animate-fadeIn">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                                    placeholder="Enter room password"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !connected}
                            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Joining...
                                </span>
                            ) : (
                                'Join Room'
                            )}
                        </button>
                    </form>

                    {/* Info Section */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Don't have a room code?</h3>
                        <p className="text-xs text-gray-600 mb-3">
                            Ask the host for the room ID or browse available rooms on the homepage.
                        </p>
                        <button
                            onClick={() => navigate('/home')}
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                            Browse Available Rooms →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinRoom;
