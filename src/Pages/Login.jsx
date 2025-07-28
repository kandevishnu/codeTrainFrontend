import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();


  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const { email, password } = formData;

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const name = result.user.displayName || "User";
      toast.success(`Welcome back ${name}!`);
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        toast.error("User not found");
      } else if (err.code === "auth/wrong-password") {
        toast.error("Wrong password");
      } else {
        toast.error("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const name = result.user.displayName || "User";
      toast.success(`Welcome back ${name}!`);
      navigate("/dashboard");
    } catch (err) {
      toast.error("Google login failed");
    }
  };

  const handleForgotPassword = async () => {
    const email = formData.email.trim();

    if (!email) {
      toast.error("Enter your email to reset password");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        toast.error("No user with this email");
      } else if (err.code === "auth/invalid-email") {
        toast.error("Invalid email");
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          Login to CodeTrain
        </h2>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-2 border rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:ring focus:ring-blue-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2 border rounded dark:bg-gray-700 dark:text-white pr-10 focus:outline-none focus:ring focus:ring-blue-400 hide-edge-eye"
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-blue-500 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="my-4 text-center text-gray-500 dark:text-gray-300">
          or
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white border hover:bg-gray-200 text-black py-2 px-4 rounded transition cursor-pointer"
        >
          {/* Google SVG as-is */}
          <svg
            className="w-5 h-5"
            viewBox="0 0 533.5 544.3"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M533.5 278.4c0-17.7-1.4-35-4.1-51.7H272v97.8h147.5c-6.4 34.4-25.3 63.4-53.8 83.1v68.7h86.9c50.8-46.8 80.9-115.8 80.9-197.9z"
              fill="#4285F4"
            />
            <path
              d="M272 544.3c72.6 0 133.5-24 178-65.3l-86.9-68.7c-24.1 16.1-55 25.5-91.1 25.5-69.9 0-129.1-47.2-150.3-110.7H32.5v69.5C77.1 475.6 167.7 544.3 272 544.3z"
              fill="#34A853"
            />
            <path
              d="M121.7 325.1c-10-29.4-10-61.1 0-90.5V165H32.5c-36.1 71.7-36.1 156.1 0 227.8l89.2-67.7z"
              fill="#FBBC05"
            />
            <path
              d="M272 107.4c39.5-.6 77.6 14.5 106.8 41.6l79.4-79.4C416.9 24 346.6-2.6 272 0 167.7 0 77.1 68.7 32.5 165l89.2 69.5C142.9 154.5 202.1 107.4 272 107.4z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
