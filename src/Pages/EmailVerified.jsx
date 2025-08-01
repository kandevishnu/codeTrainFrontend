import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../firebase";
import { applyActionCode } from "firebase/auth";
import { toast } from "react-toastify";

const EmailVerified = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying...");

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    if (mode === "verifyEmail" && oobCode) {
      applyActionCode(auth, oobCode)
        .then(async () => {
          await auth.currentUser?.reload(); 
          setMessage("✅ Your email is now verified!");
          toast.success("Email verified successfully!");
        })
        .catch((err) => {
          console.error(err);
          setMessage("❌ Verification failed or expired.");
          toast.error("Email verification failed.");
        });
    } else {
      setMessage("❌ Invalid verification link.");
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 text-center dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-4">Email Verification</h1>
      <p className="text-xl">{message}</p>

      {message.includes("verified") && (
        <button
          onClick={() => navigate("/verify-email")}
          className="mt-6 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
        >
          Back to Continue
        </button>
      )}
    </div>
  );
};

export default EmailVerified;
