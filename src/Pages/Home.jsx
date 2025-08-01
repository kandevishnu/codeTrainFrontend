import React, { useState, useEffect, Fragment } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { Dialog, Transition } from "@headlessui/react";
import { db } from "../firebase";
import { useAuth } from "../routes/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import CreateRoomModal from "../components/CreateRoomModal/CreateRoomModal";
import { useNavigate } from "react-router-dom";


const Home = () => {
  const auth = useAuth();
  const user = auth?.user;
  const [showModal, setShowModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;

    const fetchRooms = async () => {
      try {
        const q = query(
          collection(db, "rooms"),
          where("memberIds", "array-contains", user.uid)
        );
        const snapshot = await getDocs(q);
        const roomData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Fetched Rooms:", roomData);
        setRooms(roomData);
      } catch (err) {
        console.error("Error fetching rooms:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [user]);

  return (
    <SidebarLayout>
      <h1 className="text-2xl font-bold mb-6">Project Rooms</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Create and manage all your SDLC project rooms here.
      </p>

      {loading ? (
        <p>Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p>No rooms yet. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => navigate(`/room/${room.id}`)}
              className="cursor-pointer p-4 rounded-lg shadow bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <h3 className="text-lg font-semibold">{room.projectName}</h3>
              <p className="text-sm text-gray-500">Deadline: {room.deadline}</p>
              <p className="text-sm mt-1">
                Phases: {room.sdlcPhases?.join(", ") || "Not yet selected"}
              </p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        +
      </button>

      <Transition appear show={showModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowModal(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel>
                <CreateRoomModal
                  onClose={() => setShowModal(false)}
                  refreshRooms={() => {
                    setLoading(true);
                    const q = query(
                      collection(db, "rooms"),
                      where("memberIds", "array-contains", user.uid)
                    );
                    getDocs(q).then((snapshot) => {
                      const roomData = snapshot.docs.map((doc) => doc.data());
                      setRooms(roomData);
                      setLoading(false);
                    });
                  }}
                />
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </SidebarLayout>
  );
};

export default Home;
