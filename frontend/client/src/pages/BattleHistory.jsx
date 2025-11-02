import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const BattleHistory = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [battles, setBattles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, created, joined

    useEffect(() => {
        fetchBattleHistory();
    }, [filter]);

    const fetchBattleHistory = async () => {
        try {
            setLoading(true);
            console.log('Fetching battle history for user:', user.id, 'Filter:', filter);
            
            const response = await api.get(`/battles/history/${user.id}?filter=${filter}`);
            
            console.log('Battle history response:', response.data);
            console.log('Number of battles:', response.data.battles?.length || 0);
            
            setBattles(response.data.battles || []);
        } catch (error) {
            console.error('Error fetching battle history:', error);
            console.error('Error response:', error.response?.data);
            setBattles([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBattle = async (battleId, roomId) => {
        if (!confirm('⚠️ Are you sure you want to delete this battle? This action cannot be undone and will permanently remove it from your history.')) return;

        try {
            await api.delete(`/battles/${roomId}`);
            alert('✅ Battle deleted successfully');
            // Refresh battle list
            fetchBattleHistory();
        } catch (error) {
            console.error('Error deleting battle:', error);
            alert('❌ Failed to delete battle');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            finished: 'bg-green-100 text-green-800',
            draw: 'bg-yellow-100 text-yellow-800',
            active: 'bg-blue-100 text-blue-800',
            waiting: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getUserResult = (battle) => {
        if (battle.status === 'draw') return '🤝 Draw';
        if (battle.status === 'waiting') return '⏳ Waiting';
        if (battle.status === 'active') return '⚔️ Active';
        
        if (battle.winner) {
            const isWinner = battle.winner.userId.toString() === user.id;
            return isWinner ? '🏆 Winner' : '❌ Lost';
        }
        return '—';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return 'N/A';
        const diff = new Date(endTime) - new Date(startTime);
        const minutes = Math.floor(diff / 60000);
        return `${minutes} min`;
    };

    const getModeBadge = (mode) => {
        const labels = {
            duo: '2v2',
            trio: '3v3',
            squad: '4v4'
        };
        return labels[mode] || mode;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Battle History</h1>
                            <p className="text-sm text-gray-600">View your past battles</p>
                        </div>
                        <button
                            onClick={() => navigate('/home')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-3">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${
                            filter === 'all'
                                ? 'bg-white text-purple-600 shadow-lg'
                                : 'bg-white bg-opacity-50 text-white hover:bg-opacity-75'
                        }`}
                    >
                        All Battles
                    </button>
                    <button
                        onClick={() => setFilter('created')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${
                            filter === 'created'
                                ? 'bg-white text-purple-600 shadow-lg'
                                : 'bg-white bg-opacity-50 text-white hover:bg-opacity-75'
                        }`}
                    >
                        Created by Me
                    </button>
                    <button
                        onClick={() => setFilter('joined')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${
                            filter === 'joined'
                                ? 'bg-white text-purple-600 shadow-lg'
                                : 'bg-white bg-opacity-50 text-white hover:bg-opacity-75'
                        }`}
                    >
                        Joined Battles
                    </button>
                </div>

                {/* Battle List */}
                {loading ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading battles...</p>
                    </div>
                ) : battles.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">📜</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Battles Found</h3>
                        <p className="text-gray-600 mb-6">You haven't participated in any battles yet.</p>
                        <button
                            onClick={() => navigate('/home')}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            Start Your First Battle
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {battles.map((battle) => (
                            <div
                                key={battle._id}
                                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
                            >
                                {/* Header */}
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <h3 className="text-xl font-bold text-gray-800">
                                                {getModeBadge(battle.mode)} Battle
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(battle.status)}`}>
                                                {battle.status}
                                            </span>
                                            {battle.createdBy?.toString() === user?.id?.toString() && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                                    Created by You
                                                </span>
                                            )}
                                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                                                Room: {battle.roomId}
                                            </span>
                                        </div>

                                        {/* Battle Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Rating</div>
                                                <div className="text-lg font-bold text-gray-800">{battle.problemRating}</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Duration</div>
                                                <div className="text-lg font-bold text-gray-800">{battle.duration} min</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Players</div>
                                                <div className="text-lg font-bold text-gray-800">{battle.players.length}</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <div className="text-xs text-gray-600 mb-1">Time Taken</div>
                                                <div className="text-lg font-bold text-gray-800">
                                                    {formatDuration(battle.startTime, battle.endTime)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Problem Info */}
                                        {battle.problem && (
                                            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 mb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="text-xs text-gray-600 mb-1">Problem</div>
                                                        <div className="font-bold text-gray-800 mb-2">{battle.problem.name}</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {battle.problem.tags?.slice(0, 3).map((tag, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {battle.problem.link && (
                                                        <a
                                                            href={battle.problem.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition whitespace-nowrap"
                                                        >
                                                            View Problem →
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Participants */}
                                        <div className="mb-3">
                                            <div className="text-xs text-gray-600 mb-2">Participants</div>
                                            <div className="flex flex-wrap gap-2">
                                                {battle.players.map((player, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`px-3 py-2 rounded-lg text-sm ${
                                                            player.userId?.toString() === user?.id?.toString()
                                                                ? 'bg-purple-100 text-purple-800 font-semibold'
                                                                : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span>{player.username}</span>
                                                            {player.codeforcesHandle && (
                                                                <span className="text-xs opacity-75">
                                                                    ({player.codeforcesHandle})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Topics */}
                                        {battle.topics?.length > 0 && (
                                            <div className="mb-3">
                                                <div className="text-xs text-gray-600 mb-2">Topics</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {battle.topics.map((topic, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Result Badge */}
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="text-xs text-gray-600">Result:</div>
                                            <span className="text-lg font-semibold">{getUserResult(battle)}</span>
                                        </div>

                                        {/* Date and Delete */}
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="text-xs text-gray-500">
                                                {formatDate(battle.createdAt)}
                                            </div>
                                            
                                            {/* Delete button - only for creator */}
                                            {battle.createdBy?.toString() === user?.id?.toString() && (
                                                <button
                                                    onClick={() => handleDeleteBattle(battle._id, battle.roomId)}
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition font-semibold"
                                                >
                                                    🗑️ Delete Battle
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Winner Info */}
                                    {battle.winner && (
                                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border-2 border-yellow-300">
                                            <div className="text-center">
                                                <div className="text-3xl mb-2">🏆</div>
                                                <div className="text-sm text-gray-600 mb-1">Winner</div>
                                                <div className="font-bold text-gray-800 mb-1">{battle.winner.username}</div>
                                                <div className="text-xs text-gray-600">{battle.winner.codeforcesHandle}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BattleHistory;
