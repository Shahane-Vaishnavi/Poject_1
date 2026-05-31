import React, { useState, useEffect, useRef } from "react";
import {
  FaBalanceScale,
  FaRobot,
  FaTimes,
  FaMinus,
  FaChevronUp,
  FaPaperPlane,
  FaMicrophone,
  FaPaperclip,
  FaPhoneAlt,
  FaExclamationTriangle,
  FaVolumeUp,
  FaVolumeMute,
  FaUserShield,
  FaCheckCircle,
  FaArrowRight,
  FaFolderOpen
} from "react-icons/fa";
import "./LigalSakhiAIAssistant.css";

const EMERGENCY_KEYWORDS = [
  "violence", "abuse", "threat", "harassment", "emergency", "beaten", "rape", 
  "assault", "hurt", "danger", "stalk", "blackmail", "suicide", "maar", "pitna", 
  "dhanki", "gali", "chhedkhani", "pareshan", "cyber stalking", "dhamki", "attack"
];

const QUICK_ACTIONS = [
  { label: "Cyber Crime", query: "How do I file a cyber crime complaint for online harassment?" },
  { label: "Domestic Violence", query: "What protection is available under the Domestic Violence Act 2005?" },
  { label: "FIR Help", query: "What is a Zero FIR and what if the police refuse to file an FIR?" },
  { label: "Women's Rights", query: "What are my legal rights against workplace harassment (POSH)?" },
  { label: "Find Advocate", query: "How do I find and connect with a verified advocate on LegalSakhi?" },
  { label: "Emergency Support", query: "EMERGENCY: I need immediate legal helplines and safety resources!" }
];

const FOLLOW_UPS = {
  cyber: [
    "How do I report online stalking?",
    "What is Section 66E of the IT Act?",
    "Can I file a cyber complaint anonymously?"
  ],
  violence: [
    "What is a Protection Order?",
    "How do I contact a Protection Officer?",
    "Is emotional and financial abuse covered?"
  ],
  fir: [
    "What is a Zero FIR?",
    "What if the police refuse my FIR?",
    "Do I have to pay for a copy of the FIR?"
  ],
  rights: [
    "What is the POSH Act 2013?",
    "What are my inheritance and property rights?",
    "How can I get free legal aid from NALSA?"
  ],
  advocate: [
    "How do I chat with Adv. Vaishnavi Shahane?",
    "Is the legal consultation free on this portal?",
    "What practice areas do advocates cover here?"
  ],
  default: [
    "What are my basic fundamental rights?",
    "Show me emergency numbers again",
    "How do I register a complaint on NCW?"
  ]
};

