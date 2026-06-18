import React from "react";
import { useNavigate } from "react-router-dom";

export default function VetOverview() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12">
      {/* Header Section */}
      <div className="mb-16 text-center md:text-left">
        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
          Veterinary <span className="text-[var(--green)]">Dashboard</span>
        </h2>
        <p className="text-gray-500 text-xl mt-4 max-w-3xl leading-relaxed">
          Welcome back, Doctor. Monitor city-wide livestock health and review 
          incoming field reports from local farmers in real-time.
        </p>
      </div>

      {/* Main Flash Cards Grid - Updated to 3 columns on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
        
        {/* Health Management Card - Left */}
        <div className="group relative bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between min-h-[550px]">
          <div className="absolute top-0 left-0 w-full h-3 bg-green-500 rounded-t-[2.5rem]"></div>
          
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="p-5 bg-green-50 rounded-3xl text-4xl">🛡️</div>
              <span className="text-xs font-black text-green-600 uppercase tracking-[0.2em]">Census & Health</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-6">Health Records</h3>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Access the comprehensive ADTS livestock database. Monitor 
              population health trends, track vaccination status, and review the 
              medical history of registered animals.
            </p>
          </div>

          <button 
            onClick={() => navigate("/vet/health-records")}
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-lg transition-all hover:bg-green-700 active:scale-95 shadow-lg shadow-green-200"
          >
            View Health Database
          </button>
        </div>

        {/* Disease Reporting Card - Middle */}
        <div className="group relative bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between min-h-[550px]">
          <div className="absolute top-0 left-0 w-full h-3 bg-red-600 rounded-t-[2.5rem]"></div>
          
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="p-5 bg-red-50 rounded-3xl text-4xl">🚨</div>
              <span className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">High Priority</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-6">Disease Reports</h3>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Immediately review recent submissions from the field. Identify and 
              respond to potential outbreaks of ASF, Avian Influenza, or other 
              communicable diseases.
            </p>
          </div>

          <button 
            onClick={() => navigate("/vet/transactions")}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-lg transition-all hover:bg-red-700 active:scale-95 shadow-lg shadow-red-200"
          >
            View Disease Reports
          </button>
        </div>

        {/* Movement Permits Card - Right Side */}
        <div className="group relative bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between min-h-[550px]">
          <div className="absolute top-0 left-0 w-full h-3 bg-blue-600 rounded-t-[2.5rem]"></div>
          
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="p-5 bg-blue-50 rounded-3xl text-4xl">🚑</div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">Compliance</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-6">Movement Permits</h3>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Authorize and track the transport of livestock between locations. 
              Review permit applications and issue clearance for healthy animals 
              following strict biosecurity protocols.
            </p>
          </div>

          <button 
            onClick={() => navigate("/vet/movement-permits")}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200"
          >
            Manage Permits
          </button>
        </div>

      </div>
    </div>
  );
}