import { useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const VerifyEmail = () => {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    if (mode === "verifyEmail" && oobCode) {
      navigate(`/email-verified?mode=${mode}&oobCode=${oobCode}`);
    }
  }, []);

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return toast.error("No user found.");
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        toast.success("Email verified! 🎉");
        navigate("/dashboard");
      } else {
        await signOut(auth);
        toast.info("Verification not detected. Please sign in again.");
        navigate("/login");
      }
    } catch (err) {
      toast.error("Failed to check verification.");
      console.error(err);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return toast.error("No user found.");
    if (cooldown > 0) return toast.info(`Please wait ${cooldown}s to resend.`);

    try {
      setLoading(true);
      await reload(auth.currentUser);
      await sendEmailVerification(auth.currentUser, {
        url: "http://localhost:5173/email-verified",
        handleCodeInApp: false,
      });

      toast.success("Verification email sent again.");
      setCooldown(60);
    } catch (err) {
      if (err.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Try again later.");
        await signOut(auth);
        navigate("/login");
      } else {
        toast.error("Failed to resend verification email.");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!password)
      return toast.error("Password is required to delete the account.");

    if (!auth.currentUser) return toast.error("No user found.");

    try {
      setLoading(true);
      await reload(auth.currentUser);
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await auth.currentUser.delete();
      toast.success("Account deleted. Please register with correct email.");
      setShowModal(false);
      navigate("/signup");
    } catch (err) {
      if (err.code === "auth/wrong-password") {
        toast.error("Incorrect password.");
      } else if (err.code === "auth/requires-recent-login") {
        toast.error("Please sign in again to delete your account.");
        await signOut(auth);
        navigate("/login");
      } else {
        toast.error("Failed to delete account.");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 text-center dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-4">Verify Your Email</h1>
      <p className="mb-4">
        A verification email has been sent to <br />
        <span className="font-medium">{user?.email}</span>. <br />
        After verifying, click below:
      </p>

      <div className="flex gap-4 mt-6">
        <button
          onClick={handleCheckVerification}
          className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition"
        >
          I’ve Verified
        </button>
        <button
          onClick={handleResend}
          disabled={loading || cooldown > 0}
          className={`border border-cyan-600 text-cyan-600 px-4 py-2 rounded transition ${
            loading || cooldown > 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-cyan-100 dark:hover:bg-gray-800"
          }`}
        >
          {loading
            ? "Sending..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend Email"}
        </button>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-red-500 underline mt-6"
      >
        Change Email Address
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-80 shadow-xl">
            <h2 className="text-xl font-bold mb-2 dark:text-white">
              Confirm Account Deletion
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Enter your password to delete this account and change email.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your Password"
              className="w-full mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring"
            />
            <div className="flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={loading}
                className={`px-4 py-2 rounded text-white ${
                  loading
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Processing..." : "Delete & Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyEmail;
