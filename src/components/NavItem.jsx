import { NavLink } from "react-router-dom";
import React from "react";

const NavItem = ({ to, icon, children, badgeCount }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                        ? "bg-purple-600 text-white"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`
            }
        >
            <div className="flex items-center space-x-4">
                {icon}
                <span>{children}</span>
            </div>
            {badgeCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {badgeCount}
                </span>
            )}
        </NavLink>
    );
};

export default NavItem;
