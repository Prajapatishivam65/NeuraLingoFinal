"use client";

import { db } from "@/utils/db";
import { MOCKInterview } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import { desc, eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Briefcase,
  CalendarDays,
  FileText,
  Loader2,
  PlayCircle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type InterviewData = {
  id: number;
  jsonMockResp: string;
  jobPosition: string;
  jobDescription: string;
  jobExperience: string;
  fileData: string | null;
  createdBy: string;
  createdAt: string;
  mockId: string;
};

const InterviewList = () => {
  const { user, isLoaded } = useUser();
  const [interviewList, setInterviewList] = useState<InterviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getInterviewList = async () => {
      if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) return;

      try {
        setIsLoading(true);
        const result = await db
          .select({
            id: MOCKInterview.id,
            jobPosition: MOCKInterview.jobPosition,
            jobDescription: MOCKInterview.jobDescription,
            jobExperience: MOCKInterview.jobExperience,
            createdAt: MOCKInterview.createdAt,
            mockId: MOCKInterview.mockId,
            jsonMockResp: MOCKInterview.jsonMockResp,
            fileData: MOCKInterview.fileData,
            createdBy: MOCKInterview.createdBy,
          })
          .from(MOCKInterview)
          .where(
            eq(MOCKInterview.createdBy, user.primaryEmailAddress.emailAddress)
          )
          .orderBy(desc(MOCKInterview.id));

        setInterviewList(result);
      } catch (err) {
        setError("Failed to fetch interview list. Please try again later.");
        console.error("Error fetching interviews:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getInterviewList();
  }, [user, isLoaded]);

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const handleStartInterview = (mockId: string) => {
    router.push(`/dashboard/interview/${mockId}`);
  };

  const handleViewFeedback = (mockId: string) => {
    router.push(`/dashboard/interview/${mockId}/feedback`);
  };

  const getExperienceColor = (experience: string) => {
    const level = experience.toLowerCase();
    if (level.includes("junior") || level.includes("entry"))
      return "text-green-600 bg-green-50";
    if (level.includes("senior")) return "text-purple-600 bg-purple-50";
    if (level.includes("lead") || level.includes("manager"))
      return "text-blue-600 bg-blue-50";
    return "text-gray-600 bg-gray-50";
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block p-4 rounded-lg bg-red-50 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : interviewList.length === 0 ? (
        <div className="text-center p-8">
          <div className="inline-block p-4 rounded-lg bg-gray-50 text-gray-600">
            No interviews found. Create your first one!
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {interviewList.map((interview) => (
            <Card
              key={interview.id}
              className="hover:shadow-md transition-all duration-200 border border-gray-200 bg-white/50 backdrop-blur-sm flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {interview.jobPosition}
                  </CardTitle>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${getExperienceColor(
                      interview.jobExperience
                    )}`}
                  >
                    {interview.jobExperience}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-grow">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {new Date(interview.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {truncateText(interview.jobDescription, 120)}
                    </p>
                  </div>
                  {interview.fileData && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <FileText className="h-4 w-4" />
                      <span>Resume Attached</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-gray-100">
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => handleStartInterview(interview.mockId)}
                    className="h-10 flex-1  text-white font-medium"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Start
                  </Button>
                  <Button
                    onClick={() => handleViewFeedback(interview.mockId)}
                    className="h-10 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium w-12.5"
                  >
                    feedback
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewList;
