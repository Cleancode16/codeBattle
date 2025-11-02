const Battle = require('../models/Battle');
const User = require('../models/User');

// Store online users waiting for matches
const matchmakingQueue = new Map(); // userId -> { socket, rating, timestamp }
const searchTimeouts = new Map(); // userId -> timeoutId

const MAX_SEARCH_TIME = 120000; // 2 minutes max search time

// Store io instance globally for periodic checks
let ioInstance = null;

module.exports = (io) => {
    // Store io instance
    ioInstance = io;

    io.on('connection', (socket) => {
        
        // Join matchmaking queue
        socket.on('join-matchmaking', async (data) => {
            try {
                const { userId, username, codeforcesHandle, preferredRating, duration } = data;

                console.log(`${username} joined matchmaking queue. Preferred Rating: ${preferredRating}`);

                // Get user's current score
                const user = await User.findById(userId);
                const userRating = user?.score || 0;

                console.log(`${username} actual rating: ${userRating}`);

                // Add to queue
                matchmakingQueue.set(userId, {
                    socket: socket.id,
                    userId,
                    username,
                    codeforcesHandle,
                    rating: userRating,
                    preferredRating,
                    duration,
                    timestamp: Date.now()
                });

                socket.emit('matchmaking-joined', {
                    success: true,
                    message: 'Searching for opponents...',
                    queueSize: matchmakingQueue.size
                });

                // Set timeout for max search time
                const timeoutId = setTimeout(() => {
                    handleSearchTimeout(socket, userId, username);
                }, MAX_SEARCH_TIME);

                searchTimeouts.set(userId, timeoutId);

                // Try to find a match immediately
                await findMatch(io, socket, userId);

            } catch (error) {
                console.error('Join matchmaking error:', error);
                socket.emit('error', { message: 'Failed to join matchmaking' });
            }
        });

        // Leave matchmaking queue
        socket.on('leave-matchmaking', (data) => {
            const { userId } = data;
            
            if (matchmakingQueue.has(userId)) {
                matchmakingQueue.delete(userId);
                
                // Clear timeout
                const timeoutId = searchTimeouts.get(userId);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    searchTimeouts.delete(userId);
                }
                
                console.log(`User ${userId} left matchmaking queue`);
                
                socket.emit('matchmaking-left', {
                    success: true,
                    message: 'Left matchmaking queue'
                });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            // Remove from queue if disconnected
            for (const [userId, userData] of matchmakingQueue.entries()) {
                if (userData.socket === socket.id) {
                    matchmakingQueue.delete(userId);
                    
                    const timeoutId = searchTimeouts.get(userId);
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        searchTimeouts.delete(userId);
                    }
                    
                    console.log(`User ${userId} removed from queue (disconnected)`);
                    break;
                }
            }
        });
    });
};

// Handle search timeout
function handleSearchTimeout(socket, userId, username) {
    if (matchmakingQueue.has(userId)) {
        matchmakingQueue.delete(userId);
        searchTimeouts.delete(userId);
        
        console.log(`Search timeout for ${username}. No match found.`);
        
        socket.emit('matchmaking-timeout', {
            success: false,
            message: 'No opponents found matching your criteria. Please try again in a few minutes or create a custom battle.',
            tryAgainLater: true
        });
    }
}

// Find a match for the user
async function findMatch(io, socket, userId) {
    const currentUser = matchmakingQueue.get(userId);
    
    if (!currentUser) return;

    const ratingRange = 200; // +/- 200 rating range
    let bestMatch = null;
    let bestRatingDiff = Infinity;

    console.log(`Finding match for ${currentUser.username} (Rating: ${currentUser.rating})`);
    console.log(`Searching in range: ${currentUser.rating - ratingRange} to ${currentUser.rating + ratingRange}`);

    // Search for best match in queue
    for (const [otherUserId, otherUser] of matchmakingQueue.entries()) {
        // Skip self
        if (otherUserId === userId) continue;

        // Check if ratings are compatible (+/- 200)
        const ratingDiff = Math.abs(currentUser.rating - otherUser.rating);
        
        console.log(`Comparing with ${otherUser.username} (Rating: ${otherUser.rating}, Diff: ${ratingDiff})`);
        
        if (ratingDiff <= ratingRange && ratingDiff < bestRatingDiff) {
            bestMatch = otherUser;
            bestRatingDiff = ratingDiff;
            console.log(`Found potential match: ${otherUser.username} (Rating diff: ${ratingDiff})`);
        }
    }

    // If match found, create battle
    if (bestMatch) {
        console.log(`Best match found: ${bestMatch.username}`);
        await createMatchedBattle(io, currentUser, bestMatch);
    } else {
        // No match found, notify user to wait
        const waitTime = Date.now() - currentUser.timestamp;
        const remainingTime = Math.floor((MAX_SEARCH_TIME - waitTime) / 1000);
        
        console.log(`No match found for ${currentUser.username}. ${matchmakingQueue.size - 1} other players online.`);
        
        socket.emit('matchmaking-waiting', {
            message: `Searching for opponents... (${matchmakingQueue.size - 1} players online)`,
            queueSize: matchmakingQueue.size - 1, // Exclude current user
            waitingTime: Math.floor(waitTime / 1000),
            remainingTime: remainingTime > 0 ? remainingTime : 0
        });
    }
}

