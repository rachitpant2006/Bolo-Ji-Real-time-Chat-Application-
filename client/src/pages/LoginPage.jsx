import { useContext, useState } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";

const LoginPage = () => {
  const [currState, setCurrentState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);

  const { login } = useContext(AuthContext);

  const onSubmitHandler = (event) => {
    event.preventDefault();

    if (currState === "Sign up" && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    login(currState === "Sign up" ? "signup" : "login", {
      fullName,
      email,
      password,
      bio,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center max-sm:flex-col bg-cover bg-center backdrop-blur-2xl">

      {/* -------- LEFT SIDE -------- */}
      <div className="w-1/2 flex flex-col items-center justify-center gap-6 max-sm:w-full text-center">

        {/* ✅ BIG LOGO */}
        <img
          src={assets.logo_login}
          alt="logo"
          className="w-120 h-120 rounded-4xl shadow-2xl object-cover"
        />

        {/* ✅ STYLED HEADING */}
        <h1 className="text-8xl font-extrabold bg-gradient-to-r from-purple-400 to-violet-600 bg-clip-text text-transparent tracking-wide drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
          Bolo Ji
        </h1>

        {/* ✅ TAGLINE */}
        <p className="text-gray-300 text-2xl max-w-md">
          Experience seamless real-time chatting with speed, security,
          and modern design.
        </p>

      </div>

      {/* -------- RIGHT SIDE -------- */}
      <div className="w-1/2 flex items-center justify-center max-sm:w-full">
        <form
          onSubmit={onSubmitHandler}
          className="border-2 bg-white/10 text-white border-gray-500 p-8 flex flex-col gap-6 rounded-xl shadow-2xl w-[90%] max-w-[520px]"
        >
          <h2 className="font-medium text-2xl flex justify-between items-center">
            {currState}
            {isDataSubmitted && (
              <img
                onClick={() => setIsDataSubmitted(false)}
                src={assets.arrow_icon}
                alt="arrow"
                className="w-5 cursor-pointer"
              />
            )}
          </h2>

          {currState === "Sign up" && !isDataSubmitted && (
            <input
              onChange={(e) => setFullName(e.target.value)}
              value={fullName}
              type="text"
              className="p-2 border border-gray-500 rounded-md focus:outline-none"
              placeholder="Full Name"
              required
            />
          )}

          {!isDataSubmitted && (
            <>
              <input
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                type="email"
                placeholder="Email Address"
                required
                className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                type="password"
                placeholder="Password"
                required
                className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </>
          )}

          {currState === "Sign up" && isDataSubmitted && (
            <textarea
              onChange={(e) => setBio(e.target.value)}
              value={bio}
              rows={4}
              className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Provide a short bio..."
              required
            ></textarea>
          )}

          <button
            type="submit"
            className="py-3 bg-gradient-to-r from-purple-400 to-violet-600 text-white rounded-md cursor-pointer"
          >
            {currState === "Sign up" ? "Create Account" : "Login Now"}
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" />
            <p>Agree to the terms of use & privacy policy.</p>
          </div>

          <div className="flex flex-col gap-2">
            {currState === "Sign up" ? (
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <span
                  onClick={() => {
                    setCurrentState("Login");
                    setIsDataSubmitted(false);
                  }}
                  className="font-medium text-violet-400 cursor-pointer"
                >
                  Login here
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Create an account{" "}
                <span
                  onClick={() => setCurrentState("Sign up")}
                  className="font-medium text-violet-400 cursor-pointer"
                >
                  Click here
                </span>
              </p>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};

export default LoginPage;