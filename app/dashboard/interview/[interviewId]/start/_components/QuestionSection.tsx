import React, { useState, useEffect, useRef } from "react";
import { Lightbulb, Volume2, Globe, StopCircle, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InterviewQuestion = {
  Question: string;
  Answer: string;
};

type Props = {
  mockInterviewQuestions: InterviewQuestion[];
  activeQuestionIndex: number;
};

type Language = {
  code: string;
  name: string;
  voices: SpeechSynthesisVoice[];
};

const QuestionSection = ({
  mockInterviewQuestions,
  activeQuestionIndex,
}: Props) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [translatedQuestion, setTranslatedQuestion] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string>("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentQuestion = mockInterviewQuestions[activeQuestionIndex];

  // Load available voices and map them to languages
  useEffect(() => {
    const loadVoices = () => {
      const voiceList = window.speechSynthesis.getVoices();
      if (voiceList.length === 0) {
        console.warn("No voices loaded yet. Waiting for voiceschanged event.");
        return;
      }

      const languageMap = new Map<
        string,
        { name: string; voices: SpeechSynthesisVoice[] }
      >();

      voiceList.forEach((voice) => {
        const langCode = voice.lang.split("-")[0].toLowerCase();
        const currentLang = languageMap.get(langCode) || {
          name:
            new Intl.DisplayNames(["en"], { type: "language" }).of(langCode) ||
            langCode,
          voices: [],
        };
        currentLang.voices.push(voice);
        languageMap.set(langCode, currentLang);
      });

      // Ensure Hindi is always available, even if no voices are present initially
      if (!languageMap.has("hi")) {
        languageMap.set("hi", { name: "Hindi", voices: [] });
      }

      const languages: Language[] = Array.from(languageMap.entries())
        .map(([code, { name, voices }]) => ({
          code,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          voices,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAvailableLanguages(languages);
    };

    // Load voices immediately and on change
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // LibreTranslate language code mapping
  const getLibreTranslateCode = (langCode: string): string => {
    const mapping: Record<string, string> = {
      en: "en",
      es: "es",
      fr: "fr",
      de: "de",
      it: "it",
      pt: "pt",
      ru: "ru",
      zh: "zh",
      ja: "ja",
      hi: "hi",
      ar: "ar",
      // Add more mappings as needed
    };
    return mapping[langCode] || langCode;
  };

  // Translate using LibreTranslate API
  const translateWithLibreTranslate = async (
    text: string,
    targetLang: string
  ): Promise<string> => {
    // If target language is English, return original text
    if (targetLang === "en") {
      return text;
    }

    const libreTranslateAPI = "https://libretranslate.de/translate";

    try {
      const response = await fetch(libreTranslateAPI, {
        method: "POST",
        body: JSON.stringify({
          q: text,
          source: "en", // Assuming original text is in English
          target: getLibreTranslateCode(targetLang),
          format: "text",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API error: ${errorText}`);
      }

      const data = await response.json();
      return data.translatedText;
    } catch (error) {
      console.error("Translation error:", error);
      throw error;
    }
  };

  // Fallback translation with Microsoft API (no API key required for small texts)
  const translateWithFallbackAPI = async (
    text: string,
    targetLang: string
  ): Promise<string> => {
    try {
      // Simple translation using mymemory API as fallback (free, no API key)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=en|${targetLang}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Fallback API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.responseData.translatedText || text;
    } catch (error) {
      console.error("Fallback translation error:", error);
      throw error;
    }
  };

  // Translate question when language or question changes
  useEffect(() => {
    if (!currentQuestion) return;

    // If English is selected, no translation needed
    if (selectedLanguage === "en") {
      setTranslatedQuestion(currentQuestion.Question);
      setTranslationError("");
      return;
    }

    const translateQuestion = async () => {
      setIsTranslating(true);
      setTranslationError("");

      try {
        // Try primary translation service
        const translatedText = await translateWithLibreTranslate(
          currentQuestion.Question,
          selectedLanguage
        );
        setTranslatedQuestion(translatedText);
      } catch (primaryError) {
        console.error("Primary translation failed:", primaryError);

        // Try fallback translation service
        try {
          const fallbackText = await translateWithFallbackAPI(
            currentQuestion.Question,
            selectedLanguage
          );
          setTranslatedQuestion(fallbackText);
        } catch (fallbackError) {
          console.error("Fallback translation failed:", fallbackError);
          setTranslationError(
            "Translation service temporarily unavailable. Using original text."
          );
          setTranslatedQuestion(currentQuestion.Question);
        }
      } finally {
        setIsTranslating(false);
      }
    };

    translateQuestion();
  }, [currentQuestion, selectedLanguage]);

  const getBestVoice = (langCode: string): SpeechSynthesisVoice | null => {
    const language = availableLanguages.find((lang) => lang.code === langCode);
    if (!language) {
      console.warn(`Language ${langCode} not found in available languages.`);
      return null;
    }

    if (!language.voices || language.voices.length === 0) {
      console.warn(
        `No voices available for ${langCode}. Falling back to default voice.`
      );
      const defaultVoice = window.speechSynthesis
        .getVoices()
        .find((v) => v.default);
      return defaultVoice || null;
    }

    // Prefer voices with exact language match or regional variants
    const exactMatch =
      language.voices.find((v) => v.lang.toLowerCase() === `${langCode}-in`) ||
      language.voices.find((v) =>
        v.lang.toLowerCase().startsWith(`${langCode}-`)
      ) ||
      language.voices[0];

    console.log(
      `Selected voice for ${langCode}: ${exactMatch.name} (${exactMatch.lang})`
    );
    return exactMatch;
  };

  const textToSpeech = (text: string) => {
    if (!window.speechSynthesis) {
      alert("Your browser does not support speech synthesis.");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    const voice = getBestVoice(selectedLanguage);

    if (voice) {
      speech.voice = voice;
      speech.lang = voice.lang;
    } else {
      speech.lang = selectedLanguage === "hi" ? "hi-IN" : selectedLanguage;
      console.warn(
        `No voice found for ${selectedLanguage}. Using browser default with lang=${speech.lang}`
      );
    }

    // Fine-tune speech parameters
    speech.pitch = 1.0;
    speech.rate = 0.9;
    speech.volume = 1.0;

    speech.onstart = () =>
      console.log(
        `Speaking in ${speech.lang} with voice: ${speech.voice?.name || "default"}`
      );
    speech.onerror = (event) =>
      console.error("Speech synthesis error:", event.error);

    window.speechSynthesis.speak(speech);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
  };

  const handleRecordAnswer = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in your browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    const voice = getBestVoice(selectedLanguage);
    if (recognition) {
      recognition.lang = voice
        ? voice.lang
        : selectedLanguage === "hi"
          ? "hi-IN"
          : selectedLanguage;

      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onaudiostart = () => setIsSpeechDetected(true);
      recognition.onaudioend = () => setIsSpeechDetected(false);
      recognition.onresult = (event) =>
        setUserAnswer(event.results[0][0].transcript);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  if (!currentQuestion) {
    return <div className="p-6 border-r h-full">No question available</div>;
  }

  return (
    <div className="p-6 border-r h-full">
      <div className="flex flex-wrap gap-3 mb-6">
        {mockInterviewQuestions.map((_, index) => (
          <div
            key={index}
            className={`p-2 rounded-full text-xs md:text-sm text-center w-10 h-10 flex items-center justify-center ${
              activeQuestionIndex === index
                ? "bg-primary text-white"
                : "bg-secondary text-primary"
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>
      <h2 className="text-xl md:text-2xl font-semibold mb-6">
        Question {activeQuestionIndex + 1}:
      </h2>

      {/* Display language indicator for non-English languages */}
      {selectedLanguage !== "en" && (
        <div className="text-sm font-medium text-blue-600 mb-2">
          {availableLanguages.find((l) => l.code === selectedLanguage)?.name ||
            selectedLanguage}
        </div>
      )}

      {/* Show loading state while translating */}
      {isTranslating ? (
        <div className="text-lg mb-4 flex items-center text-gray-400">
          <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          Translating question...
        </div>
      ) : (
        <p className="text-lg mb-4">{translatedQuestion}</p>
      )}

      {/* Show translation error if any */}
      {translationError && (
        <div className="text-sm text-amber-600 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="inline-block mr-1"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          {translationError}
        </div>
      )}

      {/* Original question shown if not in English */}
      {selectedLanguage !== "en" && (
        <div className="text-sm text-gray-500 mb-4">
          <span className="font-medium">Original: </span>
          {currentQuestion.Question}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center mb-6">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-40">
            <Globe size={16} className="mr-2" />
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name} {lang.voices.length === 0 ? "(No voice)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => textToSpeech(translatedQuestion)}
          disabled={isTranslating}
        >
          <Volume2 size={16} className="mr-2" />
          Read Question
        </Button>

        <Button variant="outline" size="sm" onClick={stopSpeaking}>
          <StopCircle size={16} className="mr-2" />
          Stop Reading
        </Button>
      </div>

      {isRecording && (
        <div className="mb-4 bg-zinc-100 p-3 rounded-lg border border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`block rounded-full w-3 h-3 ${isRecording ? "bg-red-500" : "bg-red-200"}`}
            ></span>
            <span className="text-sm font-medium">Recording in progress</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`block rounded w-full h-2 ${isSpeechDetected ? "bg-green-500" : "bg-green-200"}`}
            ></span>
          </div>
        </div>
      )}

      {userAnswer && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-2">Your Answer:</h3>
          <p className="text-blue-700">{userAnswer}</p>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <Button
          className={`flex items-center gap-2 ${isRecording ? "bg-red-600 hover:bg-red-700" : ""}`}
          onClick={handleRecordAnswer}
        >
          <Mic size={16} />
          {isRecording ? "Stop Recording" : "Record Answer"}
        </Button>

        {userAnswer && (
          <Button variant="outline" onClick={() => textToSpeech(userAnswer)}>
            <Volume2 size={16} className="mr-2" />
            Play Back Answer
          </Button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
          <Lightbulb size={20} />
          Note:
        </h3>
        <p className="text-sm text-blue-600">
          Click on Record Answer when you want to answer the question. At the
          end of interview we will give you the feedback along with correct
          answer for each question and your answer to compare it.
        </p>
      </div>
    </div>
  );
};

export default QuestionSection;
