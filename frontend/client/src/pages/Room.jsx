import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Room = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!socket) return;

        // Get room info
        socket.emit('get-room-info', { roomId });

        socket.on('room-info', (data) => {
            if (data.success) {
                setRoom(data.room);
                setLoading(false);
            }
        });

        socket.on('user-joined', (data) => {
            setRoom((prev) => ({
                ...prev,
                participants: data.participants
            }));
        });

        socket.on('user-left', (data) => {
            setRoom((prev) => ({
                ...prev,
                participants: data.participants
            }));
        });

        socket.on('room-closed', () => {
            alert('Room has been closed');
            navigate('/home');
        });

        socket.on('error', (error) => {
            alert(error.message);
            navigate('/home');
        });

        return () => {
            socket.off('room-info');
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('room-closed');
            socket.off('error');
        };
    }, [socket, roomId, navigate]);

    const handleLeaveRoom = () => {
        if (confirm('Are you sure you want to leave the room?')) {
            socket.emit('leave-room', {
                roomId,
                userId: user.id,
                username: user.username
            });
            
            socket.on('room-left', () => {
                navigate('/home');
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <div className="text-white text-2xl">Loading room...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{room?.name}</h1>
                            <p className="text-sm text-gray-600">Room ID: {roomId}</p>
                        </div>
                        <button
                            onClick={handleLeaveRoom}
                            className="w-full sm:w-auto px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                        >
                            Leave Room
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Participants */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-xl p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">
                                Participants ({room?.participants?.length}/{room?.maxParticipants})
                            </h2>
                            <div className="space-y-3">
                                {room?.participants?.map((participant, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {participant.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{participant.username}</p>
                                            {participant.userId.toString() === room.host.toString() && (
                                                <p className="text-xs text-purple-600">Host</p>
                                            )}
                                        </div>
                                        {participant.userId.toString() === user?.id && (
                                            <span className="text-xs text-gray-500">(You)</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-xl p-6 min-h-[400px]">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Battle Arena</h2>
                            <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500">
                                    {room?.status === 'waiting' 
                                        ? 'Waiting for participants...' 
                                        : 'Battle in progress!'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Room;
