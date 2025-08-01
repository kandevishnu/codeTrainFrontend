import React from "react";

const RoomFormFooter = ({ onCreate, onCancel }) => {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        onClick={onCancel}
        className="px-4 py-2 bg-gray-400 rounded text-white"
      >
        Cancel
      </button>
      <button
        onClick={onCreate}
        className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700"
      >
        Create Room
      </button>
    </div>
  );
};

export default RoomFormFooter;
