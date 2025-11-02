import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const Homepage = () => {
    const { user, logout } = useAuth();
    const { socket, connected } = useSocket();
    const navigate = useNavigate();
    
    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [createForm, setCreateForm] = useState({
        name: '',
        maxParticipants: 10,
        isPrivate: false,
        password: ''
    });
    
    const [joinForm, setJoinForm] = useState({
        roomId: '',
        password: ''
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('room-created', (data) => {
            if (data.success) {
                navigate(`/room/${data.room.roomId}`);
            }
        });

        socket.on('room-joined', (data) => {
            if (data.success) {
                navigate(`/room/${data.room.roomId}`);
            }
        });

        socket.on('room-list-updated', () => {
            fetchRooms();
        });

        socket.on('error', (error) => {
            alert(error.message);
            setLoading(false);
        });

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('room-list-updated');
            socket.off('error');
        };
    }, [socket, navigate]);

    const fetchRooms = async () => {
        try {
            const response = await api.get('/rooms');
            setRooms(response.data.rooms || []);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        }
    };

    const handleCreateRoom = () => {
        if (!createForm.name.trim()) {
            alert('Please enter a room name');
            return;
        }

        setLoading(true);
        socket.emit('create-room', {
            name: createForm.name,
            hostId: user.id,
            username: user.username,
            maxParticipants: createForm.maxParticipants,
            isPrivate: createForm.isPrivate,
            password: createForm.isPrivate ? createForm.password : null
        });
    };

    const handleJoinRoom = (room) => {
        setSelectedRoom(room);
        if (room.isPrivate) {
            setShowJoinModal(true);
        } else {
            joinRoom(room.roomId, '');
        }
    };

    const joinRoom = (roomId, password) => {
        setLoading(true);
        socket.emit('join-room', {
            roomId,
            userId: user.id,
            username: user.username,
            password
        });
    };

    const handleJoinWithPassword = () => {
        if (!joinForm.password.trim()) {
            alert('Please enter password');
            return;
        }
        joinRoom(selectedRoom.roomId, joinForm.password);
        setShowJoinModal(false);
        setJoinForm({ roomId: '', password: '' });
    };

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">CodeBattle</h1>
                            <p className="text-sm text-gray-600">Welcome, {user?.username}!</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-gray-600 hidden sm:inline">
                                    {connected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm sm:text-base"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Create Room Button */}
                <div className="mb-8 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex-1 sm:flex-none px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium shadow-lg"
                    >
                        + Create New Room
                    </button>
                    <button
                        onClick={() => navigate('/join')}
                        className="flex-1 sm:flex-none px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium shadow-lg"
                    >
                        Join Room with Code
                    </button>
                </div>

                {/* Rooms Grid */}
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-white mb-4">Available Rooms ({rooms.length})</h2>
                </div>

                {rooms.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <p className="text-gray-600">No rooms available. Create one to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map((room) => (
                            <div key={room._id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-gray-800">{room.name}</h3>
                                    {room.isPrivate && (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                            Private
                                        </span>
                                    )}
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                    <p className="text-sm text-gray-600">
                                        Host: <span className="font-medium">{room.host?.username || 'Unknown'}</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Participants: <span className="font-medium">{room.participants.length}/{room.maxParticipants}</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Status: <span className={`font-medium ${room.status === 'waiting' ? 'text-green-600' : 'text-blue-600'}`}>
                                            {room.status}
                                        </span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleJoinRoom(room)}
                                    disabled={room.participants.length >= room.maxParticipants || loading}
                                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {room.participants.length >= room.maxParticipants ? 'Full' : 'Join Room'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Create New Room</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Room Name
                                </label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                    placeholder="Enter room name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Max Participants
                                </label>
                                <input
                                    type="number"
                                    min="2"
                                    max="20"
                                    value={createForm.maxParticipants}
                                    onChange={(e) => setCreateForm({ ...createForm, maxParticipants: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isPrivate"
                                    checked={createForm.isPrivate}
                                    onChange={(e) => setCreateForm({ ...createForm, isPrivate: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <label htmlFor="isPrivate" className="ml-2 text-sm text-gray-700">
                                    Private Room
                                </label>
                            </div>

                            {createForm.isPrivate && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                        placeholder="Enter password"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreateForm({ name: '', maxParticipants: 10, isPrivate: false, password: '' });
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRoom}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Private Room Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Join Private Room</h2>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={joinForm.password}
                                onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="Enter room password"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowJoinModal(false);
                                    setJoinForm({ roomId: '', password: '' });
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinWithPassword}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Homepage;
