import React from 'react';

// A simple, reusable pulsing placeholder
const SkeletonPulse = ({ className }) => (
  <div className={`bg-slate-700 rounded-md animate-pulse ${className}`} />
);

// The skeleton for a single statistic card
const StatCardSkeleton = () => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex items-center space-x-4">
    <div className="p-3 rounded-lg bg-slate-700 animate-pulse">
      <div className="w-6 h-6"></div>
    </div>
    <div className="flex-1 space-y-2">
      <SkeletonPulse className="h-4 w-3/4" />
      <SkeletonPulse className="h-8 w-1/2" />
    </div>
  </div>
);

// The skeleton for the upcoming deadlines section
const UpcomingDeadlinesSkeleton = () => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
    <SkeletonPulse className="h-6 w-1/2 mb-6" />
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <SkeletonPulse className="h-5 w-2/5" />
          <SkeletonPulse className="h-5 w-1/4" />
        </div>
      ))}
    </div>
  </div>
);

// The skeleton for the completion gauge
const CompletionGaugeSkeleton = () => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center">
    <SkeletonPulse className="h-6 w-3/4 mb-4" />
    <div className="relative w-48 h-24 flex items-center justify-center">
      <svg width="192" height="96" viewBox="0 0 192 96">
        <path
          d="M8 88 A 80 80 0 0 1 184 88"
          stroke="rgba(100, 116, 139, 0.5)"
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
    <SkeletonPulse className="h-10 w-1/3 mt-2" />
  </div>
);

// The main skeleton layout for the entire dashboard page
const DashboardSkeleton = () => (
  <div className="relative z-10 h-full w-full overflow-y-auto p-8 bg-slate-900">
    {/* Skeleton Header */}
    <div className="mb-12">
      <SkeletonPulse className="h-12 w-1/2 mb-4" />
      <SkeletonPulse className="h-6 w-3/4" />
    </div>

    {/* Skeleton Stat Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>

    {/* Skeleton Lower Section */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <UpcomingDeadlinesSkeleton />
      </div>
      <div>
        <CompletionGaugeSkeleton />
      </div>
    </div>
  </div>
);

export default DashboardSkeleton;
