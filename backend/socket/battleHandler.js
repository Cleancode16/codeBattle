const Battle = require('../models/Battle');
const codeforcesService = require('../services/codeforcesService');
const { updateBattleScores } = require('../utils/scoring');

module.exports = (io) => {
    // Import shared helpers
    const { startBattleTimer, checkForWinner, endBattle, cleanupBattle, activeBattles } = require('./battleHelpers')(io);

    io.on('connection', (socket) => {
        console.log('User connected to battle:', socket.id);

        // Create battle
        socket.on('create-battle', async (data) => {
            try {
                const { mode, duration, problemRating, topics, userId, username, codeforcesHandle } = data;

                if (!mode || !duration || !problemRating || !userId || !username) {
                    socket.emit('error', { message: 'All fields are required' });
                    return;
                }

                if (!codeforcesHandle) {
                    socket.emit('error', { message: 'Codeforces handle is required to participate in battles' });
                    return;
                }

                const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

                const battle = new Battle({
                    roomId,
                    mode,
                    duration,
                    problemRating,
                    topics: topics || [],
                    createdBy: userId,
                    players: [{
                        userId,
                        username,
                        codeforcesHandle
                    }]
                });

                await battle.save();

                socket.join(roomId);
                socket.battleRoomId = roomId;
                socket.userId = userId;

                console.log(`Battle created: ${roomId} by ${username} (Mode: ${mode}, Rating: ${problemRating})`);

                socket.emit('battle-created', {
                    success: true,
                    message: 'Battle created successfully',
                    battle: {
                        roomId: battle.roomId,
                        mode: battle.mode,
                        duration: battle.duration,
                        problemRating: battle.problemRating,
                        topics: battle.topics,
                        players: battle.players,
                        status: battle.status
                    }
                });

                io.emit('battle-list-updated');

            } catch (error) {
                console.error('Create battle error:', error);
                socket.emit('error', { message: 'Failed to create battle' });
            }
        });

        // Join battle
        socket.on('join-battle', async (data) => {
            try {
                const { roomId, userId, username, codeforcesHandle } = data;

                if (!roomId || !userId || !username) {
                    socket.emit('error', { message: 'All fields are required' });
                    return;
                }

                if (!codeforcesHandle) {
                    socket.emit('error', { message: 'Codeforces handle is required to participate in battles' });
                    return;
                }

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                if (battle.status !== 'waiting') {
                    socket.emit('error', { message: 'Battle already started' });
                    return;
                }

                const added = battle.addPlayer(userId, username, codeforcesHandle);

                if (!added) {
                    socket.emit('error', { message: 'Battle is full or you are already in it' });
                    return;
                }

                await battle.save();

                socket.join(roomId);
                socket.battleRoomId = roomId;
                socket.userId = userId;

                console.log(`${username} joined battle: ${roomId}`);

                socket.emit('battle-joined', {
                    success: true,
                    battle
                });

                io.to(roomId).emit('player-joined', {
                    userId,
                    username,
                    codeforcesHandle,
                    players: battle.players
                });

                // Check if ready to start
                if (battle.isReadyToStart()) {
                    io.to(roomId).emit('ready-to-start', {
                        message: 'All players joined! Battle will start soon...'
                    });

                    // Start battle automatically after 3 seconds
                    setTimeout(() => startBattle(io, roomId), 3000);
                }

                io.emit('battle-list-updated');

            } catch (error) {
                console.error('Join battle error:', error);
                socket.emit('error', { message: 'Failed to join battle' });
            }
        });

        // Leave battle - Updated to handle forfeit during active battles
        socket.on('leave-battle', async (data) => {
            try {
                const { roomId, userId } = data;

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                const isHost = battle.createdBy.toString() === userId.toString();

                // If battle is ACTIVE, leaving = forfeit
                if (battle.status === 'active') {
                    // Find the opponent (the one who didn't leave)
                    const winner = battle.players.find(p => p.userId.toString() !== userId.toString());
                    
                    if (winner) {
                        // Mark battle as finished with the opponent as winner
                        battle.status = 'finished';
                        battle.endTime = new Date();
                        battle.winner = {
                            userId: winner.userId,
                            username: winner.username,
                            codeforcesHandle: winner.codeforcesHandle
                        };

                        await battle.save();

                        console.log(`Battle ${roomId} ended by forfeit. ${userId} left, ${winner.username} wins`);

                        // Update scores
                        await updateBattleScores(battle);

                        // Cleanup timers
                        cleanupBattle(roomId);

                        // Notify all participants
                        io.to(roomId).emit('battle-ended', {
                            success: true,
                            winner: {
                                userId: winner.userId,
                                username: winner.username,
                                codeforcesHandle: winner.codeforcesHandle
                            },
                            battle: {
                                roomId: battle.roomId,
                                status: battle.status,
                                winner: battle.winner,
                                endTime: battle.endTime,
                                problem: battle.problem,
                                mode: battle.mode,
                                duration: battle.duration,
                                problemRating: battle.problemRating,
                                players: battle.players
                            },
                            reason: 'forfeit',
                            message: `${userId === battle.createdBy.toString() ? 'Host' : 'Opponent'} left the battle. ${winner.username} wins by forfeit!`
                        });

                        // Update battle list
                        io.emit('battle-list-updated');
                    }

                    // Leave socket room
                    socket.leave(roomId);
                    socket.battleRoomId = null;
                    socket.userId = null;

                    socket.emit('battle-left', {
                        success: true,
                        message: 'Left battle (forfeit)'
                    });

                    return;
                }

                // For finished/draw battles, just leave
                if (battle.status === 'finished' || battle.status === 'draw') {
                    socket.leave(roomId);
                    socket.battleRoomId = null;
                    socket.userId = null;

                    socket.emit('battle-left', {
                        success: true,
                        message: 'Left finished battle successfully'
                    });

                    console.log(`User left finished battle: ${roomId}`);
                    return;
                }

                // For waiting battles
                if (battle.status === 'waiting') {
                    battle.removePlayer(userId);

                    // If no players left, delete the battle
                    if (battle.players.length === 0) {
                        await Battle.findOneAndDelete({ roomId });
                        cleanupBattle(roomId);
                    } else {
                        await battle.save();
                        
                        io.to(roomId).emit('player-left', {
                            userId,
                            players: battle.players
                        });
                    }

                    io.emit('battle-list-updated');
                }

                socket.leave(roomId);
                socket.battleRoomId = null;
                socket.userId = null;

                socket.emit('battle-left', {
                    success: true,
                    message: 'Left battle successfully'
                });

            } catch (error) {
                console.error('Leave battle error:', error);
                socket.emit('error', { message: 'Failed to leave battle' });
            }
        });

        // Remove player (host only)
        socket.on('remove-player', async (data) => {
            try {
                const { roomId, userId, hostId } = data;

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                // Check if requester is host
                if (battle.createdBy.toString() !== hostId.toString()) {
                    socket.emit('error', { message: 'Only host can remove players' });
                    return;
                }

                if (battle.status !== 'waiting') {
                    socket.emit('error', { message: 'Cannot remove players from active battle' });
                    return;
                }

                battle.removePlayer(userId);
                await battle.save();

                io.to(roomId).emit('player-left', {
                    userId,
                    players: battle.players
                });

                io.emit('battle-list-updated');

            } catch (error) {
                console.error('Remove player error:', error);
                socket.emit('error', { message: 'Failed to remove player' });
            }
        });

        // Delete battle (host only) - Can delete ANY battle status
        socket.on('delete-battle', async (data) => {
            try {
                const { roomId, userId } = data;

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                // Check if requester is host
                if (battle.createdBy.toString() !== userId.toString()) {
                    socket.emit('error', { message: 'Only host can delete battle' });
                    return;
                }

                // Get all participants before deleting
                const participantIds = battle.players.map(p => p.userId.toString());

                // Delete the battle regardless of status
                await Battle.findOneAndDelete({ roomId });
                cleanupBattle(roomId);

                console.log(`Battle deleted by host: ${roomId} (Status: ${battle.status}), removing ${participantIds.length} participants`);

                // Notify all participants in the room that battle has been deleted
                io.to(roomId).emit('room-closed', {
                    message: 'Battle has been deleted by the host.',
                    reason: 'host_deleted'
                });

                // Force disconnect all sockets in this room
                const socketsInRoom = await io.in(roomId).fetchSockets();
                for (const s of socketsInRoom) {
                    s.leave(roomId);
                    s.battleRoomId = null;
                    s.userId = null;
                }

                // Update battle list
                io.emit('battle-list-updated');

                // Confirm to host
                socket.emit('battle-deleted', {
                    success: true,
                    message: 'Battle deleted successfully'
                });

            } catch (error) {
                console.error('Delete battle error:', error);
                socket.emit('error', { message: 'Failed to delete battle' });
            }
        });

        // Disconnect handler
        socket.on('disconnect', async () => {
            console.log('User disconnected from battle:', socket.id);

            if (socket.battleRoomId && socket.userId) {
                try {
                    const battle = await Battle.findOne({ roomId: socket.battleRoomId });

                    if (battle && battle.status === 'waiting') {
                        battle.removePlayer(socket.userId);

                        if (battle.players.length === 0) {
                            await Battle.findOneAndDelete({ roomId: socket.battleRoomId });
                            cleanupBattle(socket.battleRoomId);
                        } else {
                            await battle.save();
                        }

                        io.to(socket.battleRoomId).emit('player-left', {
                            userId: socket.userId,
                            players: battle.players
                        });

                        io.emit('battle-list-updated');
                    }
                } catch (error) {
                    console.error('Disconnect cleanup error:', error);
                }
            }
        });
    });

    // Start battle function - now uses shared helpers
    async function startBattle(io, roomId) {
        try {
            const battle = await Battle.findOne({ roomId });

            if (!battle || battle.status !== 'waiting') return;

            const handles = battle.players.map(p => p.codeforcesHandle);

            const problem = await codeforcesService.getUnsolvedProblem(
                handles,
                battle.problemRating,
                battle.topics
            );

            battle.problem = problem;
            battle.status = 'active';
            battle.startTime = new Date();
            battle.endTime = new Date(Date.now() + battle.duration * 60 * 1000);

            await battle.save();

            io.to(roomId).emit('battle-started', {
                problem,
                duration: battle.duration,
                endTime: battle.endTime
            });

            startBattleTimer(io, roomId, battle);

        } catch (error) {
            console.error('Start battle error:', error);
            io.to(roomId).emit('error', { message: 'Failed to start battle' });
        }
    }
};
