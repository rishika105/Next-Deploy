"use client";

const BuildSettings = ({framework}) => {
  return (
    <>
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 sticky top-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-gray-900/30 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Build Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Framework
            </label>
            <div className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 flex items-center justify-between">
              <span>{framework || "Node.js"}</span>
              <span className="text-xs px-2 py-1 bg-gray-800 text-gray-500 rounded">
                Info
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              For reference, doesn't affect build
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Build Command
            </label>
            <div className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 font-mono text-sm text-gray-400">
              npm run build
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Install Command
            </label>
            <div className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 font-mono text-sm text-gray-400">
              npm install
            </div>
          </div>

          <div className="pt-4 border-t border-gray-900">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p>
                Build commands are fixed. Used Npm mananger. Entry point is
                index.html for all frontend frameworks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BuildSettings;
