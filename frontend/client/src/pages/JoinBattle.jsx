import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const JoinBattle = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoinBattle = async (e) => {
        e.preventDefault();
        
        if (!roomCode.trim()) {
            setError('Please enter a room code');
            return;
        }

        if (!user.codeforcesHandle) {
            setError('Please set your Codeforces handle in your profile before joining a battle!');
            setTimeout(() => navigate('/profile'), 2000);
            return;
        }

        setLoading(true);
        setError('');

        try {
            // First, check if battle exists
            const response = await api.get(`/battles/${roomCode.toUpperCase()}`);
            
            if (!response.data.success) {
                setError('Battle not found');
                setLoading(false);
                return;
            }

            const battle = response.data.battle;

            // Check battle status
            if (battle.status !== 'waiting') {
                setError('This battle has already started or finished');
                setLoading(false);
                return;
            }

            // Check if battle is full
            const maxPlayers = battle.mode === 'duo' ? 2 : battle.mode === 'trio' ? 3 : 4;
            if (battle.players.length >= maxPlayers) {
                setError('This battle is already full');
                setLoading(false);
                return;
            }

            // Check if user is already in the battle
            if (battle.players.some(p => p.userId?.toString() === user.id)) {
                setError('You are already in this battle!');
                setTimeout(() => navigate(`/room/${roomCode.toUpperCase()}`), 1500);
                setLoading(false);
                return;
            }

            // Join the battle via socket
            socket.emit('join-battle', {
                roomId: roomCode.toUpperCase(),
                userId: user.id,
                username: user.username,
                codeforcesHandle: user.codeforcesHandle
            });

            // Listen for join response
            socket.once('battle-joined', (data) => {
                if (data.success) {
                    navigate(`/room/${roomCode.toUpperCase()}`);
                } else {
                    setError('Failed to join battle');
                    setLoading(false);
                }
            });

            socket.once('error', (err) => {
                setError(err.message || 'Failed to join battle');
                setLoading(false);
            });

        } catch (err) {
            console.error('Join battle error:', err);
            setError(err.response?.data?.message || 'Failed to join battle. Please check the room code.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-6">
                        <span className="text-4xl">🔑</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
                        Join Battle
                    </h1>
                    <p className="text-purple-100 text-sm sm:text-base">
                        Enter the battle room code to join
                    </p>
                </div>

                {/* Join Form */}
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
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

                    <form onSubmit={handleJoinBattle} className="space-y-6">
                        <div>
                            <label htmlFor="roomCode" className="block text-sm font-bold text-gray-700 mb-2">
                                Battle Room Code
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    id="roomCode"
                                    value={roomCode}
                                    onChange={(e) => {
                                        setRoomCode(e.target.value.toUpperCase());
                                        setError('');
                                    }}
                                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all text-lg font-mono bg-gray-50 hover:bg-white uppercase"
                                    placeholder="Enter 6-character code"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-600">
                                💡 Example: ABC123
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || roomCode.length !== 6}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Joining Battle...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Join Battle
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6">
                        <button
                            onClick={() => navigate('/home')}
                            className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 py-3 px-6 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            ← Back to Home
                        </button>
                    </div>
                </div>

                {/* Info Section */}
                <div className="mt-6 bg-white/90 backdrop-blur-md rounded-xl p-5 shadow-lg">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        How to Join
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start">
                            <span className="text-purple-600 mr-2">1.</span>
                            <span>Get the 6-character room code from your friend</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-purple-600 mr-2">2.</span>
                            <span>Enter the code in the field above</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-purple-600 mr-2">3.</span>
                            <span>Click "Join Battle" to enter the battle room</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-purple-600 mr-2">4.</span>
                            <span>Wait for all players to join and battle will start automatically</span>
                        </li>
                    </ul>
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

export default JoinBattle;