// Create battle for matched users
async function createMatchedBattle(io, user1, user2) {
    try {
        // Remove both users from queue
        matchmakingQueue.delete(user1.userId);
        matchmakingQueue.delete(user2.userId);
        
        // Clear their timeouts
        [user1.userId, user2.userId].forEach(userId => {
            const timeoutId = searchTimeouts.get(userId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                searchTimeouts.delete(userId);
            }
        });

        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Use average rating and duration
        const avgRating = Math.round((user1.preferredRating + user2.preferredRating) / 2);
        const avgDuration = Math.round((user1.duration + user2.duration) / 2);

        const battle = new Battle({
            roomId,
            mode: 'duo',
            duration: avgDuration,
            problemRating: avgRating,
            topics: [],
            createdBy: user1.userId,
            players: [
                {
                    userId: user1.userId,
                    username: user1.username,
                    codeforcesHandle: user1.codeforcesHandle
                },
                {
                    userId: user2.userId,
                    username: user2.username,
                    codeforcesHandle: user2.codeforcesHandle
                }
            ]
        });

        await battle.save();

        console.log(`Match found! ${user1.username} (${user1.rating}) vs ${user2.username} (${user2.rating}) in room ${roomId}`);

        // Notify both users
        const user1Socket = io.sockets.sockets.get(user1.socket);
        const user2Socket = io.sockets.sockets.get(user2.socket);

        if (user1Socket) {
            user1Socket.join(roomId);
            user1Socket.battleRoomId = roomId;
            user1Socket.userId = user1.userId;
            user1Socket.emit('match-found', {
                success: true,
                message: `Match found! You'll battle ${user2.username}`,
                battle: {
                    roomId: battle.roomId,
                    mode: battle.mode,
                    duration: battle.duration,
                    problemRating: battle.problemRating,
                    opponent: {
                        username: user2.username,
                        rating: user2.rating
                    }
                }
            });
        }

        if (user2Socket) {
            user2Socket.join(roomId);
            user2Socket.battleRoomId = roomId;
            user2Socket.userId = user2.userId;
            user2Socket.emit('match-found', {
                success: true,
                message: `Match found! You'll battle ${user1.username}`,
                battle: {
                    roomId: battle.roomId,
                    mode: battle.mode,
                    duration: battle.duration,
                    problemRating: battle.problemRating,
                    opponent: {
                        username: user1.username,
                        rating: user1.rating
                    }
                }
            });
        }

        // Emit to room that battle is ready
        io.to(roomId).emit('ready-to-start', {
            message: 'Match found! Battle will start soon...'
        });

        // IMPORTANT: Start the battle immediately to fetch problem
        // This will fetch the Codeforces problem and start the battle timer
        const codeforcesService = require('../services/codeforcesService');
        const { startBattleTimer, checkForWinner, endBattle, activeBattles } = require('./battleHelpers')(io);
        
        // Fetch problem and start battle
        setTimeout(async () => {
            try {
                const currentBattle = await Battle.findOne({ roomId });
                
                if (!currentBattle || currentBattle.status !== 'waiting') {
                    console.log('Battle not found or already started');
                    return;
                }

                // Get Codeforces handles
                const handles = currentBattle.players.map(p => p.codeforcesHandle);

                // Fetch unsolved problem
                const problem = await codeforcesService.getUnsolvedProblem(
                    handles,
                    currentBattle.problemRating,
                    currentBattle.topics
                );

                currentBattle.problem = problem;
                currentBattle.status = 'active';
                currentBattle.startTime = new Date();
                currentBattle.endTime = new Date(Date.now() + currentBattle.duration * 60 * 1000);

                await currentBattle.save();

                console.log(`Battle ${roomId} started with problem: ${problem.name}`);

                // Notify players battle has started
                io.to(roomId).emit('battle-started', {
                    problem,
                    duration: currentBattle.duration,
                    endTime: currentBattle.endTime
                });

                // Navigate players to battle room
                io.to(roomId).emit('navigate-to-battle', {
                    roomId: currentBattle.roomId
                });

                // Start timer and winner checking
                startBattleTimer(io, roomId, currentBattle);

            } catch (error) {
                console.error('Start matched battle error:', error);
                io.to(roomId).emit('error', { message: 'Failed to start battle: ' + error.message });
            }
        }, 3000); // 3 second delay

        // Update battle list
        io.emit('battle-list-updated');

    } catch (error) {
        console.error('Create matched battle error:', error);
    }
}

// Periodically check for matches (every 5 seconds)
setInterval(() => {
    if (!ioInstance) return;
    
    for (const [userId, userData] of matchmakingQueue.entries()) {
        const socket = ioInstance.sockets.sockets.get(userData.socket);
        if (socket) {
            findMatch(ioInstance, socket, userId);
        }
    }
}, 5000);

// Get queue status
function getQueueStatus() {
    return {
        total: matchmakingQueue.size,
        users: Array.from(matchmakingQueue.values()).map(u => ({
            username: u.username,
            rating: u.rating,
            waitTime: Date.now() - u.timestamp
        }))
    };
}

module.exports.getQueueStatus = getQueueStatus;
