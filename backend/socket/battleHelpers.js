const Battle = require('../models/Battle');
const codeforcesService = require('../services/codeforcesService');
const { updateBattleScores } = require('../utils/scoring');

const activeBattles = new Map(); // roomId -> { timer, checkInterval }

module.exports = (io) => {
    // Battle timer and winner detection
    function startBattleTimer(io, roomId, battle) {
        const durationMs = battle.duration * 60 * 1000;
        const startTime = battle.startTime;

        // Timer updates every 30 seconds
        const timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime.getTime();
            const remaining = Math.max(0, durationMs - elapsed);

            io.to(roomId).emit('battle-timer', {
                remaining: Math.floor(remaining / 1000), // in seconds
                elapsed: Math.floor(elapsed / 1000)
            });

            if (remaining <= 0) {
                clearInterval(timerInterval);
            }
        }, 30000);

        // Check for winner every 10 seconds
        const checkInterval = setInterval(async () => {
            await checkForWinner(io, roomId);
        }, 10000);

        // End battle after duration
        const battleTimer = setTimeout(async () => {
            await endBattle(io, roomId, 'draw');
        }, durationMs);

        activeBattles.set(roomId, { battleTimer, timerInterval, checkInterval });
    }

    // Check for winner
    async function checkForWinner(io, roomId) {
        try {
            const battle = await Battle.findOne({ roomId });

            if (!battle || battle.status !== 'active') return;

            const { contestId, index } = battle.problem;

            for (const player of battle.players) {
                const solved = await codeforcesService.checkProblemSolved(
                    player.codeforcesHandle,
                    contestId,
                    index,
                    battle.startTime
                );

                if (solved) {
                    await endBattle(io, roomId, 'finished', player);
                    return;
                }
            }
        } catch (error) {
            console.error('Check winner error:', error);
        }
    }

    // End battle
    async function endBattle(io, roomId, status, winner = null) {
        try {
            const battle = await Battle.findOne({ roomId });

            if (!battle || battle.status === 'finished' || battle.status === 'draw') {
                console.log('Battle already ended or not found:', roomId);
                return;
            }

            battle.status = status;
            battle.endTime = new Date();

            if (winner) {
                battle.winner = {
                    userId: winner.userId,
                    username: winner.username,
                    codeforcesHandle: winner.codeforcesHandle
                };
            }

            await battle.save();
            
            console.log(`Battle ${roomId} ended with status: ${status}`, winner ? `Winner: ${winner.username}` : 'No winner');

            // Update scores
            await updateBattleScores(battle);

            const battleData = {
                roomId: battle.roomId,
                status: battle.status,
                winner: battle.winner,
                endTime: battle.endTime,
                problem: battle.problem,
                mode: battle.mode,
                duration: battle.duration,
                problemRating: battle.problemRating,
                players: battle.players
            };

            if (status === 'finished' && winner) {
                io.to(roomId).emit('battle-ended', {
                    success: true,
                    winner: {
                        userId: winner.userId,
                        username: winner.username,
                        codeforcesHandle: winner.codeforcesHandle
                    },
                    battle: battleData
                });
            } else {
                io.to(roomId).emit('battle-draw', {
                    success: true,
                    message: 'Time expired! No winner. All players earn +5 points.',
                    battle: battleData
                });
            }

            // Cleanup timers
            cleanupBattle(roomId);
            
            io.emit('battle-list-updated');

        } catch (error) {
            console.error('End battle error:', error);
        }
    }

    // Cleanup battle resources
    function cleanupBattle(roomId) {
        const battleData = activeBattles.get(roomId);
        if (battleData) {
            if (battleData.battleTimer) clearTimeout(battleData.battleTimer);
            if (battleData.timerInterval) clearInterval(battleData.timerInterval);
            if (battleData.checkInterval) clearInterval(battleData.checkInterval);
            activeBattles.delete(roomId);
        }
    }

    return {
        startBattleTimer,
        checkForWinner,
        endBattle,
        cleanupBattle,
        activeBattles
    };
};
