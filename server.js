const express = require("express");
const app = express();
app.use(express.json());

const bannedUsers = new Map();
const ipBans = new Set();
const ipLog = new Map();

function getIP(req) {
    return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
}

app.post("/check", (req, res) => {
    const { userId, username, accountAge } = req.body;
    const ip = getIP(req);

    console.log(`[JOIN] ${username} (${userId}) | Age: ${accountAge} days | IP: ${ip}`);

    if (ipBans.has(ip)) {
        return res.json({ banned: true, reason: "IP banned (possible alt account)" });
    }

    if (bannedUsers.has(String(userId))) {
        const data = bannedUsers.get(String(userId));
        ipBans.add(ip);
        return res.json({ banned: true, reason: data.reason });
    }

    if (!ipLog.has(ip)) ipLog.set(ip, new Set());
    ipLog.get(ip).add(String(userId));

    for (const uid of ipLog.get(ip)) {
        if (bannedUsers.has(uid)) {
            ipBans.add(ip);
            return res.json({ banned: true, reason: "Alt account of a banned user" });
        }
    }

    return res.json({ banned: false });
});

app.post("/ban", (req, res) => {
    const { userId, username, reason } = req.body;
    bannedUsers.set(String(userId), { username, reason, bannedAt: Date.now() });
    console.log(`[BAN] ${username} (${userId}) - ${reason}`);
    return res.json({ success: true });
});

app.post("/unban", (req, res) => {
    const { userId } = req.body;
    bannedUsers.delete(String(userId));
    console.log(`[UNBAN] UserId: ${userId}`);
    return res.json({ success: true });
});

app.get("/bans", (req, res) => {
    const list = [];
    bannedUsers.forEach((data, uid) => {
        list.push({ userId: uid, ...data });
    });
    res.json(list);
});

app.listen(3000, () => console.log("Ban API running on port 3000"));
