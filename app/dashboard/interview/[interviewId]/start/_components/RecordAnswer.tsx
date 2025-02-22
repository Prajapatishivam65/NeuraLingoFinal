"use client";

import { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import {
  Mic,
  StopCircle,
  Camera,
  CameraOff,
  Trash2,
  CircleCheckBig,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db } from "@/utils/db";
import { useUser } from "@clerk/nextjs";
import moment from "moment";
import { UserAnswer } from "@/utils/schema";
import { and, eq } from "drizzle-orm";

type InterviewQuestion = {
  Question: string;
  Answer: string;
};

type Props = {
  mockInterviewQuestions: InterviewQuestion[];
  activeQuestionIndex: number;
  interviewData: {
    id: number;
    jsonMockResp: string;
    jobPosition: string;
    jobDescription: string;
    jobExperience: string;
    fileData: string;
    createdBy: string;
    createdAt: string;
    mockId: string;
  };
};

type Feedback = {
  rating: number;
  feedback: string;
};

const ASSEMBLY_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;

const RecordAnswer = ({
  mockInterviewQuestions,
  activeQuestionIndex,
  interviewData,
}: Props) => {
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [originalTranscript, setOriginalTranscript] = useState(""); // Store original language transcript
  const [englishTranscript, setEnglishTranscript] = useState(""); // Always store English version
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [existingAnswer, setExistingAnswer] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { user } = useUser();

  const languages = [
    { code: "en", label: "English" },
    { code: "fr", label: "French" },
    { code: "hi", label: "Hindi" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
  ];

  useEffect(() => {
    const fetchExistingAnswer = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;

      try {
        const existingAnswers = await db
          .select()
          .from(UserAnswer)
          .where(
            and(
              eq(UserAnswer.mockIdRef, interviewData.mockId),
              eq(
                UserAnswer.question,
                mockInterviewQuestions[activeQuestionIndex].Question
              ),
              eq(UserAnswer.userEmail, user.primaryEmailAddress.emailAddress)
            )
          );

        if (existingAnswers.length > 0) {
          const answer = existingAnswers[0];
          setExistingAnswer(answer);
          setEnglishTranscript(answer.UserAns);
          setFeedback({
            rating: parseInt(answer.rating),
            feedback: answer.feedback,
          });
        } else {
          resetAnswerState();
        }
      } catch (error) {
        console.error("Error fetching existing answer:", error);
        toast({
          title: "Error",
          description: "Failed to fetch existing answer",
          variant: "destructive",
        });
      }
    };

    fetchExistingAnswer();
  }, [
    activeQuestionIndex,
    user?.primaryEmailAddress?.emailAddress,
    interviewData.mockId,
    mockInterviewQuestions,
  ]);

  const resetAnswerState = () => {
    setExistingAnswer(null);
    setOriginalTranscript("");
    setEnglishTranscript("");
    setFeedback(null);
    setAudioBlob(null);
  };

  const toggleWebcam = () => setIsWebcamEnabled((prev) => !prev);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Unable to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processTranscription = async (
    audioBlob: Blob,
    sourceLanguage: string
  ) => {
    if (!ASSEMBLY_API_KEY) {
      throw new Error("AssemblyAI API key is missing");
    }

    // Upload audio file
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { Authorization: ASSEMBLY_API_KEY },
      body: audioBlob,
    });
    const { upload_url } = await uploadResponse.json();

    // Request transcription
    const transcriptResponse = await fetch(
      "https://api.assemblyai.com/v2/transcript",
      {
        method: "POST",
        headers: {
          Authorization: ASSEMBLY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: upload_url,
          language_code: sourceLanguage,
        }),
      }
    );

    if (!transcriptResponse.ok) {
      throw new Error("Transcription request failed");
    }

    const { id: transcriptId } = await transcriptResponse.json();

    // Poll for completion
    while (true) {
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { Authorization: ASSEMBLY_API_KEY } }
      );
      const result = await pollingResponse.json();

      if (result.status === "completed") {
        return result.text;
      } else if (result.status === "error") {
        throw new Error("Transcription failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  };

  const translateToEnglish = async (text: string, sourceLanguage: string) => {
    if (sourceLanguage === "en") return text;

    const response = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: "en",
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error("Translation failed");
    }

    const { translatedText } = await response.json();
    return translatedText;
  };

  const handleSaveAnswer = async () => {
    if (!audioBlob) {
      toast({
        title: "Error",
        description: "No audio recorded",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get transcript in original language
      const transcript = await processTranscription(
        audioBlob,
        selectedLanguage
      );
      setOriginalTranscript(transcript);

      // Get English version
      const englishText = await translateToEnglish(
        transcript,
        selectedLanguage
      );
      setEnglishTranscript(englishText);

      // Generate feedback
      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: mockInterviewQuestions[activeQuestionIndex].Question,
          answer: englishText,
        }),
      });

      if (!feedbackResponse.ok) {
        throw new Error("Failed to generate feedback");
      }

      const { feedback: feedbackData } = await feedbackResponse.json();

      // Save to database
      const answerData = {
        mockIdRef: interviewData.mockId,
        question: mockInterviewQuestions[activeQuestionIndex].Question,
        correctAnswer: mockInterviewQuestions[activeQuestionIndex].Answer,
        UserAns: englishText, // Store only English version
        feedback: feedbackData.feedback,
        rating: feedbackData.rating.toString(),
        userEmail: user?.primaryEmailAddress?.emailAddress || "",
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
      };

      if (existingAnswer) {
        await db
          .update(UserAnswer)
          .set(answerData)
          .where(
            and(
              eq(UserAnswer.mockIdRef, interviewData.mockId),
              eq(
                UserAnswer.question,
                mockInterviewQuestions[activeQuestionIndex].Question
              ),
              eq(
                UserAnswer.userEmail,
                user?.primaryEmailAddress?.emailAddress || ""
              )
            )
          );
      } else {
        await db.insert(UserAnswer).values(answerData);
      }

      setFeedback({
        rating: feedbackData.rating,
        feedback: feedbackData.feedback,
      });

      toast({
        title: "Success",
        description: existingAnswer ? "Answer updated" : "Answer saved",
      });
    } catch (error) {
      console.error("Error processing answer:", error);
      toast({
        title: "Error",
        description: "Failed to process and save answer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full p-4">
      <div className="w-full mb-2 relative">
        {isWebcamEnabled ? (
          <Webcam
            ref={webcamRef}
            mirrored={true}
            className="w-full h-64 object-cover rounded-lg shadow-md"
          />
        ) : (
          <div className="w-full h-64 bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
            <Camera size={48} className="text-gray-400" />
          </div>
        )}
        <Button
          variant="outline"
          className="absolute top-2 right-2"
          onClick={toggleWebcam}
        >
          {isWebcamEnabled ? (
            <>
              <CameraOff size={20} className="mr-2" /> Disable Camera
            </>
          ) : (
            <>
              <Camera size={20} className="mr-2" /> Enable Camera
            </>
          )}
        </Button>
      </div>

      <div className="w-full mb-4">
        <label
          htmlFor="language-select"
          className="block text-sm font-medium mb-1"
        >
          Recording Language:
        </label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full p-2 border rounded-md"
          disabled={isRecording}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full space-y-4">
        <div className="flex gap-4">
          <Button
            variant={isRecording ? "destructive" : "default"}
            className="flex-1"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            {isRecording ? (
              <>
                <StopCircle size={20} className="mr-2" /> Stop
              </>
            ) : (
              <>
                <Mic size={20} className="mr-2" /> Record
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={resetAnswerState}
            disabled={isLoading || (!audioBlob && !englishTranscript)}
          >
            <Trash2 size={20} className="mr-2" /> Clear
          </Button>
        </div>

        {audioBlob && (
          <div className="mt-4">
            <audio
              controls
              src={URL.createObjectURL(audioBlob)}
              className="w-full"
            />
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSaveAnswer}
          disabled={isLoading || !audioBlob}
        >
          <CircleCheckBig size={20} className="mr-2" />
          {isLoading
            ? "Processing..."
            : existingAnswer
              ? "Update Answer"
              : "Save Answer"}
        </Button>

        {(originalTranscript || englishTranscript) && (
          <div className="mt-4 w-full rounded-md border p-4 bg-white space-y-4">
            {selectedLanguage !== "en" && originalTranscript && (
              <div>
                <h3 className="text-lg font-semibold">
                  Original Transcript (
                  {languages.find((l) => l.code === selectedLanguage)?.label}):
                </h3>
                <p className="mt-2">{originalTranscript}</p>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">English Transcript:</h3>
              <p className="mt-2">{englishTranscript}</p>
            </div>
          </div>
        )}

        {feedback && (
          <div className="mt-4 w-full rounded-md border p-4 bg-white">
            <h3 className="text-lg font-semibold mb-2">Feedback</h3>
            <p className="mb-2">
              <strong>Rating:</strong> {feedback.rating}/10
            </p>
            <p>
              <strong>Comments:</strong> {feedback.feedback}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordAnswer;
