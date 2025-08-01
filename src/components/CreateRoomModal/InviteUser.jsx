import React, { useState } from "react";
import { toast } from "react-toastify";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const InviteUser = ({ invitedUsers, setInvitedUsers }) => {
  const [email, setEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setSearchResult(null);
    setLoading(true);

    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setSearchResult({ ...data, email });
      } else {
        setSearchResult("not_found");
      }
    } catch (err) {
      toast.error("Error searching user.");
      setSearchResult("not_found");
    }

    setLoading(false);
  };

  const handleInvite = () => {
    if (!invitedUsers.find((u) => u.email === searchResult.email)) {
      setInvitedUsers((prev) => [...prev, searchResult]);
      toast.success(`Invited: ${searchResult.email}`);
    } else {
      toast.info("User already invited.");
    }
    setSearchResult(null);
    setEmail("");
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-2">Invite by Email</h3>
      <div className="flex gap-2 mb-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          className="border border-gray-300 rounded px-4 py-2 w-full"
          placeholder="Enter user email"
        />
        <button
          onClick={handleSearch}
          disabled={!email || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {searchResult === "not_found" && (
        <p className="text-red-500">No user found with this email.</p>
      )}

      {searchResult && searchResult !== "not_found" && (
        <div className="border p-3 rounded flex justify-between items-center">
          <div>
            <p className="font-semibold">{searchResult.email}</p>
            <p className="text-sm text-gray-500">Name: {searchResult.name || "N/A"}</p>
          </div>
          <button
            onClick={handleInvite}
            className="bg-green-600 text-white px-3 py-1 rounded"
          >
            Invite
          </button>
        </div>
      )}

      {invitedUsers.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-medium mb-2">Invited:</h4>
          <ul className="list-disc list-inside text-sm">
            {invitedUsers.map((u, i) => (
              <li key={i}>{u.email}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InviteUser;
