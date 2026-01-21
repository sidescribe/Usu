import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, Volume2, Trophy, TrendingUp, Calendar, Trash2, BarChart3, Target, Sparkles, MessageSquare, Play, Pause } from 'lucide-react';

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentPitch, setCurrentPitch] = useState('');
  const [timer, setTimer] = useState(0);
  const [pitchHistory, setPitchHistory] = useState([]);
  const [selectedObjection, setSelectedObjection] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [lastScore, setLastScore] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRefs = useRef({});

  // ⭐⭐⭐ GROQ API KEY loaded from .env file ⭐⭐⭐
  // Get free key at: https://console.groq.com
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  const dentistObjections = [
    {
      id: 1,
      title: "HIPAA Compliance",
      objection: "How do I know this is HIPAA-compliant?",
      difficulty: "Hard"
    },
    {
      id: 2,
      title: "Patient Privacy Consent",
      objection: "Are you recording my patient without them knowing?",
      difficulty: "Hard"
    },
    {
      id: 3,
      title: "EHR Templates Exist",
      objection: "My EHR already has templates — why do I need this?",
      difficulty: "Medium"
    },
    {
      id: 4,
      title: "Dental Terminology Accuracy",
      objection: "How accurate is this with dental terminology and CDT codes?",
      difficulty: "Medium"
    },
    {
      id: 5,
      title: "AI Error Liability",
      objection: "What happens if the AI gets something wrong?",
      difficulty: "Hard"
    },
    {
      id: 6,
      title: "Always Listening Concern",
      objection: "Is this listening or recording all the time?",
      difficulty: "Easy"
    },
    {
      id: 7,
      title: "Dragon/Dictation Alternative",
      objection: "How is this different from Dragon or built-in dictation?",
      difficulty: "Medium"
    },
    {
      id: 8,
      title: "Internet Dependency",
      objection: "What happens if my internet goes down?",
      difficulty: "Medium"
    },
    {
      id: 9,
      title: "Staff Adoption Complexity",
      objection: "My staff won't use this — how complicated is it?",
      difficulty: "Easy"
    },
    {
      id: 10,
      title: "Company Longevity Risk",
      objection: "You're a small company — what happens to my data if you disappear?",
      difficulty: "Hard"
    },
    {
      id: 11,
      title: "Too Expensive",
      objection: "This sounds expensive. We already have our current documentation system and switching costs money.",
      difficulty: "Easy"
    },
    {
      id: 12,
      title: "Staff Training Time",
      objection: "My staff is already overwhelmed. How long will it take them to learn this new system?",
      difficulty: "Medium"
    },
    {
      id: 13,
      title: "Data Security General",
      objection: "How do I know my patient data will be secure? We've had issues with cloud systems before.",
      difficulty: "Hard"
    },
    {
      id: 14,
      title: "Current System Works",
      objection: "Our current system works fine. Why should I change something that isn't broken?",
      difficulty: "Easy"
    },
    {
      id: 15,
      title: "ROI Unclear",
      objection: "What's the actual return on investment? I need numbers, not promises.",
      difficulty: "Hard"
    },
    {
      id: 16,
      title: "Too Busy Now",
      objection: "I don't have time to implement a new system right now. Maybe in 6 months.",
      difficulty: "Medium"
    }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('pitchHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPitchHistory(parsed);
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (pitchHistory.length > 0) {
      const historyToSave = pitchHistory.map(p => ({
        ...p,
        audioURL: null
      }));
      localStorage.setItem('pitchHistory', JSON.stringify(historyToSave));
    }
  }, [pitchHistory]);

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  const getAIFeedback = async (pitch, objection, score) => {
    setIsLoadingFeedback(true);
    setAiFeedback('');

    try {
      console.log('🔑 API Key present:', !!GROQ_API_KEY);
      if (!GROQ_API_KEY) {
        throw new Error('Please add your Groq API key to the .env file as VITE_GROQ_API_KEY');
      }

      console.log('🤖 Calling Groq AI API...');
      console.log('Pitch:', pitch.substring(0, 100));
      console.log('Objection:', objection);
      console.log('API Key starts with:', GROQ_API_KEY.substring(0, 10) + '...');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a sales coach expert specializing in dental SaaS. Provide concise, actionable feedback in 3-4 sentences. Be specific about what the person said and how they can improve.'
            },
            {
              role: 'user',
              content: `Analyze this pitch for a voice-to-text dental documentation SaaS product.

Dentist's Objection: "${objection}"

Sales Pitch Given: "${pitch}"

Performance Scores: Clarity ${score.clarity}/100, Confidence ${score.confidence}/100, Conciseness ${score.conciseness}/100

Provide specific coaching feedback based on what was actually said:`
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      console.log('API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response Data:', data);

      const feedback = data.choices?.[0]?.message?.content?.trim();

      if (!feedback) {
        console.error('No feedback in response:', data);
        throw new Error('No feedback generated');
      }

      console.log('✅ AI Feedback received:', feedback);

      setAiFeedback(feedback);
      return feedback;

    } catch (error) {
      console.error('❌ AI Feedback Error:', error);
      console.log('Using fallback feedback instead');

      let errorMessage = ' [AI unavailable]';
      if (error.message.includes('API key')) {
        errorMessage = ' [API key missing]';
      } else if (error.message.includes('API Error')) {
        errorMessage = ' [API connection failed]';
      }

      const fallbackFeedback = generateFallbackFeedback(pitch, score);
      setAiFeedback(fallbackFeedback + errorMessage);
      return fallbackFeedback;
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const generateFallbackFeedback = (pitch, score) => {
    const feedback = [];

    if (score.clarity >= 75) {
      feedback.push("Strong clarity! Your pitch clearly communicated key benefits.");
    } else {
      feedback.push("Focus on mentioning specific benefits like time savings, accuracy improvements, or cost reduction.");
    }

    if (score.confidence >= 75) {
      feedback.push("Great pacing and delivery.");
    } else if (score.wpm < 100) {
      feedback.push("Try speaking a bit faster - aim for 120-150 words per minute.");
    } else if (score.wpm > 180) {
      feedback.push("Slow down slightly for better comprehension.");
    }

    if (score.conciseness < 70) {
      feedback.push("Aim to use the full 45-60 seconds to make a complete case.");
    }

    const hasBenefits = /\b(save|reduce|increase|improve|automate|faster|easier)\b/i.test(pitch);
    if (!hasBenefits) {
      feedback.push("Add specific quantifiable benefits (e.g., 'saves 2 hours daily').");
    }

    return feedback.join(' ');
  };

  const calculateScore = (pitch, duration) => {
    const wordCount = pitch.trim().split(/\s+/).length;
    const wpm = Math.round((wordCount / duration) * 60);

    let clarity = 0;
    if (pitch.length > 100) clarity += 25;
    if (pitch.length > 200) clarity += 25;
    if (/\b(save|reduce|increase|improve|automate)\b/i.test(pitch)) clarity += 25;
    if (/\b(dentist|dental|practice|patient|documentation)\b/i.test(pitch)) clarity += 25;

    let confidence = 0;
    if (pitch.length > 150) confidence += 30;
    if (wpm >= 120 && wpm <= 160) confidence += 40;
    else if (wpm >= 100 && wpm < 120) confidence += 20;
    if (!/\b(um|uh|like|you know)\b/i.test(pitch)) confidence += 30;

    let conciseness = 0;
    if (duration >= 45 && duration <= 60) conciseness += 50;
    else if (duration >= 30 && duration < 45) conciseness += 30;
    else if (duration < 30) conciseness += 20;
    if (wordCount >= 80 && wordCount <= 150) conciseness += 50;

    return {
      clarity: Math.min(clarity, 100),
      confidence: Math.min(confidence, 100),
      conciseness: Math.min(conciseness, 100),
      overall: Math.round((Math.min(clarity, 100) + Math.min(confidence, 100) + Math.min(conciseness, 100)) / 3),
      wordCount,
      wpm
    };
  };

  const startRecording = async () => {
    setIsRecording(true);
    setTimer(0);
    setCurrentPitch('');
    setShowResults(false);
    setAiFeedback('');
    setAudioURL(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (error) {
      console.error('Audio recording error:', error);
      setIsRecordingAudio(false);
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentPitch(transcript);
      };

      recognitionRef.current.start();
    }

    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev >= 60) {
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    console.log('🛑 Stopping recording...');
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      console.log('⏰ Timer cleared');
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      console.log('🎤 Speech recognition stopped');
    }

    const willHaveAudio = isRecordingAudio;

    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      console.log('🎵 Audio recording stopped');
    }

    const pitchText = currentPitch.trim() || 'Speech recognition not available. Audio recording captured.';
    const actualTimer = timer || 1;
    console.log('📝 Final pitch:', pitchText.substring(0, 100));
    console.log('⏱️ Duration:', actualTimer);

    const score = calculateScore(pitchText, actualTimer);
    setLastScore(score);

    setTimeout(() => {
      getAIFeedback(pitchText, selectedObjection?.objection || 'General practice', score).then(feedback => {
        const newPitch = {
          id: Date.now(),
          date: new Date().toISOString(),
          pitch: pitchText,
          duration: actualTimer,
          objection: selectedObjection?.title || 'General Practice',
          score: score,
          aiFeedback: feedback,
          audioURL: willHaveAudio ? audioURL : null
        };

        setPitchHistory(prev => {
          const updated = [newPitch, ...prev].slice(0, 20);
          return updated;
        });
        setShowResults(true);
        console.log('✅ Recording session complete');
      });
    }, 500);
  };

  const deletePitch = (id) => {
    const pitch = pitchHistory.find(p => p.id === id);
    if (pitch?.audioURL) {
      URL.revokeObjectURL(pitch.audioURL);
    }
    setPitchHistory(prev => prev.filter(p => p.id !== id));
  };

  const toggleAudioPlayback = (pitchId) => {
    const audio = audioRefs.current[pitchId];

    if (!audio) return;

    if (playingAudioId === pitchId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      Object.values(audioRefs.current).forEach(a => a.pause());
      audio.currentTime = 0;
      audio.play();
      setPlayingAudioId(pitchId);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const avgScore = pitchHistory.length > 0
    ? Math.round(pitchHistory.reduce((sum, p) => sum + p.score.overall, 0) / pitchHistory.length)
    : 0;

  const ScoreCircle = ({ score, label, color }) => (
    <div className="flex flex-col items-center">
      <div className={`w-20 h-20 rounded-full border-4 ${color} flex items-center justify-center`}>
        <span className="text-2xl font-bold">{score}</span>
      </div>
      <span className="text-sm text-gray-600 mt-2">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Target className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">Pitch Practice Mode</h1>
          </div>
          <p className="text-gray-600">Master your 60-second pitch with AI-powered feedback</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-8 h-8 text-yellow-500 mr-2" />
              <span className="text-3xl font-bold text-gray-800">{avgScore}</span>
            </div>
            <p className="text-gray-600">Average Score</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-8 h-8 text-blue-500 mr-2" />
              <span className="text-3xl font-bold text-gray-800">{pitchHistory.length}</span>
            </div>
            <p className="text-gray-600">Total Practices</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-8 h-8 text-green-500 mr-2" />
              <span className="text-3xl font-bold text-gray-800">
                {pitchHistory.length >= 2 ? (pitchHistory[0].score.overall - pitchHistory[1].score.overall > 0 ? '+' : '') : ''}
                {pitchHistory.length >= 2 ? (pitchHistory[0].score.overall - pitchHistory[1].score.overall) : '0'}
              </span>
            </div>
            <p className="text-gray-600">Latest Trend</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              <Volume2 className="w-6 h-6 mr-2 text-indigo-600" />
              Select an Objection
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dentistObjections.map(obj => (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjection(obj)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedObjection?.id === obj.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{obj.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      obj.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                      obj.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {obj.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 italic">"{obj.objection}"</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                <Mic className="w-6 h-6 mr-2 text-indigo-600" />
                Practice Your Pitch
              </h2>

              {selectedObjection && (
                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="font-semibold text-blue-900 mb-1">Current Objection:</p>
                  <p className="text-blue-800 italic">"{selectedObjection.objection}"</p>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-gray-800 mb-2">
                  {timer}s
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      timer >= 60 ? 'bg-red-500' : timer >= 45 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((timer / 60) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('🎯 Button clicked, isRecording:', isRecording);
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                  }}
                  disabled={!selectedObjection && !isRecording}
                  className={`w-full py-4 rounded-lg font-bold text-white text-lg flex items-center justify-center gap-2 transition-all ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700'
                      : selectedObjection
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <StopCircle className="w-6 h-6" />
                      Stop & Submit
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6" />
                      Start Recording
                    </>
                  )}
                </button>

                {isRecording && (
                  <p className="text-center text-sm text-gray-600">
                    Click "Stop & Submit" anytime to get your score and AI feedback
                  </p>
                )}
              </div>

              {currentPitch && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Live Transcription:</p>
                  <p className="text-gray-800">{currentPitch}</p>
                </div>
              )}

              {isRecording && !currentPitch && (
                <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Speech recognition not detected.</strong> You can still submit to get feedback based on timing.
                  </p>
                </div>
              )}
            </div>

            {showResults && lastScore && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-indigo-600" />
                  Your Score
                </h2>
                <div className="flex justify-around mb-4">
                  <ScoreCircle score={lastScore.clarity} label="Clarity" color="border-blue-500" />
                  <ScoreCircle score={lastScore.confidence} label="Confidence" color="border-green-500" />
                  <ScoreCircle score={lastScore.conciseness} label="Conciseness" color="border-purple-500" />
                </div>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-indigo-600 mb-2">{lastScore.overall}</div>
                  <p className="text-gray-600">Overall Score</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Word Count</p>
                    <p className="font-bold text-gray-800">{lastScore.wordCount} words</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Speaking Rate</p>
                    <p className="font-bold text-gray-800">{lastScore.wpm} WPM</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-purple-900">AI Coach Feedback</h3>
                  </div>
                  {isLoadingFeedback ? (
                    <div className="flex items-center gap-2 text-purple-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                      <span className="text-sm">Analyzing your pitch...</span>
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{aiFeedback}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-indigo-600" />
            Practice History
          </h2>
          {pitchHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No practice sessions yet. Start your first pitch above!</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pitchHistory.map(pitch => (
                <div key={pitch.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{pitch.objection}</p>
                      <p className="text-sm text-gray-500">{formatDate(pitch.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-indigo-600">{pitch.score.overall}</span>
                      <button
                        onClick={() => deletePitch(pitch.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {pitch.audioURL && (
                    <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleAudioPlayback(pitch.id)}
                          className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors"
                        >
                          {playingAudioId === pitch.id ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-indigo-900">Audio Recording</p>
                          <p className="text-xs text-indigo-600">Click to play your pitch</p>
                        </div>
                        <span className="text-sm font-mono text-indigo-700">{pitch.duration}s</span>
                      </div>
                      <audio
                        ref={(el) => {
                          if (el) audioRefs.current[pitch.id] = el;
                        }}
                        src={pitch.audioURL}
                        onEnded={() => setPlayingAudioId(null)}
                        className="hidden"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-blue-50 p-2 rounded text-center">
                      <p className="text-blue-600">Clarity</p>
                      <p className="font-bold text-blue-800">{pitch.score.clarity}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <p className="text-green-600">Confidence</p>
                      <p className="font-bold text-green-800">{pitch.score.confidence}</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded text-center">
                      <p className="text-purple-600">Conciseness</p>
                      <p className="font-bold text-purple-800">{pitch.score.conciseness}</p>
                    </div>
                  </div>

                  {pitch.aiFeedback && (
                    <div className="mb-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-900">AI Feedback:</span>
                      </div>
                      <p className="text-sm text-purple-800">{pitch.aiFeedback}</p>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{pitch.pitch}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{pitch.duration}s</span>
                    <span>{pitch.score.wordCount} words</span>
                    <span>{pitch.score.wpm} WPM</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="text-center text-gray-600 text-sm mt-8 pb-8">
          <p>Practice daily to master your pitch • AI-powered coaching for dental SaaS success</p>
        </footer>
      </div>
    </div>
  );
};

export default App;