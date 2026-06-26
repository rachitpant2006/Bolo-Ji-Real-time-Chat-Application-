import { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";

const Sidebar = () => {
  const {
    friends,
    users,
    incomingRequests,
    outgoingRequests,
    selectedUser,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    getContacts,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
  } = useContext(ChatContext);

  const { logout, onlineUsers } = useContext(AuthContext);

  const [input, setInput] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    getContacts();
  }, [onlineUsers]);

  const handleSearch = (value) => {
    setInput(value);
    if (!value.trim()) {
      getContacts();
      return;
    }

    searchUsers(value);
  };

  return (
    <div
      className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${
        selectedUser ? "max-md:hidden" : ""
      }`}
    >
      <div className="pb-5">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-40" />
          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="menu"
              className="max-h-5 cursor-pointer"
            />
            <div className="absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p onClick={() => logout()} className="cursor-pointer text-sm">
                Logout
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            onChange={(e) => handleSearch(e.target.value)}
            value={input}
            type="text"
            className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
            placeholder="Search contacts or find new users..."
          />
        </div>
      </div>

      {incomingRequests.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Friend requests</p>
          {incomingRequests.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between gap-2 p-2 rounded bg-[#2a2640] mb-2"
            >
              <div className="flex items-center gap-2">
                <img
                  src={user?.profilePic || assets.avatar_icon}
                  alt="profile"
                  className="w-8 rounded-full"
                />
                <span className="text-sm">{user.fullName}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => acceptFriendRequest(user._id)}
                  className="text-xs px-2 py-1 bg-green-500 rounded"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineFriendRequest(user._id)}
                  className="text-xs px-2 py-1 bg-gray-600 rounded"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        {/* Pinned Gemini AI Assistant */}
        <div
          onClick={() => {
            setSelectedUser({
              _id: "660000000000000000000000",
              fullName: "Gemini AI 🌟",
              profilePic: "",
              bio: "AI Assistant. Chat directly with me!",
              isBot: true,
            });
          }}
          className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm border-b border-violet-500/10 mb-2 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 hover:from-violet-600/20 hover:to-indigo-600/20 transition ${
            selectedUser?._id === "660000000000000000000000" && "bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border-l-2 border-violet-500"
          }`}
        >
          <div className="w-[35px] h-[35px] rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-100 animate-pulse">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 flex flex-col leading-5">
            <p className="font-semibold text-violet-300 flex items-center gap-1.5">
              Gemini AI <span className="text-[10px] bg-violet-600/40 text-violet-200 px-1.5 py-0.5 rounded-full font-light">Bot</span>
            </p>
            <span className="text-violet-400 text-xs">Always Active</span>
          </div>
        </div>

        {users.map((user, index) => {
          const isFriend = friends.some((friend) => friend._id === user._id);
          const isPending = outgoingRequests.some((req) => req._id === user._id);

          return (
            <div
              key={index}
              onClick={() => {
                if (!isFriend) return;
                setSelectedUser(user);
                setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));
              }}
              className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm ${
                selectedUser?._id === user._id && "bg-[#282142]/50"
              }`}
            >
              <img
                src={user?.profilePic || assets.avatar_icon}
                alt="profile"
                className="w-[35px] aspect-[1/1] rounded-full"
              />
              <div className="flex-1 flex flex-col leading-5">
                <p>{user.fullName}</p>
                {isFriend ? (
                  onlineUsers.includes(user._id) ? (
                    <span className="text-green-400 text-xs">Online</span>
                  ) : (
                    <span className="text-neutral-400 text-xs">Offline</span>
                  )
                ) : (
                  <span className="text-neutral-400 text-xs">Not connected</span>
                )}
              </div>

              {isFriend ? (
                unseenMessages[user._id] > 0 && (
                  <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50">
                    {unseenMessages[user._id]}
                  </p>
                )
              ) : (
                <button
                  onClick={() => sendFriendRequest(user._id)}
                  className="text-xs px-2 py-1 bg-purple-500 rounded"
                  disabled={isPending}
                >
                  {isPending ? "Pending" : "Add"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
