import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, Volume2, Trophy, TrendingUp, Calendar, Trash2, BarChart3, Target, Sparkles, MessageSquare, Play, Pause, Award } from 'lucide-react';

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
  const [audioBlob, setAudioBlob] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRefs = useRef({});

  // Gamification state
  const [userStats, setUserStats] = useState(() => {
    const saved = localStorage.getItem('userStats');
    return saved ? JSON.parse(saved) : {
      points: 0,
      streak: 0,
      lastPracticeDate: null,
      badges: [],
      totalPractices: 0,
      bestScore: 0
    };
  });
  const [showAchievement, setShowAchievement] = useState(null);
  const [contextualHelp, setContextualHelp] = useState('');
  const [conversationStep, setConversationStep] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);

  // Custom objections state
  const [customObjections, setCustomObjections] = useState(() => {
    const saved = localStorage.getItem('customObjections');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCustomObjectionModal, setShowCustomObjectionModal] = useState(false);
  const [newObjectionTitle, setNewObjectionTitle] = useState('');
  const [newObjectionText, setNewObjectionText] = useState('');
  const [newObjectionDifficulty, setNewObjectionDifficulty] = useState('Medium');

  // ⭐⭐⭐ AI API KEYS loaded from .env file ⭐⭐⭐
  // Get a free OpenAI key at: https://platform.openai.com/account/api-keys
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  // Legacy Groq fallback (if needed)
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  const dentistObjections = [
    {
      id: 1,
      title: "HIPAA Compliance",
      objection: "How do I know this is HIPAA-compliant?",
      difficulty: "Hard",
      followUps: [
        "What about patient data security?",
        "How do you handle data breaches?",
        "Can you show me your SOC 2 certification?"
      ]
    },
    {
      id: 2,
      title: "Patient Privacy Consent",
      objection: "Are you recording my patient without them knowing?",
      difficulty: "Hard",
      followUps: [
        "What if the patient objects to being recorded?",
        "How long do you store the recordings?",
        "Can patients request deletion of their data?"
      ]
    },
    {
      id: 3,
      title: "EHR Templates Exist",
      objection: "My EHR already has templates — why do I need this?",
      difficulty: "Medium",
      followUps: [
        "How much faster is your AI compared to templates?",
        "Can it integrate with my existing EHR system?",
        "What if my EHR templates change?"
      ]
    },
    {
      id: 4,
      title: "Dental Terminology Accuracy",
      objection: "How accurate is this with dental terminology and CDT codes?",
      difficulty: "Medium",
      followUps: [
        "How do you stay updated with new CDT codes?",
        "What happens if it misidentifies a procedure?",
        "Can it handle specialty procedures?"
      ]
    },
    {
      id: 5,
      title: "AI Error Liability",
      objection: "What happens if the AI gets something wrong?",
      difficulty: "Hard",
      followUps: [
        "Who is responsible for AI errors in patient records?",
        "How do you validate AI accuracy?",
        "What's your error correction process?"
      ]
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

  // Helper function to convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, mimeType) => {
    try {
      const byteCharacters = atob(base64.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (e) {
      console.error('Error converting base64 to blob:', e);
      return null;
    }
  };

  // Load pitch history from localStorage (convert base64 back to blobs)
  useEffect(() => {
    const saved = localStorage.getItem('pitchHistory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert base64 audio back to blobs
        const historyWithBlobs = parsed.map(p => {
          if (p.audioBase64) {
            const blob = base64ToBlob(p.audioBase64, 'audio/webm');
            return {
              ...p,
              audioBlob: blob,
              audioURL: blob ? URL.createObjectURL(blob) : null
            };
          }
          return p;
        });
        setPitchHistory(historyWithBlobs);
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  // Save pitch history to localStorage (convert blobs to base64)
  useEffect(() => {
    const saveHistory = async () => {
      if (pitchHistory.length > 0) {
        const historyToSave = await Promise.all(
          pitchHistory.map(async (p) => {
            let audioBase64 = p.audioBase64 || null;
            // Only convert if we have a new blob without base64
            if (p.audioBlob && !p.audioBase64) {
              try {
                audioBase64 = await blobToBase64(p.audioBlob);
              } catch (e) {
                console.error('Error converting audio to base64:', e);
              }
            }
            return {
              ...p,
              audioBase64: audioBase64,
              audioBlob: undefined,
              audioURL: undefined
            };
          })
        );
        localStorage.setItem('pitchHistory', JSON.stringify(historyToSave));
      }
    };
    saveHistory();
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
      const activeKey = OPENAI_API_KEY || GROQ_API_KEY;
      const usingOpenAI = !!OPENAI_API_KEY;

      console.log('🔑 API Key present:', !!activeKey);
      if (!activeKey) {
        throw new Error('Please add your Groq or OpenAI API key to the .env file (VITE_OPENAI_API_KEY or VITE_GROQ_API_KEY)');
      }

      const providerName = usingOpenAI ? 'OpenAI' : 'Groq';
      const endpoint = usingOpenAI
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';
      const model = usingOpenAI ? 'gpt-4o-mini' : 'llama-3.1-8b-instant';

      console.log(`🤖 Calling ${providerName} API...`);
      console.log('Pitch:', pitch.substring(0, 100));
      console.log('Objection:', objection);
      console.log('API Key starts with:', activeKey.substring(0, 10) + '...');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
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

  const generateContextualHelp = (objectionTitle, userResponse = '') => {
    const help = {
      "HIPAA Compliance": "Focus on security certifications, encryption, and compliance frameworks. Mention SOC 2, HIPAA compliance, and data protection measures.",
      "Patient Privacy Consent": "Emphasize patient consent, data control, and privacy-by-design principles. Highlight that patients maintain full control.",
      "EHR Templates Exist": "Compare speed, accuracy, and integration benefits. Show how AI goes beyond templates with contextual understanding.",
      "Dental Terminology Accuracy": "Mention specialized training on CDT codes, dental terminology, and continuous learning from real dental conversations.",
      "AI Error Liability": "Address error handling, human oversight, and continuous improvement. Position AI as an assistant, not replacement.",
      "Always Listening Concern": "Explain voice activation, manual controls, and privacy safeguards. Clarify the difference between always-on and triggered recording.",
      "Dragon/Dictation Alternative": "Highlight AI's contextual understanding, integration capabilities, and specialized dental knowledge over generic dictation.",
      "Internet Dependency": "Discuss offline capabilities, local processing options, and robust cloud infrastructure with redundancy.",
      "Staff Adoption Complexity": "Emphasize intuitive design, minimal training requirements, and gradual adoption strategies.",
      "Company Longevity Risk": "Share company stability, funding status, data portability, and long-term commitment to customers.",
      "Too Expensive": "Focus on ROI calculations, time savings, error reduction, and productivity improvements that justify the investment.",
      "Staff Training Time": "Highlight quick onboarding, intuitive interface, and ongoing support to minimize training requirements.",
      "Data Security General": "Emphasize encryption, access controls, regular audits, and compliance with industry security standards.",
      "Current System Works": "Show specific limitations of current workflows and how AI addresses pain points they may not have recognized.",
      "ROI Unclear": "Provide specific metrics, case studies, and ROI calculators showing quantifiable benefits and payback periods.",
      "Too Busy Now": "Offer phased implementation, quick wins, and flexible deployment options that fit their timeline."
    };

    return help[objectionTitle] || "Focus on benefits, address concerns directly, and provide specific examples or data to support your points.";
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

  const updateUserStats = (score) => {
    setUserStats(prev => {
      const today = new Date().toDateString();
      const isNewDay = prev.lastPracticeDate !== today;
      const newStreak = isNewDay ? prev.streak + 1 : prev.streak;
      const pointsEarned = Math.round(score.overall / 10); // 0-10 points based on score

      let newBadges = [...prev.badges];
      let achievement = null;

      // Check for achievements
      if (score.overall >= 90 && !prev.badges.includes('High Scorer')) {
        newBadges.push('High Scorer');
        achievement = { title: 'High Scorer', description: 'Scored 90% or higher!' };
      }
      if (newStreak >= 7 && !prev.badges.includes('Week Warrior')) {
        newBadges.push('Week Warrior');
        achievement = { title: 'Week Warrior', description: '7-day practice streak!' };
      }
      if (prev.totalPractices + 1 >= 10 && !prev.badges.includes('Dedicated Learner')) {
        newBadges.push('Dedicated Learner');
        achievement = { title: 'Dedicated Learner', description: 'Completed 10 practice sessions!' };
      }

      const updatedStats = {
        ...prev,
        points: prev.points + pointsEarned,
        streak: isNewDay ? 1 : newStreak,
        lastPracticeDate: today,
        badges: newBadges,
        totalPractices: prev.totalPractices + 1,
        bestScore: Math.max(prev.bestScore, score.overall)
      };

      localStorage.setItem('userStats', JSON.stringify(updatedStats));

      if (achievement) {
        setShowAchievement(achievement);
        setTimeout(() => setShowAchievement(null), 3000);
      }

      return updatedStats;
    });
  };

  // Custom objection management
  const addCustomObjection = () => {
    if (!newObjectionTitle.trim() || !newObjectionText.trim()) return;

    const newObjection = {
      id: Date.now() + 1000, // Offset to avoid conflicts with built-in objections
      title: newObjectionTitle.trim(),
      objection: newObjectionText.trim(),
      difficulty: newObjectionDifficulty,
      isCustom: true,
      followUps: []
    };

    setCustomObjections(prev => [...prev, newObjection]);
    localStorage.setItem('customObjections', JSON.stringify([...customObjections, newObjection]));

    // Reset form
    setNewObjectionTitle('');
    setNewObjectionText('');
    setNewObjectionDifficulty('Medium');
    setShowCustomObjectionModal(false);
  };

  const deleteCustomObjection = (id) => {
    setCustomObjections(prev => prev.filter(obj => obj.id !== id));
    const updated = customObjections.filter(obj => obj.id !== id);
    localStorage.setItem('customObjections', JSON.stringify(updated));
  };

  // Advanced transcript analysis
  const analyzeTranscript = (pitch, duration) => {
    const words = pitch.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const wpm = Math.round((wordCount / duration) * 60);

    // Filler words detection
    const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'literally'];
    const fillerCount = words.filter(word => fillerWords.includes(word.replace(/[.,!?]/g, ''))).length;

    // Word choice analysis
    const strongWords = ['save', 'reduce', 'increase', 'improve', 'automate', 'efficient', 'fast', 'accurate', 'secure', 'reliable'];
    const weakWords = ['maybe', 'perhaps', 'kinda', 'sort of', 'try', 'might', 'could', 'should'];
    const questionWords = ['why', 'how', 'what', 'when', 'where', 'who'];

    const strongWordCount = words.filter(word => strongWords.some(strong => word.includes(strong))).length;
    const weakWordCount = words.filter(word => weakWords.some(weak => word.includes(weak))).length;
    const questionCount = words.filter(word => questionWords.some(q => word.includes(q))).length;

    // Sentence structure
    const sentences = pitch.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;

    return {
      wordCount,
      wpm,
      fillerWords: fillerCount,
      strongWords: strongWordCount,
      weakWords: weakWordCount,
      questions: questionCount,
      sentences: sentences.length,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      pacing: wpm < 100 ? 'slow' : wpm > 180 ? 'fast' : 'good'
    };
  };

  // Generate improvement recommendations
  const generateImprovementTips = (analysis, score, objection) => {
    const tips = [];

    // Pacing tips
    if (analysis.pacing === 'slow') {
      tips.push("Try speaking 20-30% faster to maintain listener engagement.");
    } else if (analysis.pacing === 'fast') {
      tips.push("Slow down slightly for better clarity and comprehension.");
    }

    // Filler words
    if (analysis.fillerWords > analysis.wordCount * 0.05) {
      tips.push(`Reduce filler words (${analysis.fillerWords} detected). Pause briefly instead of using "um" or "uh".`);
    }

    // Word choice
    if (analysis.strongWords < 3) {
      tips.push("Incorporate more benefit-focused language like 'save time', 'increase efficiency', or 'reduce errors'.");
    }

    if (analysis.weakWords > analysis.wordCount * 0.03) {
      tips.push("Replace tentative language with confident statements. Instead of 'might save time', say 'saves 2 hours daily'.");
    }

    // Structure
    if (analysis.sentences < 3) {
      tips.push("Break your response into 3-5 clear points for better organization.");
    }

    if (analysis.avgSentenceLength > 25) {
      tips.push("Use shorter sentences for better impact and comprehension.");
    }

    // Score-based tips
    if (score.clarity < 70) {
      tips.push("Focus on specific, measurable benefits rather than general statements.");
    }

    if (score.confidence < 70) {
      tips.push("Practice in front of a mirror and record yourself to build confidence.");
    }

    // Objection-specific tips
    const objectionTips = {
      "HIPAA Compliance": "Lead with security certifications before diving into technical details.",
      "Too Expensive": "Always tie pricing to specific ROI metrics and payback periods.",
      "Current System Works": "Identify specific pain points in their current workflow first.",
      "ROI Unclear": "Prepare 2-3 specific ROI scenarios based on practice size and specialty."
    };

    if (objectionTips[objection]) {
      tips.push(objectionTips[objection]);
    }

    return tips.length > 0 ? tips : ["Great job! Keep practicing to maintain and improve your skills."];
  };

  // Identify common weaknesses in the pitch
  const identifyWeaknesses = (analysis, score) => {
    const weaknesses = [];

    if (score.clarity < 70) {
      weaknesses.push({
        type: 'clarity',
        severity: 'high',
        description: 'Response lacks specific benefits and measurable outcomes',
        suggestion: 'Include concrete numbers and specific benefits'
      });
    }

    if (score.confidence < 70) {
      weaknesses.push({
        type: 'confidence',
        severity: 'high',
        description: 'Delivery appears hesitant with too many filler words',
        suggestion: 'Practice speaking with confidence and reduce filler words'
      });
    }

    if (score.conciseness < 70) {
      weaknesses.push({
        type: 'conciseness',
        severity: 'medium',
        description: 'Response is too long or doesn\'t fit the time frame',
        suggestion: 'Focus on 2-3 key points within the time limit'
      });
    }

    if (analysis.fillerWords > analysis.wordCount * 0.08) {
      weaknesses.push({
        type: 'filler_words',
        severity: 'medium',
        description: `High filler word usage (${analysis.fillerWords} detected)`,
        suggestion: 'Replace "um/uh" with brief pauses'
      });
    }

    if (analysis.strongWords < 2) {
      weaknesses.push({
        type: 'word_choice',
        severity: 'medium',
        description: 'Limited use of benefit-focused language',
        suggestion: 'Use words like "save", "reduce", "increase", "automate"'
      });
    }

    if (analysis.pacing === 'slow') {
      weaknesses.push({
        type: 'pacing',
        severity: 'low',
        description: 'Speaking pace is too slow for engagement',
        suggestion: 'Increase speed to 120-150 words per minute'
      });
    } else if (analysis.pacing === 'fast') {
      weaknesses.push({
        type: 'pacing',
        severity: 'low',
        description: 'Speaking too quickly reduces comprehension',
        suggestion: 'Slow down slightly for better clarity'
      });
    }

    return weaknesses;
  };

  const startRecording = async () => {
    setIsRecording(true);
    setTimer(0);
    setCurrentPitch('');
    setShowResults(false);
    setAiFeedback('');
    setAudioURL(null);
    setAudioBlob(null);
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
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
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

    // Update gamification stats
    updateUserStats(score);

    setTimeout(() => {
      getAIFeedback(pitchText, selectedObjection?.objection || 'General practice', score).then(feedback => {
        // Perform advanced analysis (needed for both continuing and ending conversations)
        const transcriptAnalysis = analyzeTranscript(pitchText, actualTimer);
        const improvementTips = generateImprovementTips(transcriptAnalysis, score, selectedObjection?.title);

        // Save the pitch immediately after each response
        const newPitch = {
          id: Date.now(),
          date: new Date().toISOString(),
          pitch: pitchText,
          duration: actualTimer,
          objection: selectedObjection?.title || 'General Practice',
          score: score,
          aiFeedback: feedback,
            audioURL: willHaveAudio ? audioURL : null,
            audioBlob: willHaveAudio ? audioBlob : null,
          transcriptAnalysis: transcriptAnalysis,
          improvementTips: improvementTips,
          weaknesses: identifyWeaknesses(transcriptAnalysis, score),
          conversationHistory: conversationStep > 0 ? conversationHistory.concat([{
            step: currentStep,
            objection: currentStep === 0 ? selectedObjection.objection : objectionData.followUps[currentStep - 1],
            response: pitchText,
            feedback: feedback
          }]) : []
        };

        // Handle multi-turn conversation
        const currentStep = conversationStep;
        const objectionData = dentistObjections.find(obj => obj.id === selectedObjection?.id);

        if (currentStep < (objectionData?.followUps?.length || 0)) {
          // Continue conversation with follow-up
          setConversationStep(currentStep + 1);
          setConversationHistory(prev => [...prev, {
            step: currentStep,
            objection: currentStep === 0 ? selectedObjection.objection : objectionData.followUps[currentStep - 1],
            response: pitchText,
            feedback: feedback
          }]);

          // Generate contextual help for next step
          if (objectionData?.followUps?.[currentStep]) {
            setContextualHelp(generateContextualHelp(selectedObjection.title));
          }

          setTimeout(() => {
            alert(`Great response! Now handle this follow-up: "${objectionData.followUps[currentStep]}"`);
          }, 1000);
        } else {
          // End conversation
          setConversationStep(0);
          setConversationHistory([]);
          setContextualHelp('');
        }

        // Save to history immediately (moved outside the if/else)
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
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <Volume2 className="w-6 h-6 mr-2 text-indigo-600" />
                Select an Objection
              </div>
              <button
                onClick={() => setShowCustomObjectionModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
              >
                + Custom
              </button>
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {[...dentistObjections, ...customObjections].map(obj => (
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{obj.title}</h3>
                      {obj.isCustom && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {obj.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomObjection(obj.id);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${
                        obj.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        obj.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {obj.difficulty}
                      </span>
                    </div>
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

                {/* Advanced Analysis Section */}
                {(() => {
                  const analysis = analyzeTranscript(currentPitch || 'Speech recognition not available. Audio recording captured.', timer || 1);
                  const weaknesses = identifyWeaknesses(analysis, lastScore);
                  const tips = generateImprovementTips(analysis, lastScore, selectedObjection?.title);

                  return (
                    <div className="mt-6 space-y-4">
                      {/* Recording Playback */}
                      {audioURL && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                            <Play className="w-4 h-4 mr-2" />
                            Recording Playback
                          </h4>
                          <audio controls className="w-full">
                            <source src={audioURL} type="audio/webm" />
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}

                      {/* Transcript Analysis */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-3">📊 Transcript Analysis</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-white p-2 rounded text-center">
                            <div className="text-lg font-bold text-blue-600">{analysis.wordCount}</div>
                            <div className="text-xs text-gray-600">Words</div>
                          </div>
                          <div className="bg-white p-2 rounded text-center">
                            <div className="text-lg font-bold text-blue-600">{analysis.wpm}</div>
                            <div className="text-xs text-gray-600">WPM</div>
                          </div>
                          <div className="bg-white p-2 rounded text-center">
                            <div className="text-lg font-bold text-blue-600">{analysis.fillerWords}</div>
                            <div className="text-xs text-gray-600">Filler Words</div>
                          </div>
                          <div className="bg-white p-2 rounded text-center">
                            <div className="text-lg font-bold text-blue-600">{analysis.sentences}</div>
                            <div className="text-xs text-gray-600">Sentences</div>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-blue-700">
                          <strong>Pacing:</strong> {analysis.pacing === 'slow' ? '⚠️ Slow' : analysis.pacing === 'fast' ? '⚠️ Fast' : '✅ Good'}
                        </div>
                      </div>

                      {/* Weaknesses Identified */}
                      {weaknesses.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-3 flex items-center">
                            <Target className="w-4 h-4 mr-2" />
                            Areas for Improvement
                          </h4>
                          <div className="space-y-2">
                            {weaknesses.map((weakness, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  weakness.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  weakness.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {weakness.severity}
                                </span>
                                <div>
                                  <div className="font-medium text-red-900">{weakness.description}</div>
                                  <div className="text-red-700 text-xs">{weakness.suggestion}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Improvement Recommendations */}
                      {tips.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Personalized Coaching Tips
                          </h4>
                          <ul className="space-y-1 text-sm text-green-800">
                            {tips.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
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

                  {/* Recording Playback in History */}
                  {pitch.audioURL && (
                    <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <audio controls className="w-full h-8">
                        <source src={pitch.audioURL} type="audio/webm" />
                      </audio>
                    </div>
                  )}

                  {/* Transcript Analysis in History */}
                  {pitch.transcriptAnalysis && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="text-xs text-blue-900 mb-2 font-semibold">📊 Analysis</div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{pitch.transcriptAnalysis.wordCount}</div>
                          <div className="text-blue-700">words</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{pitch.transcriptAnalysis.wpm}</div>
                          <div className="text-blue-700">WPM</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{pitch.transcriptAnalysis.fillerWords}</div>
                          <div className="text-blue-700">fillers</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-bold ${
                            pitch.transcriptAnalysis.pacing === 'slow' ? 'text-red-600' :
                            pitch.transcriptAnalysis.pacing === 'fast' ? 'text-red-600' :
                            'text-green-600'
                          }`}>
                            {pitch.transcriptAnalysis.pacing}
                          </div>
                          <div className="text-blue-700">pace</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Weaknesses in History */}
                  {pitch.weaknesses && pitch.weaknesses.length > 0 && (
                    <div className="mb-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-3 h-3 text-red-600" />
                        <span className="text-xs font-semibold text-red-900">Key Issues:</span>
                      </div>
                      <div className="text-xs text-red-800">
                        {pitch.weaknesses.slice(0, 2).map(w => w.description).join(' • ')}
                      </div>
                    </div>
                  )}

                  {/* AI Feedback */}
                  {pitch.aiFeedback && (
                    <div className="mb-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-900">AI Feedback:</span>
                      </div>
                      <p className="text-sm text-purple-800">{pitch.aiFeedback}</p>
                    </div>
                  )}

                  {/* Improvement Tips */}
                  {pitch.improvementTips && pitch.improvementTips.length > 0 && (
                    <div className="mb-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-semibold text-green-900">Top Tip:</span>
                      </div>
                      <p className="text-xs text-green-800">{pitch.improvementTips[0]}</p>
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

        {/* Achievement Popup */}
        {showAchievement && (
          <div className="fixed top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-bounce">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-lg">{showAchievement.title}</h3>
                <p className="text-sm">{showAchievement.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contextual Help */}
        {contextualHelp && (
          <div className="fixed bottom-4 left-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-40">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">💡 Contextual Help</h4>
                <p className="text-blue-800 text-sm">{contextualHelp}</p>
              </div>
              <button
                onClick={() => setContextualHelp('')}
                className="text-blue-400 hover:text-blue-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Custom Objection Modal */}
        {showCustomObjectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Create Custom Objection</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newObjectionTitle}
                    onChange={(e) => setNewObjectionTitle(e.target.value)}
                    placeholder="e.g., Budget Concerns"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objection Text</label>
                  <textarea
                    value={newObjectionText}
                    onChange={(e) => setNewObjectionText(e.target.value)}
                    placeholder="e.g., We can't afford this right now..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={newObjectionDifficulty}
                    onChange={(e) => setNewObjectionDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCustomObjectionModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addCustomObjection}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center text-gray-600 text-sm mt-8 pb-8">
          <p>Practice daily to master your pitch • AI-powered coaching for dental SaaS success</p>
        </footer>
      </div>
    </div>
  );
};

export default App;