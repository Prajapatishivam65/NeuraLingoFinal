"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import {
  Activity,
  Code,
  Users,
  Clock,
  Target,
  Award,
  Loader2,
} from "lucide-react";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewList from "./_components/InterviewList";

import { db } from "@/utils/db";
import { MOCKInterview } from "@/utils/schema";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

const Dashboard = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${inter.className}`}
    >
      {/* Header Section */}
      <header className="bg-white border-b border-gray-200 backdrop-blur-sm bg-white/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-8 h-8 text-blue-600" />
                Interview Prep Hub
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Master both behavioral and technical interviews
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-2 rounded-lg">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Main Content - Full Width Section */}
        <div className="w-full">
          {/* Mock Interviews Section */}
          <section className="bg-white rounded-xl shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                    <Users className="w-7 h-7 text-blue-600" />
                    Mock Interviews
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Master behavioral interviews through practice and feedback
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
              </div>
              <div className="space-y-8">
                <AddNewInterview />
                <div className="bg-gray-50 rounded-xl p-6">
                  <InterviewList />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
