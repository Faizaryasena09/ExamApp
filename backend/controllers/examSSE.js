let clients = [];

exports.streamSession = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);

  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
};

exports.broadcastLogout = (username) => {
  const payload = JSON.stringify({ type: "forceLogout", username });
  clients.forEach(res => res.write(`data: ${payload}\n\n`));
};
