"use client";

import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  CheckCircle,
  Award,
  ThumbsUp,
  Home,
  Globe,
  Volume2,
  StopCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  params: Promise<{ interviewId: string }>;
};

type Language = {
  code: string;
  name: string;
  voices: SpeechSynthesisVoice[];
};

type TranslationItem = {
  original: string;
  translated: string;
  isTranslating: boolean;
  error: string;
};

const Feedback = ({ params }: Props) => {
  const { interviewId } = use(params);
  const [answers, setAnswers] = useState<any[]>([]);
  const router = useRouter();

  // Language and translation states
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [translatedContent, setTranslatedContent] = useState<{
    title: TranslationItem;
    subtitle: TranslationItem;
    overallRating: TranslationItem;
    reviewInstructions: TranslationItem;
  }>({
    title: {
      original: "Congratulations!",
      translated: "",
      isTranslating: false,
      error: "",
    },
    subtitle: {
      original: "You have successfully completed the interview.",
      translated: "",
      isTranslating: false,
      error: "",
    },
    overallRating: {
      original: "Overall Rating: Good",
      translated: "",
      isTranslating: false,
      error: "",
    },
    reviewInstructions: {
      original:
        "Review your answers, correct responses, and personalized feedback below.",
      translated: "",
      isTranslating: false,
      error: "",
    },
  });

  const [translatedAnswers, setTranslatedAnswers] = useState<{
    [answerId: string]: {
      question: TranslationItem;
      userAnswer: TranslationItem;
      correctAnswer: TranslationItem;
      feedback: TranslationItem;
    };
  }>({});

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

      // Support for more languages (extended list)
      const additionalLanguageCodes = [
        "hi",
        "ar",
        "bn",
        "ko",
        "fa",
        "vi",
        "tr",
        "th",
        "sw",
        "ur",
        "uk",
        "ta",
        "te",
        "ml",
        "mr",
        "kn",
        "id",
        "ms",
        "fil",
        "he",
        "el",
        "cs",
        "pl",
        "hu",
        "ro",
        "bg",
        "sr",
        "hr",
        "sk",
        "sl",
        "da",
        "fi",
        "no",
        "sv",
      ];

      // Add all browser voices
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

      // Ensure additional languages are always available, even if no voices are present
      additionalLanguageCodes.forEach((code) => {
        if (!languageMap.has(code)) {
          languageMap.set(code, {
            name:
              new Intl.DisplayNames(["en"], { type: "language" }).of(code) ||
              code,
            voices: [],
          });
        }
      });

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
      ko: "ko",
      nl: "nl",
      pl: "pl",
      tr: "tr",
      cs: "cs",
      uk: "uk",
      vi: "vi",
      sv: "sv",
      fa: "fa",
      id: "id",
    };
    return mapping[langCode] || langCode;
  };

  // Translate using LibreTranslate API
  const translateWithLibreTranslate = async (
    text: string,
    targetLang: string
  ): Promise<string> => {
    if (targetLang === "en" || !text) {
      return text;
    }

    const libreTranslateAPI = "https://libretranslate.de/translate";

    try {
      const response = await fetch(libreTranslateAPI, {
        method: "POST",
        body: JSON.stringify({
          q: text,
          source: "en",
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

  // Fallback translation with MyMemory API
  const translateWithFallbackAPI = async (
    text: string,
    targetLang: string
  ): Promise<string> => {
    if (targetLang === "en" || !text) {
      return text;
    }

    try {
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

  // Generic translate function with fallback
  const translateText = async (
    text: string,
    targetLang: string
  ): Promise<string> => {
    if (targetLang === "en" || !text) {
      return text;
    }

    try {
      return await translateWithLibreTranslate(text, targetLang);
    } catch (primaryError) {
      console.error("Primary translation failed:", primaryError);
      try {
        return await translateWithFallbackAPI(text, targetLang);
      } catch (fallbackError) {
        console.error("Fallback translation failed:", fallbackError);
        throw fallbackError;
      }
    }
  };

  // Translate UI elements when language changes
  useEffect(() => {
    const translateUIElements = async () => {
      if (selectedLanguage === "en") {
        setTranslatedContent({
          title: {
            original: "Congratulations!",
            translated: "Congratulations!",
            isTranslating: false,
            error: "",
          },
          subtitle: {
            original: "You have successfully completed the interview.",
            translated: "You have successfully completed the interview.",
            isTranslating: false,
            error: "",
          },
          overallRating: {
            original: "Overall Rating: Good",
            translated: "Overall Rating: Good",
            isTranslating: false,
            error: "",
          },
          reviewInstructions: {
            original:
              "Review your answers, correct responses, and personalized feedback below.",
            translated:
              "Review your answers, correct responses, and personalized feedback below.",
            isTranslating: false,
            error: "",
          },
        });
        return;
      }

      setTranslatedContent((prev) => ({
        title: { ...prev.title, isTranslating: true, error: "" },
        subtitle: { ...prev.subtitle, isTranslating: true, error: "" },
        overallRating: {
          ...prev.overallRating,
          isTranslating: true,
          error: "",
        },
        reviewInstructions: {
          ...prev.reviewInstructions,
          isTranslating: true,
          error: "",
        },
      }));

      try {
        const [titleText, subtitleText, ratingText, instructionsText] =
          await Promise.all([
            translateText("Congratulations!", selectedLanguage),
            translateText(
              "You have successfully completed the interview.",
              selectedLanguage
            ),
            translateText("Overall Rating: Good", selectedLanguage),
            translateText(
              "Review your answers, correct responses, and personalized feedback below.",
              selectedLanguage
            ),
          ]);

        setTranslatedContent({
          title: {
            original: "Congratulations!",
            translated: titleText,
            isTranslating: false,
            error: "",
          },
          subtitle: {
            original: "You have successfully completed the interview.",
            translated: subtitleText,
            isTranslating: false,
            error: "",
          },
          overallRating: {
            original: "Overall Rating: Good",
            translated: ratingText,
            isTranslating: false,
            error: "",
          },
          reviewInstructions: {
            original:
              "Review your answers, correct responses, and personalized feedback below.",
            translated: instructionsText,
            isTranslating: false,
            error: "",
          },
        });
      } catch (error) {
        console.error("Failed to translate UI elements:", error);
        setTranslatedContent((prev) => ({
          title: {
            ...prev.title,
            isTranslating: false,
            error: "Translation failed",
          },
          subtitle: {
            ...prev.subtitle,
            isTranslating: false,
            error: "Translation failed",
          },
          overallRating: {
            ...prev.overallRating,
            isTranslating: false,
            error: "Translation failed",
          },
          reviewInstructions: {
            ...prev.reviewInstructions,
            isTranslating: false,
            error: "Translation failed",
          },
        }));
      }
    };

    translateUIElements();
  }, [selectedLanguage]);

  // Translate answer content when language or answers change
  useEffect(() => {
    const translateAnswerContent = async () => {
      if (selectedLanguage === "en" || answers.length === 0) {
        return;
      }

      const translations: { [answerId: string]: any } = {};

      for (const answer of answers) {
        translations[answer.id] = {
          question: {
            original: answer.question,
            translated: "",
            isTranslating: true,
            error: "",
          },
          userAnswer: {
            original: answer.UserAns,
            translated: "",
            isTranslating: true,
            error: "",
          },
          correctAnswer: {
            original: answer.correctAnswer,
            translated: "",
            isTranslating: true,
            error: "",
          },
          feedback: {
            original: answer.feedback,
            translated: "",
            isTranslating: true,
            error: "",
          },
        };
      }

      setTranslatedAnswers(translations);

      for (const answer of answers) {
        try {
          const [
            translatedQuestion,
            translatedUserAns,
            translatedCorrectAnswer,
            translatedFeedback,
          ] = await Promise.all([
            translateText(answer.question, selectedLanguage),
            translateText(answer.UserAns, selectedLanguage),
            translateText(answer.correctAnswer, selectedLanguage),
            translateText(answer.feedback, selectedLanguage),
          ]);

          setTranslatedAnswers((prev) => ({
            ...prev,
            [answer.id]: {
              question: {
                original: answer.question,
                translated: translatedQuestion,
                isTranslating: false,
                error: "",
              },
              userAnswer: {
                original: answer.UserAns,
                translated: translatedUserAns,
                isTranslating: false,
                error: "",
              },
              correctAnswer: {
                original: answer.correctAnswer,
                translated: translatedCorrectAnswer,
                isTranslating: false,
                error: "",
              },
              feedback: {
                original: answer.feedback,
                translated: translatedFeedback,
                isTranslating: false,
                error: "",
              },
            },
          }));
        } catch (error) {
          console.error(`Failed to translate answer ID ${answer.id}:`, error);
          setTranslatedAnswers((prev) => ({
            ...prev,
            [answer.id]: {
              question: {
                original: answer.question,
                translated: "",
                isTranslating: false,
                error: "Translation failed",
              },
              userAnswer: {
                original: answer.UserAns,
                translated: "",
                isTranslating: false,
                error: "Translation failed",
              },
              correctAnswer: {
                original: answer.correctAnswer,
                translated: "",
                isTranslating: false,
                error: "Translation failed",
              },
              feedback: {
                original: answer.feedback,
                translated: "",
                isTranslating: false,
                error: "Translation failed",
              },
            },
          }));
        }
      }
    };

    if (answers.length > 0) {
      translateAnswerContent();
    }
  }, [selectedLanguage, answers]);

  // Text-to-speech functionality
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
      speech.lang = selectedLanguage;
      console.warn(
        `No voice found for ${selectedLanguage}. Using browser default with lang=${speech.lang}`
      );
    }

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

  // Function to toggle between original and translated text
  const getContentToDisplay = (item: TranslationItem) => {
    if (selectedLanguage === "en") return item.original;
    return item.isTranslating ? (
      <div className="flex items-center">
        <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        <span className="text-gray-400">Translating...</span>
      </div>
    ) : item.error ? (
      item.original
    ) : (
      item.translated || item.original
    );
  };

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        const result = await db
          .select()
          .from(UserAnswer)
          .where(eq(UserAnswer.mockIdRef, interviewId))
          .orderBy(UserAnswer.id);
        setAnswers(result);
      } catch (error) {
        console.error("Error fetching answers:", error);
      }
    };

    fetchAnswers();
  }, [interviewId]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Award className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-green-500 tracking-tight">
            {getContentToDisplay(translatedContent.title)}
          </h2>
          <p className="text-lg text-gray-600">
            {getContentToDisplay(translatedContent.subtitle)}
          </p>
        </div>

        {/* Language Selection Bar */}
        <div className="flex flex-wrap items-center gap-3 justify-center mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-primary" />
            <span className="text-sm font-medium">Language:</span>
          </div>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name} {lang.voices.length === 0 ? "🔇" : "🔊"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => stopSpeaking()}
              className="h-9"
            >
              <StopCircle size={16} className="mr-1" />
              <span className="text-xs md:text-sm">Stop TTS</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLanguage("en")}
              disabled={selectedLanguage === "en"}
              className="h-9"
            >
              <RefreshCw size={14} className="mr-1" />
              <span className="text-xs md:text-sm">English</span>
            </Button>
          </div>
        </div>

        <Card className="bg-white shadow-lg">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <ThumbsUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                {selectedLanguage === "en"
                  ? "Interview Performance"
                  : getContentToDisplay({
                      original: "Interview Performance",
                      translated: "",
                      isTranslating:
                        translatedContent.overallRating.isTranslating,
                      error: translatedContent.overallRating.error,
                    })}
              </h2>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 md:p-4">
              <h2 className="text-primary text-lg font-medium">
                {getContentToDisplay(translatedContent.overallRating)}
              </h2>
              {selectedLanguage !== "en" &&
                !translatedContent.overallRating.isTranslating && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 px-2 text-xs text-primary"
                    onClick={() =>
                      textToSpeech(translatedContent.overallRating.translated)
                    }
                  >
                    <Volume2 size={14} className="mr-1" />
                    Listen
                  </Button>
                )}
            </div>
            <p className="text-sm text-gray-500">
              {getContentToDisplay(translatedContent.reviewInstructions)}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {answers.map((answer, index) => {
            const translatedAnswer = translatedAnswers[answer.id];
            const isLoading = translatedAnswer?.question?.isTranslating;
            const hasError = translatedAnswer?.question?.error;

            return (
              <Collapsible key={answer.id}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full bg-white hover:bg-gray-50 shadow-sm border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 rounded-full p-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">
                        {selectedLanguage === "en" ? (
                          `Question ${index + 1}`
                        ) : isLoading ? (
                          <span className="flex items-center">
                            <div className="animate-spin mr-2 h-3 w-3 border-2 border-primary rounded-full border-t-transparent"></div>
                            <span>Question {index + 1}</span>
                          </span>
                        ) : (
                          `${getContentToDisplay({
                            original: "Question",
                            translated: "",
                            isTranslating: isLoading,
                            error: hasError,
                          })} ${index + 1}`
                        )}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4 md:p-6 space-y-4">
                      {/* Question with language tabs if translated */}
                      {selectedLanguage !== "en" && translatedAnswer ? (
                        <Tabs defaultValue="translated" className="w-full">
                          <TabsList className="mb-2">
                            <TabsTrigger value="translated">
                              {availableLanguages.find(
                                (l) => l.code === selectedLanguage
                              )?.name || selectedLanguage}
                            </TabsTrigger>
                            <TabsTrigger value="original">English</TabsTrigger>
                          </TabsList>
                          <TabsContent value="translated" className="mt-0">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                              {isLoading ? (
                                <div className="flex items-center">
                                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                  <span className="text-gray-400">
                                    Translating...
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {translatedAnswer.question.translated ||
                                    answer.question}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      textToSpeech(
                                        translatedAnswer.question.translated
                                      )
                                    }
                                    className="h-7 px-2"
                                  >
                                    <Volume2 size={14} />
                                  </Button>
                                </>
                              )}
                            </h3>
                          </TabsContent>
                          <TabsContent value="original" className="mt-0">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {answer.question}
                            </h3>
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <h3 className="text-lg font-semibold text-gray-800">
                          {answer.question}
                        </h3>
                      )}

                      <div className="space-y-3">
                        {/* User Answer Section */}
                        <div className="bg-red-50 rounded-lg p-3">
                          <span className="font-medium text-gray-700">
                            {selectedLanguage === "en"
                              ? "Your Answer: "
                              : `${getContentToDisplay({
                                  original: "Your Answer: ",
                                  translated: "",
                                  isTranslating: isLoading,
                                  error: hasError,
                                })}`}
                          </span>

                          {selectedLanguage !== "en" && translatedAnswer ? (
                            <Tabs
                              defaultValue="translated"
                              className="w-full mt-2"
                            >
                              <TabsList className="mb-2">
                                <TabsTrigger value="translated">
                                  {availableLanguages.find(
                                    (l) => l.code === selectedLanguage
                                  )?.name || selectedLanguage}
                                </TabsTrigger>
                                <TabsTrigger value="original">
                                  English
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="translated" className="mt-0">
                                <span className="text-red-600 flex items-center gap-2">
                                  {isLoading ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-red-500 rounded-full border-t-transparent"></div>
                                      <span className="text-gray-400">
                                        Translating...
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      {translatedAnswer.userAnswer.translated ||
                                        answer.UserAns}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          textToSpeech(
                                            translatedAnswer.userAnswer
                                              .translated
                                          )
                                        }
                                        className="h-7 px-2 text-red-600"
                                      >
                                        <Volume2 size={14} />
                                      </Button>
                                    </>
                                  )}
                                </span>
                              </TabsContent>
                              <TabsContent value="original" className="mt-0">
                                <span className="text-red-600">
                                  {answer.UserAns}
                                </span>
                              </TabsContent>
                            </Tabs>
                          ) : (
                            <span className="text-red-600">
                              {answer.UserAns}
                            </span>
                          )}
                        </div>

                        {/* Correct Answer Section */}
                        <div className="bg-green-50 rounded-lg p-3">
                          <span className="font-medium text-gray-700">
                            {selectedLanguage === "en"
                              ? "Correct Answer: "
                              : `${getContentToDisplay({
                                  original: "Correct Answer: ",
                                  translated: "",
                                  isTranslating: isLoading,
                                  error: hasError,
                                })}`}
                          </span>

                          {selectedLanguage !== "en" && translatedAnswer ? (
                            <Tabs
                              defaultValue="translated"
                              className="w-full mt-2"
                            >
                              <TabsList className="mb-2">
                                <TabsTrigger value="translated">
                                  {availableLanguages.find(
                                    (l) => l.code === selectedLanguage
                                  )?.name || selectedLanguage}
                                </TabsTrigger>
                                <TabsTrigger value="original">
                                  English
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="translated" className="mt-0">
                                <span className="text-green-600 flex items-center gap-2">
                                  {isLoading ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-green-500 rounded-full border-t-transparent"></div>
                                      <span className="text-gray-400">
                                        Translating...
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      {translatedAnswer.correctAnswer
                                        .translated || answer.correctAnswer}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          textToSpeech(
                                            translatedAnswer.correctAnswer
                                              .translated
                                          )
                                        }
                                        className="h-7 px-2 text-green-600"
                                      >
                                        <Volume2 size={14} />
                                      </Button>
                                    </>
                                  )}
                                </span>
                              </TabsContent>
                              <TabsContent value="original" className="mt-0">
                                <span className="text-green-600">
                                  {answer.correctAnswer}
                                </span>
                              </TabsContent>
                            </Tabs>
                          ) : (
                            <span className="text-green-600">
                              {answer.correctAnswer}
                            </span>
                          )}
                        </div>

                        {/* Feedback Section */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <span className="font-medium text-gray-700">
                            {selectedLanguage === "en"
                              ? "Feedback: "
                              : `${getContentToDisplay({
                                  original: "Feedback: ",
                                  translated: "",
                                  isTranslating: isLoading,
                                  error: hasError,
                                })}`}
                          </span>

                          {selectedLanguage !== "en" && translatedAnswer ? (
                            <Tabs
                              defaultValue="translated"
                              className="w-full mt-2"
                            >
                              <TabsList className="mb-2">
                                <TabsTrigger value="translated">
                                  {availableLanguages.find(
                                    (l) => l.code === selectedLanguage
                                  )?.name || selectedLanguage}
                                </TabsTrigger>
                                <TabsTrigger value="original">
                                  English
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="translated" className="mt-0">
                                <span className="text-blue-600 flex items-center gap-2">
                                  {isLoading ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                      <span className="text-gray-400">
                                        Translating...
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      {translatedAnswer.feedback.translated ||
                                        answer.feedback}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          textToSpeech(
                                            translatedAnswer.feedback.translated
                                          )
                                        }
                                        className="h-7 px-2 text-blue-600"
                                      >
                                        <Volume2 size={14} />
                                      </Button>
                                    </>
                                  )}
                                </span>
                              </TabsContent>
                              <TabsContent value="original" className="mt-0">
                                <span className="text-blue-600">
                                  {answer.feedback}
                                </span>
                              </TabsContent>
                            </Tabs>
                          ) : (
                            <span className="text-blue-600">
                              {answer.feedback}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-primary hover:bg-primary/90 flex items-center space-x-2 px-6 py-2"
          >
            <Home className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
