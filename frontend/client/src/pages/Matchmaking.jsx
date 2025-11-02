import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Matchmaking = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    
    const [searching, setSearching] = useState(false);
    const [queueSize, setQueueSize] = useState(0);
    const [matchFound, setMatchFound] = useState(false);
    const [opponent, setOpponent] = useState(null);
    const [searchTime, setSearchTime] = useState(0);

    const [settings, setSettings] = useState({
        problemRating: 1200,
        duration: 15
    });

    useEffect(() => {
        if (!user?.codeforcesHandle) {
            alert('Please set your Codeforces handle in your profile before using matchmaking!');
            navigate('/profile');
            return;
        }

        if (!socket) return;

        socket.on('matchmaking-joined', handleMatchmakingJoined);
        socket.on('matchmaking-waiting', handleMatchmakingWaiting);
        socket.on('match-found', handleMatchFound);
        socket.on('matchmaking-timeout', handleMatchmakingTimeout);
        socket.on('navigate-to-battle', handleNavigateToBattle);
        socket.on('matchmaking-left', handleMatchmakingLeft);
        socket.on('error', handleError);

        return () => {
            socket.off('matchmaking-joined');
            socket.off('matchmaking-waiting');
            socket.off('match-found');
            socket.off('matchmaking-timeout');
            socket.off('navigate-to-battle');
            socket.off('matchmaking-left');
            socket.off('error');
            
            // Leave queue if still searching
            if (searching) {
                socket.emit('leave-matchmaking', { userId: user.id });
            }
        };
    }, [socket, user, searching]);

    // Search timer
    useEffect(() => {
        let interval;
        if (searching && !matchFound) {
            interval = setInterval(() => {
                setSearchTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [searching, matchFound]);

    const handleMatchmakingJoined = (data) => {
        console.log('Joined matchmaking:', data);
        setQueueSize(data.queueSize);
    };

    const handleMatchmakingWaiting = (data) => {
        console.log('Waiting for match:', data);
        setQueueSize(data.queueSize); // Already excludes current user from backend
    };

    const handleMatchFound = (data) => {
        console.log('Match found!', data);
        setMatchFound(true);
        setOpponent(data.battle.opponent);
    };

    const handleNavigateToBattle = (data) => {
        navigate(`/room/${data.roomId}`);
    };

    const handleMatchmakingLeft = (data) => {
        console.log('Left matchmaking:', data);
        setSearching(false);
        setSearchTime(0);
    };

    const handleError = (error) => {
        alert(error.message);
        setSearching(false);
    };

    const handleMatchmakingTimeout = (data) => {
        console.log('Matchmaking timeout:', data);
        setSearching(false);
        
        // Show modal with options
        if (confirm(data.message + '\n\nWould you like to return to home and try again later?')) {
            navigate('/home');
        }
    };

    const startSearching = () => {
        if (!socket) {
            alert('Not connected to server');
            return;
        }

        setSearching(true);
        setSearchTime(0);
        setMatchFound(false);
        setOpponent(null);

        socket.emit('join-matchmaking', {
            userId: user.id,
            username: user.username,
            codeforcesHandle: user.codeforcesHandle,
            preferredRating: settings.problemRating,
            duration: settings.duration
        });
    };

    const stopSearching = () => {
        socket.emit('leave-matchmaking', { userId: user.id });
        setSearching(false);
        setSearchTime(0);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
                            🎯 Quick Match
                        </h1>
                        <p className="text-purple-100 text-sm sm:text-base">
                            Find an opponent with similar rating
                        </p>
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
            <div className="max-w-2xl mx-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
                    
                    {!searching && !matchFound ? (
                        <>
                            {/* Settings */}
                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Problem Rating
                                    </label>
                                    <select
                                        value={settings.problemRating}
                                        onChange={(e) => setSettings({ ...settings, problemRating: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
                                    >
                                        <option value={800}>800 (Beginner)</option>
                                        <option value={1000}>1000</option>
                                        <option value={1200}>1200 (Easy)</option>
                                        <option value={1400}>1400</option>
                                        <option value={1500}>1500 (Medium)</option>
                                        <option value={1600}>1600</option>
                                        <option value={1700}>1700</option>
                                        <option value={1800}>1800 (Hard)</option>
                                        <option value={2000}>2000+</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Duration (minutes)
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[10, 15, 30].map((duration) => (
                                            <button
                                                key={duration}
                                                onClick={() => setSettings({ ...settings, duration })}
                                                className={`px-4 py-3 rounded-xl font-semibold transition ${
                                                    settings.duration === duration
                                                        ? 'bg-purple-600 text-white shadow-lg'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {duration} min
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border-2 border-blue-200 mb-6">
                                <h3 className="font-bold text-blue-900 mb-3 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    How Matchmaking Works
                                </h3>
                                <ul className="space-y-2 text-sm text-blue-800">
                                    <li className="flex items-start">
                                        <span className="text-blue-600 mr-2">✓</span>
                                        <span>We match you with online players of similar skill level</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-blue-600 mr-2">✓</span>
                                        <span>Rating range: Your score ± 100 points</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-blue-600 mr-2">✓</span>
                                        <span>Battle starts automatically when match is found</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-blue-600 mr-2">✓</span>
                                        <span>Your current score: <strong>{user?.score || 0}</strong></span>
                                    </li>
                                </ul>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={startSearching}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-500/50 transition-all font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <span className="flex items-center justify-center">
                                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Find Match
                                </span>
                            </button>
                        </>
                    ) : searching && !matchFound ? (
                        <>
                            {/* Searching Animation */}
                            <div className="text-center py-12">
                                <div className="relative inline-block mb-8">
                                    <div className="w-32 h-32 border-8 border-purple-200 rounded-full"></div>
                                    <div className="absolute top-0 left-0 w-32 h-32 border-8 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                                        🔍
                                    </div>
                                </div>

                                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                                    Finding Your Opponent...
                                </h2>

                                <div className="bg-purple-50 p-6 rounded-xl mb-6">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <div className="text-3xl font-bold text-purple-600">{formatTime(searchTime)}</div>
                                            <div className="text-sm text-gray-600">Searching</div>
                                        </div>
                                        <div>
                                            <div className="text-3xl font-bold text-purple-600">{queueSize}</div>
                                            <div className="text-sm text-gray-600">Other Players</div>
                                        </div>
                                    </div>
                                </div>

                                {queueSize === 0 && searchTime > 30 && (
                                    <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg mb-6">
                                        <p className="text-yellow-800 font-semibold mb-2">⏱️ No opponents online</p>
                                        <p className="text-sm text-yellow-700">
                                            No players with similar rating found. Try creating a custom battle or check back later.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3 text-gray-600 mb-8">
                                    <p className="flex items-center justify-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                        Looking for players with rating {Math.max(0, (user?.score || 0) - 200)} - {(user?.score || 0) + 200}
                                    </p>
                                    <p className="flex items-center justify-center">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                                        Problem rating: {settings.problemRating}
                                    </p>
                                    <p className="flex items-center justify-center">
                                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                                        Battle duration: {settings.duration} minutes
                                    </p>
                                </div>

                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={stopSearching}
                                        className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold shadow-lg"
                                    >
                                        Cancel Search
                                    </button>
                                    {queueSize === 0 && searchTime > 30 && (
                                        <button
                                            onClick={() => {
                                                stopSearching();
                                                navigate('/home');
                                            }}
                                            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg"
                                        >
                                            Create Custom Battle
                                        </button>
                                    )}
                                </div>

                                <p className="text-xs text-gray-500 mt-6">
                                    Max search time: 2 minutes
                                </p>
                            </div>
                        </>
                    ) : matchFound ? (
                        <>
                            {/* Match Found */}
                            <div className="text-center py-12">
                                <div className="text-8xl mb-6 animate-bounce">🎉</div>
                                
                                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                                    Match Found!
                                </h2>

                                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-300 mb-6">
                                    <p className="text-gray-700 mb-4">You will battle against:</p>
                                    <div className="bg-white p-4 rounded-lg shadow-md">
                                        <div className="text-3xl font-bold text-purple-600 mb-2">
                                            {opponent?.username}
                                        </div>
                                        <div className="text-gray-600">
                                            Rating: <span className="font-bold">{opponent?.rating}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-3 text-gray-600 mb-6">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 mr-1 text-green-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Preparing battle room...</span>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500">
                                    Starting in a few seconds...
                                </p>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default Matchmaking;