export default function LigalSakhiAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);
  const [language, setLanguage] = useState("en"); // en, hi, mr
  const [activeAttachment, setActiveAttachment] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState(FOLLOW_UPS.default);
  const [pulse, setPulse] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  // Initialize Speech Synthesis and Speech Recognition
  useEffect(() => {
    // Scroll to bottom
    scrollToBottom();
    
    // Load chat history or set initial messages
    const saved = localStorage.getItem("ligalsakhi_ai_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        loadInitialWelcome();
      }
    } else {
      loadInitialWelcome();
    }

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN"; // Supports English and Indian accents
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? prev + " " + text : text));
        checkEmergencyKeywords(text);
      };
      rec.onerror = (e) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
      };
      recognitionRef.current = rec;
    }

    // Initialize Synthesis
    synthesisRef.current = window.speechSynthesis;

    // Tooltip timer loop to grab attention
    const tooltipInterval = setInterval(() => {
      if (!isOpen) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 5000);
      }
    }, 20000);

    return () => {
      clearInterval(tooltipInterval);
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("ligalsakhi_ai_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Handle auto scrolling
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const loadInitialWelcome = () => {
    setMessages([
      {
        id: 1,
        sender: "ai",
        text: "Namaste! I am LigalSakhi AI, your secure legal companion. I am designed to assist women across India with direct legal awareness, cyber safety, domestic abuse support, FIR processes, and connecting with verified legal advocates. Everything you discuss here is completely confidential.",
        timestamp: getCurrentTime(),
        isWelcome: true
      }
    ]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    checkEmergencyKeywords(val);
  };

  const checkEmergencyKeywords = (text) => {
    const lowerText = text.toLowerCase();
    const hasEmergency = EMERGENCY_KEYWORDS.some((keyword) => lowerText.includes(keyword));
    if (hasEmergency) {
      setShowEmergencyBanner(true);
    }
  };

  // Web Speech synthesis
  const speakText = (text, messageId) => {
    if (!synthesisRef.current) return;

    if (speakingMessageId === messageId) {
      synthesisRef.current.cancel();
      setSpeakingMessageId(null);
      return;
    }

    synthesisRef.current.cancel(); // Stop any current speech
    
    // Strip HTML/bullets tags for speech if any
    const cleanText = text.replace(/•/g, "").replace(/\n/g, ". ");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Choose voice based on language
    const voices = synthesisRef.current.getVoices();
    let selectedVoice = null;
    if (language === "hi") {
      selectedVoice = voices.find(v => v.lang.startsWith("hi"));
    } else if (language === "mr") {
      selectedVoice = voices.find(v => v.lang.startsWith("mr") || v.lang.startsWith("hi"));
    }
    
    if (selectedVoice) utterance.voice = selectedVoice;
    else {
      // Find female voice as fallback
      const femaleVoice = voices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("google"));
      if (femaleVoice) utterance.voice = femaleVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    
    setSpeakingMessageId(messageId);
    synthesisRef.current.speak(utterance);
  };

  // Toggle Voice Input
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // File Upload Simulation
  const triggerAttachment = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setActiveAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type
      });
      // Pre-populate input or notify user
      setInputValue((prev) => (prev ? prev : `Please analyze my uploaded document: ${file.name}`));
    }
  };

  const removeAttachment = () => {
    setActiveAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (textToSend = inputValue) => {
    if (!textToSend.trim() && !activeAttachment) return;

    const userText = textToSend;
    const currentAttachment = activeAttachment;
    
    // Clear input
    setInputValue("");
    setActiveAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Add user message
    const userMsgId = Date.now();
    const newUserMsg = {
      id: userMsgId,
      sender: "user",
      text: userText,
      timestamp: getCurrentTime(),
      attachment: currentAttachment
    };
    
    setMessages((prev) => [...prev, newUserMsg]);
    setIsTyping(true);

    // Determine follow-up suggestions dynamically
    const lowerText = userText.toLowerCase();
    let nextSuggestions = FOLLOW_UPS.default;
    if (lowerText.includes("cyber") || lowerText.includes("online") || lowerText.includes("stalk") || lowerText.includes("photo")) {
      nextSuggestions = FOLLOW_UPS.cyber;
    } else if (lowerText.includes("viol") || lowerText.includes("abus") || lowerText.includes("beat") || lowerText.includes("husband") || lowerText.includes("domestic")) {
      nextSuggestions = FOLLOW_UPS.violence;
    } else if (lowerText.includes("fir") || lowerText.includes("police") || lowerText.includes("complain") || lowerText.includes("station")) {
      nextSuggestions = FOLLOW_UPS.fir;
    } else if (lowerText.includes("right") || lowerText.includes("work") || lowerText.includes("posh") || lowerText.includes("property")) {
      nextSuggestions = FOLLOW_UPS.rights;
    } else if (lowerText.includes("advoc") || lowerText.includes("lawy") || lowerText.includes("chat") || lowerText.includes("vaishnavi")) {
      nextSuggestions = FOLLOW_UPS.advocate;
    }

    setSuggestedQuestions(nextSuggestions);

    // Call API or local fallback
    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });

      if (response.ok) {
        const data = await response.json();
        addAiResponse(data.reply);
      } else {
        // Fallback if status code not 200
        generateFallbackResponse(userText);
      }
    } catch (error) {
      console.warn("FastAPI backend is offline. Using premium client-side legal engine fallback.", error);
      generateFallbackResponse(userText);
    }
  };

  const addAiResponse = (replyText) => {
    setIsTyping(false);
    const newAiMsg = {
      id: Date.now() + 1,
      sender: "ai",
      text: replyText,
      timestamp: getCurrentTime()
    };
    setMessages((prev) => [...prev, newAiMsg]);
  };

  // Comprehensive client-side interactive legal fallback generator
  const generateFallbackResponse = (userText) => {
    setTimeout(() => {
      const text = userText.toLowerCase();
      let reply = "";

      if (text.includes("cyber") || text.includes("online") || text.includes("stalk") || text.includes("hack") || text.includes("photo") || text.includes("instagram") || text.includes("harass")) {
        reply = `**Cyber Crime & Online Harassment Protection:**

Under India's **Information Technology (IT) Act, 2000**, women are heavily protected from online threats, morphing, identity theft, and stalking:
• **Section 66E (Violation of Privacy):** Criminalizes capturing, publishing, or transmitting images of a private area of any person without consent. Punishable with up to 3 years imprisonment.
• **Section 67 (Obscenity):** Penalizes publishing obscene material in electronic form.
• **Section 354D of the Indian Penal Code (IPC):** Strictly covers physical and cyberstalking. Repeatedly contacting a woman online despite clear disinterest is a criminal offense.

**Immediate Recommended Actions:**
1. **Preserve Evidence:** Take screenshots of the offensive messages, comments, profiles, or emails immediately. Save URLs. Do not delete them.
2. **File an Online Complaint:** Visit the National Cyber Crime Reporting Portal at **[cybercrime.gov.in](https://cybercrime.gov.in)** or call their national helpline **1930** (active 24/7).
3. **Anonymity:** You can file cybercrime complaints related to obscene images anonymously on the portal.
4. **Platform Reporting:** Report the account on Instagram, Facebook, or the specific app to block them and prompt taking down content.`;
      } 
      
      else if (text.includes("domestic") || text.includes("violence") || text.includes("beat") || text.includes("abuse") || text.includes("husband") || text.includes("in-law") || text.includes("maar")) {
        reply = `**Domestic Violence & Women Safety Protection:**

The **Protection of Women from Domestic Violence Act, 2005 (PWDVA)** is a powerful law protecting women from abuse within domestic relationships (spouse, parents, siblings, or in-laws).

**Key Protection Features:**
• **Broad Coverage:** Covers physical, verbal, emotional, sexual, and economic abuse.
• **Right to Residence:** You cannot be thrown out of your shared household/home, regardless of whether you have legal ownership or share in it.
• **Protection Orders:** The Court can restrain the abuser from entering your workplace, contacting you, or committing any act of violence.
• **Monetary Relief & Compensation:** The court can order the husband to pay for medical expenses, loss of earnings, monthly maintenance, and damages.

**Support Channels Available:**
1. **Immediate Danger:** Dial **112** (Police Emergency) or the **1091** (National Women Helpline).
2. **Women's Helpline (Maharashtra):** Call **181** for counseling, rescue, and shelter assistance.
3. **Protection Officers:** Approach the District Protection Officer (appointed by government to record Domestic Incident Reports and secure quick magistrate orders).
4. **NGO Shelter Homes:** We can connect you to registered shelter homes (Swadhar Greh) if you need a safe environment.`;
      } 
      
      else if (text.includes("fir") || text.includes("police") || text.includes("station") || text.includes("complain") || text.includes("refus")) {
        reply = `**Guide on Filing a First Information Report (FIR):**

An FIR is registered under **Section 154 of the Criminal Procedure Code (CrPC)** and is the official starting point for any criminal investigation.

**Important Legal Rights of Women Regarding FIR:**
• **Zero FIR:** If a crime takes place outside a police station's jurisdiction, they **cannot** turn you away. They must register a **Zero FIR** and transfer it to the appropriate station.
• **Right to a Female Officer:** For sexual offenses (stalking, harassment, assault), your statement **must** be recorded by a female police officer at your residence or a place of your choice.
• **Free Copy:** You have a legal right to get a copy of the registered FIR completely free of charge.
• **If Police Refuse to Register FIR:** 
  1. Write a written complaint and send it to the **Superintendent of Police (SP)** or Commissioner via registered post under Section 154(3) CrPC.
  2. File a complaint under **Section 156(3) CrPC** before a Magistrate, who can direct the police to register the FIR and investigate.
  3. Refusing to file an FIR for crimes against women is a punishable offense for police officers under Section 166A of the IPC.`;
      } 
      
      else if (text.includes("right") || text.includes("work") || text.includes("posh") || text.includes("equal") || text.includes("law") || text.includes("property")) {
        reply = `**Key Legal Rights of Women in India:**

India's constitution and acts provide powerful statutory rights for women to ensure safety, equality, and dignity:
1. **Workplace Harassment (POSH Act, 2013):** Every organization with 10+ employees must have an **Internal Complaints Committee (ICC)**. Women have the right to file formal complaints against workplace sexual harassment, and the employer must complete inquiries within 90 days.
2. **Right to Free Legal Aid:** Under **Section 12 of the Legal Services Authorities Act, 1987**, all women, regardless of their financial status or income, are entitled to **100% free legal aid** from NALSA (National Legal Services Authority).
3. **Arrest Restrictions:** Under Section 46(4) of the CrPC, a woman **cannot be arrested after sunset and before sunrise**, except in extraordinary circumstances, and even then, only with prior permission from a Judicial Magistrate and by a female police officer.
4. **Equal Inheritance Rights:** Under the Hindu Succession (Amendment) Act 2005, daughters have equal coparcenary (birthrights) in ancestral property, identical to sons.`;
      } 
      
      else if (text.includes("advoc") || text.includes("lawy") || text.includes("chat") || text.includes("find") || text.includes("vaishnavi") || text.includes("contact")) {
        reply = `**Connecting with Verified Legal Advocates:**

LegalSakhi offers direct and confidential communication with verified female advocates who specialize in family law, criminal defense, cyber law, and workplace harassment:
• **Adv. Vaishnavi Shahane** (Family Law & Criminal Defense expert)
• **Adv. Mayuri Landage** (Cyber Law & Women's Rights specialist)
• **Adv. Shravani Pampatvar** (Property Law & Civil Litigation expert)

**How to connect:**
1. Navigate to the **"Find Advocates"** section in the website's top menu.
2. View detailed credentials, years of experience, ratings, and peer reviews.
3. Click the **"Chat"** button on the advocate's profile card to open a private message channel. All introductory consultations are pro-bono (free of charge) through our platform to support women.`;
      } 
      
      else if (text.includes("emergency") || text.includes("help") || text.includes("danger") || text.includes("safe") || text.includes("112") || text.includes("181")) {
        reply = `**🚨 Emergency Support & Direct Helplines:**

If you are in immediate danger or feel unsafe, please do not hesitate. Contact these official 24x7 Government emergency services right away:
• **National Emergency Helpline:** **112** (Direct Police Dispatch)
• **Women Helpline (All India):** **1091** (Confidential safety support & rescue)
• **Women Helpline (Maharashtra):** **181** (Counseling, emergency response, shelter)
• **Cyber Crime National Helpline:** **1930** (Financial fraud & cyber stalking)
• **National Commission for Women (NCW):** **7827170170** (Domestic abuse/harassment)

*Tip: Lock yourself in a safe room or call a trusted neighbour or family member immediately while you await police assistance.*`;
      } 
      
      else {
        reply = `Namaste. Thank you for reaching out. 

I understand that navigating legal issues can be challenging and stressful. I am trained to guide women on various rights and legal pathways. To help you better, could you specify which of these categories matches your issue?
• **Cyber Crime Complaints:** For online stalking, harassment, fake profiles, or privacy leaks.
• **Domestic Violence Support:** For abuse at home or shared housing rights.
• **FIR Guidance:** For filing police complaints, Zero FIRs, or handling police refusal.
• **Women's Rights:** For workplace safety (POSH), equal pay, property inheritance, or free legal aid.
• **Finding Advocates:** How to book free private chats with our verified legal panel.

Alternatively, feel free to describe your situation, and I will highlight relevant acts, legal sections, and immediate safety steps.`;
      }

      addAiResponse(reply);
    }, 1200);
  };

  const handleQuickAction = (action) => {
    setShowTooltip(false);
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    }
    if (action.label === "Emergency Support") {
      setShowEmergencyBanner(true);
    }
    handleSendMessage(action.query);
  };

  const handleSuggestedQuestion = (question) => {
    handleSendMessage(question);
  };

  const clearChatHistory = () => {
    if (window.confirm("Are you sure you want to clear your confidential chat history with LigalSakhi AI?")) {
      localStorage.removeItem("ligalsakhi_ai_history");
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      setSpeakingMessageId(null);
      setShowEmergencyBanner(false);
      loadInitialWelcome();
    }
  };

  return (
    <div className="ligalsakhi-ai-widget" role="complementary" aria-label="LegalSakhi AI Legal Assistant">
      {/* 🔴 EMERGENCY BANNER */}
      {showEmergencyBanner && isOpen && !isMinimized && (
        <div className="emergency-banner-top animate-fade-in">
          <div className="emergency-banner-content">
            <FaExclamationTriangle className="emergency-warn-icon animate-pulse" />
            <div>
              <strong className="emergency-title">Emergency Legal & Safety Helplines</strong>
              <p className="emergency-desc">If you are in immediate danger, please contact emergency numbers right away.</p>
              <div className="emergency-btn-row">
                <a href="tel:112" className="emergency-call-btn police">
                  <FaPhoneAlt size={11} /> Call Police (112)
                </a>
                <a href="tel:1091" className="emergency-call-btn women">
                  <FaPhoneAlt size={11} /> Women Helpline (1091)
                </a>
                <a href="tel:181" className="emergency-call-btn maha">
                  <FaPhoneAlt size={11} /> Maharashtra 181
                </a>
              </div>
            </div>
          </div>
          <button 
            className="emergency-close-btn" 
            onClick={() => setShowEmergencyBanner(false)}
            aria-label="Dismiss Emergency Banner"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* 🔵 FLOATING ACTION BUTTON */}
      {!isOpen && (
        <div className="fab-container">
          {showTooltip && (
            <div className="fab-tooltip animate-bounce">
              <span>Ask LigalSakhi AI ⚖️</span>
            </div>
          )}
          <button
            className={`floating-ai-fab ${pulse ? "pulse" : ""}`}
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
              setPulse(false);
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="Open LigalSakhi AI Legal Assistant"
            title="Ask LigalSakhi AI"
          >
            <div className="fab-icon-wrapper">
              <FaBalanceScale className="fab-scales-icon" />
              <FaRobot className="fab-ai-icon" />
            </div>
          </button>
        </div>
      )}

      {/* 🔵 CHAT WINDOW */}
      {isOpen && (
        <div className={`chat-window-container ${isMinimized ? "minimized" : "maximized"} animate-scale-up`}>
          
          {/* HEADER */}
          <div className="chat-window-header">
            <div className="header-brand-info">
              <div className="avatar-wrapper">
                <img src="/LigalSakhiLogo.png" alt="LigalSakhi" className="assistant-logo" onError={(e) => { e.target.src = "https://i.pravatar.cc/100?img=1" }} />
                <span className="online-indicator" aria-label="Online"></span>
              </div>
              <div className="title-text-group">
                <h3 className="widget-main-title">
                  LigalSakhi AI <FaCheckCircle className="verified-badge-icon" title="Government Inspired & Verified" />
                </h3>
                <span className="widget-subtitle">Women's Rights & Legal Guidance</span>
              </div>
            </div>

            <div className="header-control-buttons">
              <select 
                className="widget-language-select" 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Select AI Language"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
              
              <button 
                className="header-control-btn min" 
                onClick={() => setIsMinimized(!isMinimized)} 
                title={isMinimized ? "Restore Chat" : "Minimize Chat"}
                aria-label={isMinimized ? "Restore Chat" : "Minimize Chat"}
              >
                {isMinimized ? <FaChevronUp /> : <FaMinus />}
              </button>
              
              <button 
                className="header-control-btn close" 
                onClick={() => {
                  setIsOpen(false);
                  if (synthesisRef.current) {
                    synthesisRef.current.cancel();
                  }
                  setSpeakingMessageId(null);
                }} 
                title="Close Chat"
                aria-label="Close Chat"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* CHAT BODY & INPUT (HIDDEN WHEN MINIMIZED) */}
          {!isMinimized && (
            <>
              {/* CHAT MESSAGES PANEL */}
              <div className="chat-messages-panel">
                
                {/* Scrollable messages area */}
                <div className="scrollable-messages-container">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message-bubble-wrapper ${msg.sender === "user" ? "user-msg-align" : "ai-msg-align"} animate-fade-in`}>
                      
                      {/* Avatar for AI */}
                      {msg.sender === "ai" && (
                        <div className="chat-avatar-column">
                          <div className="msg-ai-avatar">
                            <FaBalanceScale size={13} color="white" />
                          </div>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="chat-bubble-content-block">
                        <div className={`message-bubble ${msg.sender === "user" ? "user-bubble-theme" : "ai-bubble-theme"}`}>
                          
                          {/* Welcome Items Custom Format */}
                          {msg.isWelcome ? (
                            <div>
                              <p className="welcome-greet-text">{msg.text}</p>
                              <div className="welcome-services-card">
                                <span className="welcome-card-header">💡 How I can assist you:</span>
                                <ul className="welcome-services-list">
                                  <li><span>⚖️</span> <strong>Women's Rights:</strong> POSH Act, Property rights, Free Legal Aid.</li>
                                  <li><span>💻</span> <strong>Cyber Crime:</strong> Stalking, Privacy violations, Online Harassment.</li>
                                  <li><span>🏠</span> <strong>Domestic Violence:</strong> Protection orders, Residential rights, Aid resources.</li>
                                  <li><span>📋</span> <strong>FIR Guidance:</strong> Registration steps, Zero FIRs, Police guidelines.</li>
                                  <li><span>👩‍⚖️</span> <strong>Finding Advocates:</strong> Verified professional support directory.</li>
                                </ul>
                              </div>
                            </div>
                          ) : (
                            /* Support basic markdown bullet formatting in mock responses */
                            <div className="message-formatted-text">
                              {msg.text.split("\n").map((line, lIdx) => {
                                if (line.startsWith("• ")) {
                                  return <li key={lIdx} className="msg-bullet">{line.substring(2)}</li>;
                                }
                                if (line.startsWith("**") && line.endsWith("**")) {
                                  return <h4 key={lIdx} className="msg-section-header">{line.replace(/\*\*/g, "")}</h4>;
                                }
                                if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ")) {
                                  return <p key={lIdx} className="msg-numbered-step"><strong>{line.substring(0, 3)}</strong>{line.substring(3)}</p>;
                                }
                                return <p key={lIdx} className="msg-paragraph">{line}</p>;
                              })}
                            </div>
                          )}

                          {/* Render attachment metadata inside user message */}
                          {msg.attachment && (
                            <div className="msg-attachment-tag">
                              <FaFolderOpen className="attach-tag-icon" />
                              <div className="attach-tag-info">
                                <span className="attach-tag-name">{msg.attachment.name}</span>
                                <span className="attach-tag-size">{msg.attachment.size}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer area inside speech bubbles for action buttons and timestamps */}
                        <div className="msg-meta-row">
                          <span className="msg-timestamp">{msg.timestamp}</span>
                          {msg.sender === "ai" && (
                            <button
                              className={`msg-audio-speak-btn ${speakingMessageId === msg.id ? "speaking" : ""}`}
                              onClick={() => speakText(msg.text, msg.id)}
                              title={speakingMessageId === msg.id ? "Stop Speaking" : "Listen to Response (Text-to-Speech)"}
                              aria-label={speakingMessageId === msg.id ? "Stop Speaking" : "Listen to Response"}
                            >
                              {speakingMessageId === msg.id ? <FaVolumeMute size={11} /> : <FaVolumeUp size={11} />}
                              <span>{speakingMessageId === msg.id ? "Stop" : "Listen"}</span>
                            </button>
                          )}
                        </div>

                      </div>

                    </div>
                  ))}

                  {/* TYPING INDICATOR */}
                  {isTyping && (
                    <div className="chat-message-bubble-wrapper ai-msg-align animate-fade-in">
                      <div className="chat-avatar-column">
                        <div className="msg-ai-avatar">
                          <FaBalanceScale size={13} color="white" />
                        </div>
                      </div>
                      <div className="chat-bubble-content-block">
                        <div className="message-bubble ai-bubble-theme typing-indicator-bubble">
                          <span className="typing-dot animate-bounce"></span>
                          <span className="typing-dot animate-bounce delay-100"></span>
                          <span className="typing-dot animate-bounce delay-200"></span>
                          <span className="typing-indicator-text">LigalSakhi is preparing trusted guidance...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ref marker for auto-scroll */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* QUICK ACTION CHIPS */}
              <div className="quick-action-chips-scroller">
                <div className="chips-wrapper">
                  {QUICK_ACTIONS.map((action, index) => (
                    <button
                      key={index}
                      className={`quick-action-chip-btn ${action.label === "Emergency Support" ? "emergency" : ""}`}
                      onClick={() => handleQuickAction(action)}
                      title={action.query}
                    >
                      {action.label === "Emergency Support" && <span className="chip-badge">🚨</span>}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUGGESTED FOLLOW-UPS SECTION */}
              {suggestedQuestions && suggestedQuestions.length > 0 && (
                <div className="suggested-questions-tray">
                  <span className="tray-label">Suggested follow-ups:</span>
                  <div className="suggested-questions-list">
                    {suggestedQuestions.map((q, idx) => (
                      <button 
                        key={idx} 
                        className="suggested-question-btn" 
                        onClick={() => handleSuggestedQuestion(q)}
                      >
                        <span>{q}</span>
                        <FaArrowRight size={8} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIVE FILE ATTACHMENT CARD */}
              {activeAttachment && (
                <div className="active-attachment-preview-card animate-slide-in">
                  <div className="preview-info-block">
                    <FaFolderOpen size={16} className="preview-folder-icon" />
                    <div>
                      <span className="preview-filename">{activeAttachment.name}</span>
                      <span className="preview-filesize">{activeAttachment.size}</span>
                    </div>
                  </div>
                  <button className="preview-remove-btn" onClick={removeAttachment} title="Remove Document">
                    <FaTimes size={12} />
                  </button>
                </div>
              )}

              {/* INPUT REGION */}
              <div className="chat-input-toolbar-block">
                <div className="input-row-controls">
                  <button 
                    className="toolbar-action-btn attach" 
                    onClick={triggerAttachment}
                    title="Upload legal document, FIR draft, or screenshot"
                    aria-label="Upload document"
                  >
                    <FaPaperclip />
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />

                  <textarea
                    className="chat-textarea-input"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe your legal issue (e.g. harassment, stalking, rights)..."
                    aria-label="Describe your legal issue"
                    rows={1}
                  />

                  <button 
                    className={`toolbar-action-btn mic-record ${isListening ? "recording active" : ""}`} 
                    onClick={toggleListening}
                    title={isListening ? "Stop listening" : "Speak to write (Voice Input)"}
                    aria-label={isListening ? "Stop listening" : "Voice Input"}
                  >
                    <FaMicrophone />
                    {isListening && <span className="mic-pulse-ring"></span>}
                  </button>

                  <button 
                    className="toolbar-send-action-btn"
                    onClick={() => handleSendMessage()}
                    title="Send Message"
                    aria-label="Send Message"
                    disabled={!inputValue.trim() && !activeAttachment}
                  >
                    <FaPaperPlane />
                  </button>
                </div>

                <div className="toolbar-bottom-disclaimer">
                  <span>LigalSakhi AI provides immediate general legal information. For formal representation, use our "Find Advocates" portal.</span>
                  <button className="clear-history-button" onClick={clearChatHistory} title="Clear Chat History">
                    Clear Chat
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
