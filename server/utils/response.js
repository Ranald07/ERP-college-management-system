const ok   = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true,  data, message });

const fail = (res, message = "Error", status = 500) =>
  res.status(status).json({ success: false, data: null, message });

module.exports = { ok, fail };
