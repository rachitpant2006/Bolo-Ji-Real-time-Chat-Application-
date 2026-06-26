import { useContext, useEffect, useRef, useState } from "react";
import assets, { messagesDummyData } from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } =
    useContext(ChatContext);

  const { authUser, onlineUsers, axios } = useContext(AuthContext);

  const scrollEnd = useRef();

  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showPolisher, setShowPolisher] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);

  // Polish or translate draft message text using Gemini API
  const handlePolishText = async (option) => {
    if (!input || input.trim() === "") {
      toast.error("Please type a message first to polish!");
      return;
    }
    setShowPolisher(false);
    setPolishing(true);
    try {
      const { data } = await axios.post("/api/messages/polish", {
        text: input,
        option,
      });
      if (data.success) {
        setInput(data.polishedText);
        toast.success(`Polished with AI! ✨`);
      } else {
        toast.error(data.message || "Failed to polish text");
      }
    } catch (error) {
      console.error("Polishing error:", error);
      toast.error("Error connecting to AI polisher");
    } finally {
      setPolishing(false);
    }
  };

  // Fetch AI suggestions from backend
  const fetchSuggestions = async () => {
    if (!selectedUser) return;
    setLoadingSuggestions(true);
    try {
      const { data } = await axios.get(`/api/messages/suggestions/${selectedUser._id}`);
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return null;

    const textToSend = input.trim();
    if (selectedUser?._id === "660000000000000000000000" || textToSend.toLowerCase().startsWith("@gemini")) {
      setIsAITyping(true);
    }

    await sendMessage({ text: textToSend });
    setInput("");
  };

  // Handle sending media (image or video)
  const handleSendMedia = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please select an image or a video file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (file.type.startsWith("image/")) {
        await sendMessage({ image: reader.result });
      } else if (file.type.startsWith("video/")) {
        await sendMessage({ video: reader.result });
      }
      e.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
      fetchSuggestions();
    }
    setIsAITyping(false); // Reset AI typing state on chat change
  }, [selectedUser]);

  // Turn off AI typing indicator once Gemini's response is received
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isAI) {
        setIsAITyping(false);
      }
    }
  }, [messages]);

  // Dynamically refresh suggestions when a new message is received from the other user
  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only auto-fetch suggestions if the other user sent the last message
      if (lastMessage.senderId !== authUser._id) {
        fetchSuggestions();
      }
    }
  }, [messages.length]);

  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return selectedUser ? (
    <div className="h-full overflow-scroll relative backdrop-blur-lg">
      {/* --------- header --------- */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        {selectedUser._id === "660000000000000000000000" ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-100 animate-pulse">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <img
            src={selectedUser.profilePic || assets.avatar_icon}
            alt="profile"
            className="w-8 rounded-full"
          />
        )}
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {(onlineUsers.includes(selectedUser._id) || selectedUser._id === "660000000000000000000000") && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt="arrow"
          className="md:hidden max-w-7"
        />
        <img
          src={assets.help_icon}
          alt="icon"
          className="max-md:hidden max-w-5"
        />
      </div>
      {/* --------- chat area --------- */}
      <div className="flex flex-col h-[calc(100%-150px)] overflow-y-scroll p-3 pb-12">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 justify-end ${
              msg.senderId !== authUser._id && "flex-row-reverse"
            }`}
          >
            {msg.isAI ? (
              <div className="flex flex-col mb-8 max-w-[230px] items-start">
                <span className="text-[10px] text-violet-400 font-semibold mb-1 flex items-center gap-1">
                  ✨ Gemini AI
                </span>
                <p
                  className={`p-2.5 md:text-sm font-light rounded-lg break-all bg-gradient-to-br from-indigo-600/35 to-violet-700/35 border border-indigo-500/30 text-white rounded-bl-none`}
                >
                  {msg.text}
                </p>
              </div>
            ) : msg.image ? (
              <img
                src={msg.image}
                alt="image"
                className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8"
              />
            ) : msg.video ? (
              <video
                src={msg.video}
                controls
                className="max-w-[250px] border border-gray-700 rounded-lg overflow-hidden mb-8"
              />
            ) : (
              <p
                className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${
                  msg.senderId === authUser._id
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
              >
                {msg.text}
              </p>
            )}

            <div className="text-center text-xs flex flex-col items-center">
              {msg.isAI ? (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-8">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-100 animate-pulse">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <img
                  src={
                    msg.senderId === authUser._id
                      ? authUser?.profilePic || assets.avatar_icon
                      : selectedUser?.profilePic || assets.avatar_icon
                  }
                  alt="profile"
                  className="w-7 rounded-full"
                />
              )}
              <p className="text-gray-500">
                {formatMessageTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {isAITyping && (
          <div className="flex items-end gap-2 justify-end flex-row-reverse animate-fade-in">
            <div className="flex flex-col mb-8 max-w-[230px] items-start">
              <span className="text-[10px] text-violet-400 font-semibold mb-1 flex items-center gap-1">
                ✨ Gemini AI
              </span>
              <div className="p-3 py-2.5 rounded-lg bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-violet-500/10 text-white rounded-bl-none flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce [animation-duration:1s]"></span>
                <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></span>
              </div>
            </div>

            <div className="text-center text-xs flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-100 animate-pulse">
                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-500">Typing...</p>
            </div>
          </div>
        )}
        <div ref={scrollEnd}></div>
      </div>

      {/* --------- bottom area --------- */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2 bg-stone-900/80 backdrop-blur-md">
        
        {/* Chat Suggestions Section */}
        {selectedUser && suggestions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar">
            <button
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className={`p-1.5 rounded-full flex items-center justify-center bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/40 transition cursor-pointer text-violet-300 ${
                loadingSuggestions && "animate-spin"
              }`}
              title="Regenerate AI Suggestions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z"
                />
              </svg>
            </button>
            
            {loadingSuggestions ? (
              <span className="text-[11px] text-stone-400 animate-pulse pl-1 font-light">Generating AI suggestions...</span>
            ) : (
              suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="px-2.5 py-0.5 text-xs rounded-full border border-stone-500/20 bg-stone-800/60 text-stone-200 hover:bg-stone-700/80 hover:text-white transition cursor-pointer whitespace-nowrap"
                >
                  {suggestion}
                </button>
              ))
            )}
          </div>
        )}

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
            type="text"
            placeholder={polishing ? "Polishing draft with AI... ✨" : "Send a message"}
            disabled={polishing}
            className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400"
          />
          
          {/* AI Tone Polisher Trigger & Menu */}
          <div className="relative flex items-center mr-2">
            <button
              onClick={() => setShowPolisher(!showPolisher)}
              className="p-1 rounded-full text-violet-400 hover:text-violet-300 hover:bg-violet-600/20 transition cursor-pointer"
              title="AI Message Tone Polisher & Translator"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.071 4.929a10 10 0 00-14.142 0M19.071 4.929a10 10 0 010 14.142M4.929 19.071a10 10 0 0014.142 0" />
              </svg>
            </button>

            {showPolisher && (
              <div className="absolute bottom-10 right-0 w-48 bg-stone-900/95 border border-stone-700/50 rounded-lg p-1.5 shadow-2xl backdrop-blur-md z-50 flex flex-col gap-1">
                <p className="text-[10px] font-semibold text-violet-400 px-2 py-1 border-b border-stone-800 flex items-center gap-1">
                  ✨ AI Tone & Translation
                </p>
                <button
                  onClick={() => handlePolishText("professional")}
                  className="px-2.5 py-1.5 text-left text-xs rounded hover:bg-violet-600/30 hover:text-violet-200 transition cursor-pointer text-stone-200"
                >
                  💼 Make Professional
                </button>
                <button
                  onClick={() => handlePolishText("casual")}
                  className="px-2.5 py-1.5 text-left text-xs rounded hover:bg-violet-600/30 hover:text-violet-200 transition cursor-pointer text-stone-200"
                >
                  🍕 Make Casual
                </button>
                <button
                  onClick={() => handlePolishText("hinglish")}
                  className="px-2.5 py-1.5 text-left text-xs rounded hover:bg-violet-600/30 hover:text-violet-200 transition cursor-pointer text-stone-200"
                >
                  🇮🇳 Translate to Hinglish
                </button>
                <button
                  onClick={() => handlePolishText("english")}
                  className="px-2.5 py-1.5 text-left text-xs rounded hover:bg-violet-600/30 hover:text-violet-200 transition cursor-pointer text-stone-200"
                >
                  🇬🇧 Translate to English
                </button>
                <button
                  onClick={() => handlePolishText("emojis")}
                  className="px-2.5 py-1.5 text-left text-xs rounded hover:bg-violet-600/30 hover:text-violet-200 transition cursor-pointer text-stone-200"
                >
                  🎭 Add Emojis
                </button>
              </div>
            )}
          </div>

          <input
            onChange={handleSendMedia}
            type="file"
            id="media"
            accept="image/*,video/*"
            hidden
          />
          <label htmlFor="media">
            <img
              src={assets.gallery_icon}
              alt="gallery"
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>
        <img
          onClick={handleSendMessage}
          src={assets.send_button}
          alt="send"
          className="w-7 cursor-pointer"
        />
      </div>
    </div>
  </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
      <img src={assets.logo_icon} alt="logo" className="max-w-16" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  );
};

export default ChatContainer;
