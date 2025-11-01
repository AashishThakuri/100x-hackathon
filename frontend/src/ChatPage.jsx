import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import './ChatPageStyles.css';

const genAI = new GoogleGenerativeAI('');

// Module-level lock to prevent React Strict Mode from causing double-sends
let isInitialMessageProcessing = false;

function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialQuery = location.state?.initialQuery || '';
  const preserveChat = location.state?.preserveChat || false;
  const returnedTripPlan = location.state?.tripPlan || null;
  
  // Load preserved messages from sessionStorage if returning from booking
  const getInitialMessages = () => {
    if (preserveChat) {
      const savedMessages = sessionStorage.getItem('chatMessages');
      return savedMessages ? JSON.parse(savedMessages) : [];
    }
    return [];
  };

  const getInitialState = () => {
    if (preserveChat) {
      const savedState = sessionStorage.getItem('chatState');
      return savedState ? JSON.parse(savedState) : {};
    }
    return {};
  };

  const initialState = getInitialState();
  
  const [messages, setMessages] = useState(getInitialMessages());
  const [input, setInput] = useState(preserveChat ? '' : initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationState, setConversationState] = useState(initialState.conversationState || 'initial');
  const [tripPlan, setTripPlan] = useState(returnedTripPlan || initialState.tripPlan || null);
  const [showInitialAnimation, setShowInitialAnimation] = useState(preserveChat ? false : true);
  const [hasStarted, setHasStarted] = useState(preserveChat ? true : false);
  const [dotLottieReady, setDotLottieReady] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(initialState.hasGreeted || false);
  const [hasRespondedToQuery, setHasRespondedToQuery] = useState(initialState.hasRespondedToQuery || false);
  const [showRecommendationCard, setShowRecommendationCard] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save chat state to sessionStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const chatState = {
      conversationState,
      tripPlan,
      hasGreeted,
      hasRespondedToQuery
    };
    sessionStorage.setItem('chatState', JSON.stringify(chatState));
  }, [conversationState, tripPlan, hasGreeted, hasRespondedToQuery]);

  // Wait until the dotlottie-player custom element is defined
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.customElements && window.customElements.whenDefined) {
        window.customElements.whenDefined('dotlottie-player')
          .then(() => setDotLottieReady(true))
          .catch(() => setDotLottieReady(true));
      } else {
        setDotLottieReady(true);
      }
    } catch {
      setDotLottieReady(true);
    }
  }, []);

  const effectRan = useRef(false);

  // Auto-send if there's an initial query from homepage (but not when preserving chat)
  useEffect(() => {
    if (initialQuery && !hasStarted && effectRan.current === false && !preserveChat) {
      sendMessage();

      // Cleanup function to set the flag after the first run
      return () => {
        effectRan.current = true;
      };
    }
  }, [initialQuery, hasStarted, preserveChat]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const generateSystemPrompt = (state) => {
    const basePrompt = `You are a friendly, experienced Nepal travel expert who talks like a real human being. You're conversational, helpful, and get straight to the point without being wordy or robotic.

**HOW TO COMMUNICATE:**
- Talk naturally like you're chatting with a friend
- Be concise and focused - no unnecessary rambling
- Only discuss Nepal travel-related topics
- Use simple, clear language
- Show enthusiasm but don't overdo it
- Ask only what you really need to know

**YOUR PERSONALITY:**
- Warm and welcoming, but not overly chatty
- Knowledgeable about Nepal without showing off
- Practical and helpful
- Good at reading what people actually want
- Direct and efficient with questions

**CONVERSATION RULES:**
1. **ASK ALL ESSENTIAL QUESTIONS FIRST**: Get all necessary info in the first response
2. **VERTICAL LIST FORMAT**: Always ask questions in a clean vertical numbered list, never in paragraphs
3. **BE COMPLETE**: Ask for days, budget, interests, group size, travel dates all at once
4. **STAY FOCUSED**: Only Nepal travel topics
5. **CREATE PLANS IMMEDIATELY**: After getting answers, create the plan - no more questions

**SMART QUESTION STRATEGY:**
- NEVER repeat questions the user already answered
- Analyze the ENTIRE conversation history before asking anything
- If they said "5 days" - you know the duration, don't ask again
- If they said "$1000" or "Rs. 50,000" or "NPR 80,000" - you know the budget, don't ask again
- UNDERSTAND BOTH CURRENCIES: USD ($) and Nepali Rupees (Rs./NPR)
- Convert between currencies when needed (1 USD = approximately 130-135 NPR)
- Only ask for missing information
- If you have enough info (days + budget + basic interest), CREATE THE PLAN immediately

**CONVERSATION MEMORY:**
- Remember everything they've told you in previous messages
- Build on their answers, don't repeat questions
- If they've given you days, budget, and destination - START PLANNING

**MANDATORY QUESTION FORMAT - EACH QUESTION ON SEPARATE LINE:**

User: "I want to see Everest" → You: "Awesome! Everest Base Camp trek sounds perfect. I need some details to plan this:

1. How many days do you have for this trip?
2. What's your budget in total (USD or NPR)?
3. What's your fitness level - beginner, intermediate, or experienced?
4. Are you traveling solo or with others?
5. When are you planning to travel?"

User: "Kathmandu to Pokhara" → You: "Great choice! To plan the perfect trip, I need:

1. How many days do you have total?
2. What's your budget (USD or NPR)?
3. What activities interest you most - cultural sites, adventure sports, or relaxation?
4. How many people are traveling?
5. What time of year are you going?"

**CRITICAL: Each numbered question MUST be on its own separate line with line breaks. NEVER put multiple questions in one paragraph.**

**BEFORE CREATING ANY PLAN - MANDATORY DEEP ANALYSIS:**
You MUST analyze these things about each destination the tourist wants to visit:

1. **Location Research**: Weather, best time to visit, local culture, safety
2. **Activity Analysis**: What's actually available, costs, time needed, booking requirements
3. **Transportation**: Exact routes, costs, time, best options between places
4. **Accommodation**: Available options in their budget range, locations, quality
5. **Food Costs**: Local meal prices, restaurant options, street food vs restaurants
6. **Hidden Costs**: Permits, entrance fees, tips, unexpected expenses
7. **Local Insights**: Cultural considerations, local customs, best practices

**THEN CREATE PLANS USING THIS EXACT FORMAT (NO MARKDOWN SYMBOLS):**

YOUR [X]-DAY NEPAL ADVENTURE

TRIP OVERVIEW
Duration: [X] days
Total Budget: [amount in their currency] for [number] people  
Travel Style: [budget/mid-range/luxury]
Best For: [activities they mentioned]

DAY 1: [Location] - [Main Activity]
Morning (9:00 AM): [Specific activity] - Cost: [amount in their currency]
Afternoon (2:00 PM): [Specific activity] - Cost: [amount in their currency]  
Evening (7:00 PM): [Specific activity] - Cost: [amount in their currency]
Accommodation: [Hotel name/type] - Cost: [amount in their currency]/night
Meals: Breakfast, Lunch, Dinner - Cost: [amount in their currency]
Daily Total: [amount in their currency]

DAY 2: [Location] - [Main Activity]
[Same format for each day]

BUDGET BREAKDOWN
Accommodation: [amount in their currency] ([X] nights)
Activities & Tours: [amount in their currency]
Meals: [amount in their currency] ([X] days)  
Transportation: [amount in their currency]
Permits/Fees: [amount in their currency]
Miscellaneous: [amount in their currency]
TOTAL: [amount in their currency] (Within your [budget in their currency] budget - GUARANTEED)

WHAT'S INCLUDED
- All activities mentioned
- [X] nights accommodation
- All transportation
- [specific inclusions]

How does this look? Say 'perfect' or 'done' when you're ready for me to analyze the internet and find the best real-time recommendations with images and location maps!

**CRITICAL PLANNING RULES:**
1. **DEEP ANALYSIS FIRST**: Research everything about their destinations before planning
2. **CURRENCY SMART**: Understand both USD ($) and Nepali Rupees (Rs./NPR). Convert when needed (1 USD ≈ 130-135 NPR)
3. **BUDGET GUARANTEE**: Final total MUST be under their budget in their currency - no exceptions
4. **EXACT DAYS**: Create exactly the number of days the tourist specified
5. **REALISTIC COSTS**: Use actual current Nepal prices in the currency they provided
6. **COMPLETE RESEARCH**: Know weather, transportation, activities, costs, permits for each location
7. **NO MARKDOWN**: Never use symbols like *, #, ## - use plain text formatting only
8. **TOTAL ACCURACY**: All numbers must add up perfectly in their currency

Current conversation state: ${state}`;

    if (state === 'planning') {
      return basePrompt + `\n\nYou are currently gathering information. Ask relevant questions about their trip preferences.`;
    } else if (state === 'confirming') {
      return basePrompt + `\n\nYou have created a trip plan. Present it clearly with:
- Day-by-day itinerary
- Accommodation suggestions
- Activity recommendations
- Transportation details
- Budget breakdown
- Cultural tips
Then ask if they'd like to proceed or make changes.`;
    } else if (state === 'executing') {
      return basePrompt + `\n\nThe user has confirmed. Now provide:
- Specific booking recommendations with links (if available)
- Contact information for hotels/guides
- Detailed packing list
- Emergency contacts
- Final tips and reminders`;
    }
    return basePrompt;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;


    const userMessage = { role: 'user', content: input };
    const userInput = input;
    
    // Trigger animation on first message
    if (!hasStarted) {
      if (isInitialMessageProcessing) return;
      isInitialMessageProcessing = true;

      setHasStarted(true);
      setShowInitialAnimation(false);
      setMessages([userMessage]);
      setInput('');
      setIsLoading(true);
      
      processMessage(userInput, [userMessage]).finally(() => {
        isInitialMessageProcessing = false;
      });
      return;
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    await processMessage(userInput, messages.concat(userMessage));
  };

  const processMessage = async (userInput, currentMessages) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      // Build conversation history
      const conversationHistory = currentMessages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({
        history: conversationHistory,
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.75,
        },
      });

      let systemPrompt = generateSystemPrompt(conversationState);

      if (hasRespondedToQuery) {
        const messageCount = currentMessages.length;
        const userMessages = currentMessages.filter(msg => msg.role === 'user').length;
        const lastUserMessage = currentMessages.filter(msg => msg.role === 'user').slice(-1)[0]?.content || '';
        
        const allUserMessages = currentMessages.filter(msg => msg.role === 'user').map(msg => msg.content).join(' ');
        
        if (userMessages >= 3) {
          systemPrompt += `\n\n**CONTEXT: You've had several exchanges. ANALYZE ALL their previous messages: "${allUserMessages}". DO NOT repeat any questions they already answered. 

**BEFORE CREATING A PLAN, YOU MUST HAVE:**
- Number of days
- Total budget (in USD or NPR)
- Travel interests/activities
- Number of people traveling
- Travel dates or time of year

If you're missing ANY of these, ask for what's missing in a friendly way. ONLY create the plan when you have ALL this information. When ready to create the plan, FIRST say "Awesome! Let me plan your trip..." or "Perfect! Creating your trip plan now..." then create the complete trip plan using the MANDATORY FORMAT (NO SYMBOLS).`;
        } else if (userMessages >= 2) {
          systemPrompt += `\n\n**CONTEXT: They've told you: "${allUserMessages}". NEVER repeat questions they already answered. 

**ESSENTIAL INFO NEEDED TO CREATE A PLAN:**
- Number of days
- Total budget (in USD or NPR)
- Travel interests/activities
- Number of people traveling
- Travel dates or time of year

Check what you have vs what you need. If you're missing information, ask for it naturally. ONLY when you have ALL essential info should you say "Great! Let me create your perfect trip plan..." and then create the complete trip plan using the MANDATORY FORMAT (NO SYMBOLS).`;
        } else {
          systemPrompt += `\n\n**CONTEXT: They said: "${lastUserMessage}". Ask ALL essential questions in a NUMBERED VERTICAL LIST with line breaks between each question. MANDATORY FORMAT:

Great choice! To plan the perfect trip, I need:

1. How many days do you have total?
2. What's your budget (USD or NPR)?
3. What activities interest you most?
4. How many people are traveling?
5. When are you planning to go?

CRITICAL: Each question MUST be on its own line with a line break after each number. NO PARAGRAPH FORMAT.`;
        }
      }
      const fullPrompt = `${systemPrompt}\n\n**FORMATTING: NO MARKDOWN SYMBOLS. Use plain text only. When asking questions, put each numbered question on its own separate line with line breaks between them. NEVER put multiple questions in one paragraph.**\n\nUser message: ${userInput}`;

      const result = await chat.sendMessage(fullPrompt);
      const response = await result.response;
      let text = response.text();
      
      // Check if AI is creating a trip plan by detecting planning keywords in its response
      const isPlanningResponse = /^(Perfect!|Great!|Awesome!|Excellent!)\s*(Let me create|I'm planning|Creating|Let me design|I'll create|I'll plan)/i.test(text);
      
      // If AI decided to create a plan, show the planning message first, then the plan
      if (isPlanningResponse) {
        // Extract the planning message from AI's response
        const planningMatch = text.match(/^(.*?\.{3})/);
        const planningMessage = planningMatch ? planningMatch[1] : "Perfect! Creating your trip plan now...";
        
        // Show planning message first
        setMessages(prev => [...prev, { role: 'assistant', content: planningMessage }]);
        
        // Small delay to show the planning message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Remove the planning message from the actual response
        text = text.replace(/^(Perfect!|Great!|Awesome!|Excellent!)\s*(Let me create|I'm planning|Creating|Let me design|I'll create|I'll plan).{0,100}\.{3}\s*/i, '');
      }

      // Post-process to remove repetitive sentences
      const sentences = text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=[.?!])\s+/);
      const uniqueSentences = [];
      const seenStarts = new Set();

      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (trimmedSentence.length === 0) continue;

        // Get the first 10 words as a key
        const key = trimmedSentence.split(/\s+/).slice(0, 10).join(' ').toLowerCase();

        if (!seenStarts.has(key)) {
          uniqueSentences.push(trimmedSentence);
          seenStarts.add(key);
        }
      }
      text = uniqueSentences.join(' ');

      // Remove asterisks from formatting
      text = text.replace(/\*\*/g, '**').replace(/\*([^*]+)\*/g, '$1');

      // Mark that the initial query has been responded to
      if (!hasRespondedToQuery) {
        setHasRespondedToQuery(true);
      }

      // Check if user confirmed the trip plan - but only if we have a complete plan
      const userInputLower = userInput.toLowerCase();
      const confirmationKeywords = ['done', 'lets do this', 'let\'s do this', 'looks good', 'perfect', 'yes', 'proceed', 'book it', 'go ahead', 'satisfied', 'ready', 'finalize'];
      
      // Only proceed to recommendations if we have a detailed trip plan
      const hasDetailedPlan = (text.toLowerCase().includes('day 1') || 
                               text.toLowerCase().includes('day one') ||
                               text.toLowerCase().includes('your') && text.toLowerCase().includes('day') && text.toLowerCase().includes('adventure')) && 
                             (text.toLowerCase().includes('budget breakdown') ||
                              text.toLowerCase().includes('total:') ||
                              text.toLowerCase().includes('guaranteed') ||
                              text.includes('Rs.') || text.includes('$')) &&
                             text.length > 300; // Ensure it's a substantial response
      
      if (confirmationKeywords.some(keyword => userInputLower.includes(keyword)) && hasDetailedPlan) {
        // Add confirmation message and show recommendation card
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Perfect! I'm now doing deep analysis of your entire trip plan across the internet - searching Google, social media, travel websites, and real-time data. I'll show you live recommendations, images, and a location map. This comprehensive analysis will take just a moment..." 
        }]);
        
        setShowRecommendationCard(true);
        
        // Call the new real-time analysis API
        try {
          console.log('Calling API with conversation history:', currentMessages);
          const response = await fetch('http://localhost:5000/api/plan-trip', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationHistory: currentMessages.map(msg => ({
                role: msg.role,
                content: msg.content
              }))
            })
          });

          console.log('API Response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('Real-time recommendations generated:', result);
            
            // Navigate with comprehensive data
            setTimeout(() => {
              navigate('/booking', { 
                state: { 
                  tripPlan: text,
                  realTimeData: result.data,
                  conversationHistory: currentMessages
                } 
              });
            }, 3000);
          } else {
            const errorText = await response.text();
            console.error('Failed to generate real-time recommendations:', response.status, errorText);
            // Fallback to original flow
            setTimeout(() => {
              navigate('/booking', { state: { tripPlan: text } });
            }, 2000);
          }
        } catch (error) {
          console.error('Error calling real-time analysis API:', error);
          // Fallback to original flow
          setTimeout(() => {
            navigate('/booking', { state: { tripPlan: text } });
          }, 2000);
        }
        return;
      } else if (confirmationKeywords.some(keyword => userInputLower.includes(keyword)) && !hasDetailedPlan) {
        // User wants to proceed but we don't have a complete plan yet
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'd love to help you with recommendations, but I need to create a complete trip plan first. Let me ask a few more questions to give you the best possible itinerary with specific days, activities, and recommendations. What's your budget range and how many days are you planning to stay?" 
        }]);
        return;
      }

      // Detect conversation state changes
      const lowerText = text.toLowerCase();
      if (lowerText.includes('here') && lowerText.includes('plan') || lowerText.includes('itinerary')) {
        setConversationState('confirming');
      } else if (lowerText.includes('proceed') || lowerText.includes('book')) {
        setConversationState('executing');
      } else if (conversationState === 'initial') {
        setConversationState('planning');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, I'm having trouble connecting right now. Please try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`chat-page ${showInitialAnimation ? 'initial' : 'active'}`}>
      {showInitialAnimation && (
        <div className="chat-initial-overlay">
          <h1 className="chat-initial-title">
            Your Journey to Nepal<br />
            Starts Here
          </h1>
        </div>
      )}
      
      <div className={`chat-sidebar ${hasStarted ? 'visible' : 'hidden'}`}>
        <div className="chat-sidebar-header">
          <button className="new-chat-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New chat
          </button>
        </div>
        <div className="chat-history">
          <div className="chat-section-title">Recent Trips</div>
          <div className="chat-history-item active">Nepal Adventure Planning</div>
        </div>
      </div>

      <div className="chat-main">
        {hasStarted && (
          <div className="chat-header">
            <div className="chat-model-info">
              <span className="chat-title">Nepal Travel Planner</span>
            </div>
          </div>
        )}

        <div className={`chat-messages ${!hasStarted ? 'centered' : ''}`}>
          {/* Show recommendations button if returning from booking */}
          {preserveChat && returnedTripPlan && (
            <div className="recommendations-banner">
              <div className="banner-content">
                <span className="banner-icon">🎯</span>
                <span className="banner-text">Your personalized recommendations are ready!</span>
                <button 
                  className="view-recommendations-banner-btn"
                  onClick={() => navigate('/booking', { state: { tripPlan: returnedTripPlan } })}
                >
                  View Recommendations
                </button>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-avatar">
                {message.role === 'assistant' ? (
                  <div className="avatar-ai">
                    {dotLottieReady ? (
                      <dotlottie-player
                        src="https://assets-v2.lottiefiles.com/a/880268a8-ff14-11ef-9a16-4f0b1d76a82e/Th8Hg3NvB9.lottie"
                        background="transparent"
                        speed="1"
                        width="36"
                        height="36"
                        renderer="svg"
                        loop
                        autoplay
                      ></dotlottie-player>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <rect x="6" y="8" width="12" height="10" rx="2" fill="#E76F51"/>
                        <rect x="8" y="4" width="8" height="5" rx="1.5" fill="#E76F51"/>
                        <circle cx="10" cy="11" r="1.5" fill="white"/>
                        <circle cx="14" cy="11" r="1.5" fill="white"/>
                        <rect x="9" y="14" width="6" height="1.5" rx="0.75" fill="white"/>
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className="avatar-user">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-text">
                  {message.role === 'assistant' ? (
                    <ReactMarkdown 
                      components={{
                        h1: ({node, ...props}) => <h1 style={{fontSize: '20px', fontWeight: 'bold', margin: '12px 0', color: '#2C3E50'}} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{fontSize: '18px', fontWeight: 'bold', margin: '10px 0', color: '#E76F51'}} {...props} />,
                        strong: ({node, ...props}) => <strong style={{fontWeight: '600', color: '#2C3E50'}} {...props} />,
                        p: ({node, ...props}) => <p style={{margin: '8px 0', lineHeight: '1.6'}} {...props} />,
                        ul: ({node, ...props}) => <ul style={{margin: '8px 0', paddingLeft: '20px'}} {...props} />,
                        li: ({node, ...props}) => <li style={{margin: '4px 0', lineHeight: '1.5'}} {...props} />
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-avatar">
                <div className="avatar-ai">
                  {dotLottieReady ? (
                    <dotlottie-player
                      src="https://assets-v2.lottiefiles.com/a/880268a8-ff14-11ef-9a16-4f0b1d76a82e/Th8Hg3NvB9.lottie"
                      background="transparent"
                      speed="1"
                      width="36"
                      height="36"
                      renderer="svg"
                      loop
                      autoplay
                    ></dotlottie-player>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="6" y="8" width="12" height="10" rx="2" fill="#E76F51"/>
                      <rect x="8" y="4" width="8" height="5" rx="1.5" fill="#E76F51"/>
                      <circle cx="10" cy="11" r="1.5" fill="white"/>
                      <circle cx="14" cy="11" r="1.5" fill="white"/>
                      <rect x="9" y="14" width="6" height="1.5" rx="0.75" fill="white"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>


        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              placeholder="Describe your dream Nepal trip..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              rows="1"
            />
            <div className="chat-input-actions">
              <button 
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button 
                className="send-btn" 
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
