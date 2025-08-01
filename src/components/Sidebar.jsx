import React from 'react';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 p-4 shadow">
      <h2 className="text-xl font-bold mb-6">CodeTrain</h2>
      <nav>
        <ul className="space-y-4">
          <li><a href="/dashboard" className="hover:underline">Dashboard</a></li>
          <li><a href="/settings" className="hover:underline">Settings</a></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
