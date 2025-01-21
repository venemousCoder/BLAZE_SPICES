const mongoose = require("mongoose");

const messagesSchema = mongoose.Schema({});

const messages = mongoose.model("messages", messagesSchema);

module.exports = messages;
