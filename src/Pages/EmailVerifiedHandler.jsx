import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth } from "../firebase";

const EmailVerifiedHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    if (mode === "verifyEmail" && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setIsSuccess(true);
          setMessage("✅ Email verified successfully!");
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev === 1) {
                clearInterval(interval);
                navigate("/dashboard");
              }
              return prev - 1;
            });
          }, 1000);
        })
        .catch((error) => {
          console.error("Verification error:", error);
          setIsSuccess(false);
          setMessage("❌ Invalid or expired verification link.");
        });
    } else if (mode === "resetPassword") {
      navigate(`/reset-password?${searchParams.toString()}`);
    } else {
      setMessage("❌ Invalid request.");
    }
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen px-4 text-center dark:bg-gray-900 dark:text-white">
      <div className="max-w-md w-full p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4">
          {isSuccess ? "Email Verified 🎉" : "Verification Failed"}
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>

        {isSuccess && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Redirecting to dashboard in{" "}
            <span className="font-semibold">{countdown}s</span>...
          </p>
        )}

        <button
          onClick={() => navigate(isSuccess ? "/dashboard" : "/login")}
          className={`mt-4 px-4 py-2 rounded text-white transition ${
            isSuccess
              ? "bg-cyan-600 hover:bg-cyan-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isSuccess ? "Go to Dashboard" : "Back to Login"}
        </button>
      </div>
    </div>
  );
};

export default EmailVerifiedHandler;
