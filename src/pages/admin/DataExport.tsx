import React, { useState, useEffect } from "react";
import {
  Download,
  FileText,
  Table,
  Calendar,
  Users,
  Filter,
} from "lucide-react";
import { eventsAPI, registrationsAPI } from "../../utils/api";

interface Event {
  id: string;
  code: string;
  title: string;
}

const DataExport = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("All Meetings");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.list();
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleExport = async (
    format: "csv" | "excel",
    type: "all" | "filtered"
  ) => {
    const exportKey = `${format}-${type}`;
    setExportLoading(exportKey);

    try {
      let params: any = {};

      if (type === "filtered") {
        if (startDate) params.date_from = startDate;
        if (endDate) params.date_to = endDate;
        if (selectedEvent !== "All Meetings") {
          params.event = selectedEvent;
        }
      }

      // In a real implementation, this would call an export API endpoint
      const response = await registrationsAPI.list(params);

      // Simulate file download
      const data = response.data;
      const filename = `registrations_${type}_${
        new Date().toISOString().split("T")[0]
      }.${format === "excel" ? "xlsx" : "csv"}`;

      // Create and download file (this is a simplified version)
      console.log("Exporting data:", { format, type, params, data });

      // Mock download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data");
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                Abbott
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search admin content..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-8">
            <div className="px-4 space-y-2">
              <a
                href="/dashboard"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Calendar className="w-5 h-5 mr-3" />
                Dashboard
              </a>
              <a
                href="/meetings"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Calendar className="w-5 h-5 mr-3" />
                Manage Meetings
              </a>
              <a
                href="/registrations"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Users className="w-5 h-5 mr-3" />
                Registrations
              </a>
              <a
                href="/reports"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <FileText className="w-5 h-5 mr-3" />
                Reports & Analytics
              </a>
              <a
                href="/export"
                className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-lg"
              >
                <Download className="w-5 h-5 mr-3" />
                Data Export
              </a>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Data Export
            </h1>
            <p className="text-gray-600 mb-8">
              Download all available registration data in common formats for
              quick analysis.
            </p>

            {/* Quick Export Options */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Export Options
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* CSV Export */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center mb-4">
                    <Table className="w-8 h-8 text-blue-500 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        All Registrations
                      </h3>
                      <p className="text-sm text-gray-600">
                        Download all historical registration records including
                        timestamps.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExport("csv", "all")}
                    disabled={exportLoading === "csv-all"}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportLoading === "csv-all" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export as CSV
                      </>
                    )}
                  </button>
                </div>

                {/* Excel Export */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="w-8 h-8 text-green-500 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        All Registrations
                      </h3>
                      <p className="text-sm text-gray-600">
                        Get a comprehensive Excel file of all past and current
                        registrations.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExport("excel", "all")}
                    disabled={exportLoading === "excel-all"}
                    className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportLoading === "excel-all" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export as Excel
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Filtered Export Options */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Filtered Export Options
              </h2>
              <p className="text-gray-600 mb-6">
                Refine your export by applying specific criteria such as date
                ranges or particular meetings.
              </p>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Filtered Export Options
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Select specific criteria to export a subset of your
                  registration data.
                </p>

                {/* Filter Controls */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Start Date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="End Date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Meeting
                    </label>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="All Meetings">All Meetings</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => handleExport("csv", "filtered")}
                    disabled={exportLoading === "csv-filtered"}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportLoading === "csv-filtered" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exporting CSV...
                      </>
                    ) : (
                      <>
                        <Table className="w-4 h-4 mr-2" />
                        Export Filtered as CSV
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleExport("excel", "filtered")}
                    disabled={exportLoading === "excel-filtered"}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportLoading === "excel-filtered" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exporting Excel...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Export Filtered as Excel
                      </>
                    )}
                  </button>
                </div>

                {/* Active Filters Display */}
                {(startDate || endDate || selectedEvent !== "All Meetings") && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Active Filters:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {startDate && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          From: {startDate}
                        </span>
                      )}
                      {endDate && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          To: {endDate}
                        </span>
                      )}
                      {selectedEvent !== "All Meetings" && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Event:{" "}
                          {events.find((e) => e.id === selectedEvent)?.title ||
                            selectedEvent}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
