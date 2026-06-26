import { GoogleGenerativeAI } from "@google/generative-ai";
import Message from "../models/Messages.js";
import User from "../models/User.js";
import { io, userSocketMap } from "../server.js";

let genAI = null;

// Initialize the Gemini API client lazily
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// Check if Gemini is configured in the environment variables
const isGeminiConfigured = () => {
  return !!process.env.GEMINI_API_KEY;
};

// 1. Generate smart chat suggestions based on recent conversation history
export const getChatSuggestions = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;

    // Fetch the last 15 messages between these two users
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(15);

    // If no messages exist yet, immediately return general greetings (saves credits!)
    if (!messages || messages.length === 0) {
      return res.json({
        success: true,
        suggestions: ["Hey!", "How's it going?", "What's up?"],
        source: "default",
      });
    }

    // Reverse to get chronological order
    messages.reverse();

    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Gemini API key is not configured. Add GEMINI_API_KEY to your server .env file.",
      });
    }

    // Get user names for better contextual references
    const myUser = await User.findById(myId).select("fullName");
    const otherUser = await User.findById(selectedUserId).select("fullName");

    const myName = myUser ? myUser.fullName : "Me";
    const otherName = otherUser ? otherUser.fullName : "Them";

    // Format conversation history
    const conversationHistory = messages
      .map((msg) => {
        const sender = msg.senderId.toString() === myId.toString() ? myName : otherName;
        const content = msg.text ? msg.text : msg.image ? "[Shared an image]" : msg.video ? "[Shared a video]" : "[Media]";
        return `${sender}: ${content}`;
      })
      .join("\n");

    const prompt = `You are a chat suggestions assistant. Analyze the following recent chat conversation between ${myName} (me) and ${otherName}:

${conversationHistory}

Based on the conversation context and tone, generate exactly 3 short, natural, conversational quick-replies that ${myName} can send next.
- The suggestions must be extremely brief (1 to 5 words).
- They should flow naturally from the last message sent.
- Tone and Language: Match the language, vocabulary, and slang used in the chat. If the users are chatting in Hinglish (Hindi written in English script, e.g., "kya chal raha hai", "kaha ho", "haan bilkul", "thik hai", "batao"), the suggestions MUST also be in natural Hinglish!
- Do not include punctuation like quotes or bullet points in the raw response.
- Do not use emojis unless appropriate to the tone.

Return ONLY a valid JSON string array of 3 strings. Example format:
["Haan bilkul!", "Kya chal raha hai?", "Call karta hu"]`;

    const genAIClient = getGeminiClient();
    const model = genAIClient.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Extract the JSON array from the response in case there is any markdown wrapping (like ```json ... ```)
    let jsonString = responseText;
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    try {
      const suggestions = JSON.parse(jsonString);
      if (Array.isArray(suggestions) && suggestions.length >= 3) {
        return res.json({ success: true, suggestions: suggestions.slice(0, 3), source: "gemini" });
      }
    } catch (parseError) {
      console.error("Gemini raw text response:", responseText);
      console.error("JSON parsing error for suggestions:", parseError.message);
    }

    // Fallback if parsing fails or response format was incorrect
    res.json({
      success: true,
      suggestions: ["Sounds good!", "Awesome!", "Okay"],
      source: "fallback",
    });
  } catch (error) {
    console.error("Suggestions error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// 2. Polish or translate draft message text using Gemini API
export const polishMessageText = async (req, res) => {
  try {
    const { text, option } = req.body;
    if (!text || text.trim() === "") {
      return res.json({ success: false, message: "Text is required" });
    }

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Gemini API key is not configured.",
      });
    }

    let instruction = "";
    switch (option) {
      case "professional":
        instruction = "Rewrite this text to be polite, professional, and clear. Maintain the original meaning but make it suitable for a workplace or formal setting. Crucially, you must maintain the language of the original text: if the user types in Hinglish (Hindi written in English alphabet, e.g. 'kya chal raha hai', 'report dede'), the professional version MUST also be in professional Hinglish (e.g. 'kripya mujhe report pradan karein'), not translated to English.";
        break;
      case "casual":
        instruction = "Rewrite this text to be warm, friendly, casual, and easy-going. Add a friendly tone.";
        break;
      case "hinglish":
        instruction = "Translate or rewrite this text into natural, casual Hinglish (Hindi written in English alphabets, e.g. 'kya chal raha hai', 'kal milte hai', 'batao'). Make it sound like a friendly text message.";
        break;
      case "english":
        instruction = "Translate or rewrite this text into fluent, natural English.";
        break;
      case "emojis":
        instruction = "You must PRESERVE the surrounding text exactly without rephrasing or deleting regular words. However, if the text contains any parenthetical requests or instructions to add or insert an emoji (such as '(insert emoji with chad face)', '(add emoji of ...)', '(emoji here)', '(chad face)', etc.), you MUST completely REPLACE that parenthetical prompt with the requested actual emoji (e.g. replacing '(insert emoji with chad face)' with '🗿'). If no such parenthetical placeholders exist, simply insert 1 to 2 relevant emojis at the end of the text. Do not add extra emojis.";
        break;
      default:
        instruction = "Rewrite or improve this text to be clear and concise.";
    }

    const prompt = `You are a writing assistant. ${instruction}
Original Text: "${text}"

Output ONLY the rewritten text without quotes, explanation, or introductory text.`;

    const genAIClient = getGeminiClient();
    const model = genAIClient.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const polishedText = result.response.text().trim();

    res.json({ success: true, polishedText });
  } catch (error) {
    console.error("Polish text error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

export const handleGeminiCopilot = async (text, senderId, receiverId) => {
  try {
    let query = text.trim();
    if (query.toLowerCase().startsWith("@gemini")) {
      query = query.slice(7).trim(); // Remove "@gemini"
    }

    if (!isGeminiConfigured() || !query) return;

    const isDirectChat = receiverId === "660000000000000000000000";

    // Fetch the last 10 messages for context
    const prevMessages = await Message.find({
      $or: [
        { senderId: senderId, receiverId: receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10);

    prevMessages.reverse();

    const myUser = await User.findById(senderId).select("fullName");
    let otherName = "Contact";
    if (isDirectChat) {
      otherName = "Gemini AI";
    } else {
      const otherUser = await User.findById(receiverId).select("fullName");
      otherName = otherUser ? otherUser.fullName : "Contact";
    }
    const myName = myUser ? myUser.fullName : "User";

    const conversationHistory = prevMessages
      .map((msg) => {
        const name = msg.senderId.toString() === senderId.toString() ? myName : otherName;
        return `${name}: ${msg.text || "[Media]"}`;
      })
      .join("\n");

    const systemRole = isDirectChat
      ? `You are a helpful, intelligent, and friendly AI Chat Assistant named "Gemini". You are in a direct private 1-on-1 chat room with the user "${myName}".`
      : `You are a helpful, intelligent, and conversational AI Chat Copilot named "Gemini". You are participating in a real-time group messaging chat room between "${myName}" and "${otherName}".`;

    const prompt = `${systemRole}
Recent chat history:
${conversationHistory}

The user "${myName}" has sent the following message/query:
"${query}"

Please reply directly to their message.
- Keep your response brief, friendly, engaging, and clear (1 to 3 sentences maximum).
- Tone & Language: Match the tone of the chat. If they chat in Hinglish (Hindi written in English alphabet), you MUST reply in natural Hinglish!
- Do not prefix your message with your name or any introductory tags (e.g. do NOT say "Gemini: Hello!"). Output ONLY the direct message text.`;

    const genAIClient = getGeminiClient();
    const model = genAIClient.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Create the AI reply message in the database (sender is the contact, marked as isAI: true)
    const aiMessage = await Message.create({
      senderId: receiverId, // Send from the contact's side
      receiverId: senderId, // To the original user
      text: responseText,
      isAI: true,
    });

    // Emit the AI response to both participants in real-time
    const userSocket = userSocketMap[senderId];
    const contactSocket = userSocketMap[receiverId];

    if (userSocket) {
      io.to(userSocket).emit("newMessage", aiMessage);
    }
    if (contactSocket) {
      io.to(contactSocket).emit("newMessage", aiMessage);
    }
  } catch (aiError) {
    console.error("AI Copilot background error:", aiError.message);
  }
};
