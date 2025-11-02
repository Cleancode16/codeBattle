import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Leaderboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 20;

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/leaderboard');
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankBadge = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return rank;
    };

    const getRankClass = (rank) => {
        if (rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 font-bold';
        if (rank === 2) return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 font-bold';
        if (rank === 3) return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 font-bold';
        return '';
    };

    const getGameResultButton = (result) => {
        if (result === 'W') {
            return (
                <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                    W
                </div>
            );
        } else if (result === 'L') {
            return (
                <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                    L
                </div>
            );
        } else if (result === 'D') {
            return (
                <div className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">
                    D
                </div>
            );
        }
        return (
            <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-xs">
                -
            </div>
        );
    };

    // Calculate pagination
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(users.length / usersPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">🏆 Leaderboard</h1>
                            <p className="text-sm text-gray-600">Top {users.length} competitors in CodeBattle</p>
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
                {loading ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading leaderboard...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Rankings Yet</h3>
                        <p className="text-gray-600">Be the first to compete and earn points!</p>
                    </div>
                ) : (
                    <>
                        {/* Leaderboard Table */}
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-sm font-bold">Rank</th>
                                            <th className="px-4 py-4 text-left text-sm font-bold">Player</th>
                                            <th className="px-4 py-4 text-center text-sm font-bold">Battles</th>
                                            <th className="px-4 py-4 text-center text-sm font-bold">Won</th>
                                            <th className="px-4 py-4 text-center text-sm font-bold">Lost</th>
                                            <th className="px-4 py-4 text-center text-sm font-bold">Draw</th>
                                            <th className="px-4 py-4 text-center text-sm font-bold">Points</th>
                                            <th className="px-4 py-4 text-center text-sm font-bold">Last Game</th>
                                            <th className="px-4 py-4 text-center text-sm font-bold">Last 5 Games</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {currentUsers.map((u, index) => {
                                            const globalRank = indexOfFirstUser + index + 1;
                                            const isCurrentUser = u._id === user?.id;
                                            
                                            return (
                                                <tr
                                                    key={u._id}
                                                    className={`${getRankClass(globalRank)} ${
                                                        isCurrentUser 
                                                            ? 'bg-blue-50 border-l-4 border-blue-500' 
                                                            : 'hover:bg-gray-50'
                                                    } transition`}
                                                >
                                                    {/* Rank */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-2xl font-bold">
                                                                {getRankBadge(globalRank)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Player */}
                                                    <td className="px-4 py-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                                                    {u.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-800 flex items-center gap-2">
                                                                        {u.username}
                                                                        {isCurrentUser && (
                                                                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                                                                You
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {u.codeforcesHandle && (
                                                                        <p className="text-xs text-gray-600">
                                                                            CF: {u.codeforcesHandle}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Total Battles */}
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="font-semibold text-gray-800">
                                                            {u.totalBattles || 0}
                                                        </span>
                                                    </td>

                                                    {/* Won */}
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold">
                                                            {u.battlesWon || 0}
                                                        </span>
                                                    </td>

                                                    {/* Lost */}
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold">
                                                            {u.battlesLost || 0}
                                                        </span>
                                                    </td>

                                                    {/* Draw */}
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-bold">
                                                            {u.battlesDraw || 0}
                                                        </span>
                                                    </td>

                                                    {/* Points */}
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-2xl font-bold text-purple-600">
                                                                {u.score || 0}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Last Game Points */}
                                                    <td className="px-4 py-4 text-center">
                                                        {u.lastGamePoints !== undefined && u.lastGamePoints !== 0 ? (
                                                            <span className={`px-3 py-1 rounded-full font-bold ${
                                                                u.lastGamePoints > 0 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {u.lastGamePoints > 0 ? '+' : ''}{u.lastGamePoints}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </td>

                                                    {/* Last 5 Games */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex gap-1 justify-center">
                                                            {u.last5Games && u.last5Games.length > 0 ? (
                                                                u.last5Games.map((result, idx) => (
                                                                    <div key={idx}>
                                                                        {getGameResultButton(result)}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-gray-400 text-sm">No games</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex justify-center items-center gap-2">
                                <button
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                >
                                    ← Previous
                                </button>

                                <div className="flex gap-2">
                                    {[...Array(totalPages)].map((_, index) => {
                                        const pageNumber = index + 1;
                                        
                                        // Show first page, last page, current page, and pages around current
                                        if (
                                            pageNumber === 1 ||
                                            pageNumber === totalPages ||
                                            (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pageNumber}
                                                    onClick={() => paginate(pageNumber)}
                                                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                                                        currentPage === pageNumber
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-white text-purple-600 hover:bg-purple-50'
                                                    }`}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        } else if (
                                            pageNumber === currentPage - 2 ||
                                            pageNumber === currentPage + 2
                                        ) {
                                            return <span key={pageNumber} className="px-2 text-white">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                >
                                    Next →
                                </button>
                            </div>
                        )}

                        {/* Stats Summary */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 shadow-lg">
                                <p className="text-sm text-gray-600 mb-1">Total Players</p>
                                <p className="text-3xl font-bold text-purple-600">{users.length}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 shadow-lg">
                                <p className="text-sm text-gray-600 mb-1">Your Rank</p>
                                <p className="text-3xl font-bold text-purple-600">
                                    {users.findIndex(u => u._id === user?.id) + 1 || '-'}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg p-4 shadow-lg">
                                <p className="text-sm text-gray-600 mb-1">Your Points</p>
                                <p className="text-3xl font-bold text-purple-600">
                                    {users.find(u => u._id === user?.id)?.score || 0}
                                </p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-6 bg-white rounded-lg p-4 shadow-lg">
                            <h3 className="font-bold text-gray-800 mb-3">Game Results Legend</h3>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    {getGameResultButton('W')}
                                    <span className="text-sm text-gray-600">Win (+10 points)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getGameResultButton('L')}
                                    <span className="text-sm text-gray-600">Loss (+2 points)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getGameResultButton('D')}
                                    <span className="text-sm text-gray-600">Draw (+5 points)</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Leaderboard;
