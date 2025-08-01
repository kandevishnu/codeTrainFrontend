import React from "react";

const SDLC_PHASES = [
  "Planning",
  "Requirement Analysis",
  "Design",
  "Implementation",
  "Testing",
  "Deployment",
  "Maintenance",
];

const PhaseSelector = ({ phases, setPhases }) => {
  const togglePhase = (phase) => {
    setPhases((prev) =>
      prev.includes(phase)
        ? prev.filter((p) => p !== phase)
        : [...prev, phase]
    );
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-2">Select SDLC Phases</h3>
      <div className="flex flex-wrap gap-2">
        {SDLC_PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => togglePhase(phase)}
            className={`px-4 py-2 rounded-full border ${
              phases.includes(phase)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-800 border-gray-300"
            } hover:shadow`}
          >
            {phase}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PhaseSelector;
