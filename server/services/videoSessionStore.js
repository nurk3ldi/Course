const sessions = new Map();

const pruneExpired = () => {
    const now = Math.floor(Date.now() / 1000);
    for (const [nonce, session] of sessions.entries()) {
        if (session.expire < now || session.hits >= session.maxHits) {
            sessions.delete(nonce);
        }
    }
};

const createSession = ({ nonce, userId, lessonId, ipHash, uaHash, expire, maxHits = 6000 }) => {
    pruneExpired();
    sessions.set(nonce, {
        userId: Number(userId),
        lessonId: Number(lessonId),
        ipHash,
        uaHash,
        expire: Number(expire),
        hits: 0,
        maxHits
    });
};

const validateAndTouchSession = ({ nonce, userId, lessonId, ipHash, uaHash, nowUnix }) => {
    pruneExpired();
    const session = sessions.get(nonce);
    if (!session) return false;
    if (session.expire < nowUnix) {
        sessions.delete(nonce);
        return false;
    }
    if (session.userId !== Number(userId) || session.lessonId !== Number(lessonId)) return false;
    if (session.ipHash !== ipHash || session.uaHash !== uaHash) return false;
    if (session.hits >= session.maxHits) {
        sessions.delete(nonce);
        return false;
    }
    session.hits += 1;
    return true;
};

module.exports = {
    createSession,
    validateAndTouchSession
};
