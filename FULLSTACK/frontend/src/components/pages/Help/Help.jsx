import "./help.css";
import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";

// --- CUSTOM UTILS & FIREBASE ---
import { askGemini } from "../../../server/aiasist.js"; // Custom wrapper for the Gemini API
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

/**
 * SYSTEM_CONTEXT: This is the "brain" of the AI.
 * It sets the personality (Expert Support), rules (No emojis, Professional tone),
 * and technical constraints (Only use local products, specific link formatting).
 */
const SYSTEM_CONTEXT = `You are a support expert for an unofficial Nike website.

RULES:
- When searching for products, check the 'tovarClass' section.
- Ask clarifying questions before answering fully (size, color preferences).
- Provide links ONLY in the format: <Link>http://localhost:3000/product/(id)</Link>.
- Distinguish between Men's and Women's clothing (MENS/WOMENS prefix).
- DO NOT use external internet knowledge; rely only on the local product directory.
- No emojis allowed.
- Start every thought on a new line.
- Start lists with a hyphen (-).
- Double line breaks between logical blocks.
- Professional and energetic tone.
- If a product is out of stock, suggest an alternative of the same class/type.
`;

function Help() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]); // Array of {role: "user" | "ai", text: string}
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  /**
   * PARSER: renderMessage
   * This converts the AI's plain text response into JSX.
   * It specifically looks for the <Link>...</Link> tags defined in SYSTEM_CONTEXT
   * and turns them into clickable <a> tags.
   */
  const renderMessage = (text) => {
    const parts = text.split(/(<Link>.*?<\/Link>)/g);

    return parts.map((part, index) => {
      if (part.startsWith("<Link>")) {
        const url = part.replace("<Link>", "").replace("</Link>", "");
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ai-link"
          >
            {url}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // --- UI HELPERS ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  /**
   * FIREBASE: saveMessage
   * Persists the conversation to Firestore so the user doesn't lose history
   * if they refresh the page.
   */
  const saveMessage = async (uid, role, text) => {
    try {
      await addDoc(collection(db, "chat_history"), {
        uid: uid,
        role: role,
        text: text,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Firestore persistence error:", err);
    }
  };

  /**
   * INITIALIZATION & HISTORY LOAD
   * 1. Checks if user is logged in.
   * 2. Fetches existing chat history from Firestore.
   * 3. If history is empty, triggers the AI's first greeting.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);

      try {
        const q = query(
          collection(db, "chat_history"),
          where("uid", "==", user.uid),
          orderBy("timestamp", "asc")
        );

        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(doc => doc.data());

        if (history.length === 0) {
          // Default Welcome Message
          const greetingText =
`Welcome to Nike Support.

I am your personal consultant for product selection and site navigation.

- Help with choosing products
- Explaining site features
- Finding specific items`;

          const greeting = { role: "ai", text: greetingText };
          setMessages([greeting]);
          await saveMessage(user.uid, "ai", greetingText);
        } else {
          // Load stored history
          const formatted = history.map(h => ({
            role: h.role,
            text: h.text
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  /**
   * MESSAGE HANDLER
   * 1. Updates UI with user input.
   * 2. Saves user input to Firestore.
   * 3. Bundles context (last 10 messages) + system prompt.
   * 4. Calls the Gemini API.
   * 5. Updates UI/Firestore with AI response.
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    const userText = chatInput;
    const userMessage = { role: "user", text: userText };

    setMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsTyping(true);

    // Persist user message
    await saveMessage(currentUser.uid, "user", userText);

    // Prepare context for the AI (limited history for performance)
    const chatHistoryContext = messages
      .slice(-10)
      .map(msg => `${msg.role === "ai" ? "AI" : "Client"}: ${msg.text}`)
      .join("\n\n");

    const fullPrompt = `${SYSTEM_CONTEXT}

Previous Dialog:
${chatHistoryContext}

New Client Question:
${userText}`;

    try {
      // API CALL
      const aiResponse = await askGemini(fullPrompt);

      const aiMessage = { role: "ai", text: aiResponse };
      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(currentUser.uid, "ai", aiResponse);

    } catch (error) {
      const errMsg = "Sorry, a technical error occurred. Please try again later.";
      setMessages(prev => [...prev, { role: "ai", text: errMsg }]);
      await saveMessage(currentUser.uid, "ai", errMsg);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Container>
      <div className="help-page">
        <h1 className="help-title">GET HELP</h1>

        <div className="ai-chat-container">
          {/* Header */}
          <div className="ai-chat-header">
            <span className="material-symbols-outlined">smart_toy</span>
            <h3>Nike AI Support</h3>
          </div>

          {/* Messages Window */}
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.role}`}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {renderMessage(msg.text)}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="chat-bubble ai typing">
                <span>Analyzing your request</span><span>.</span><span>.</span><span>.</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="ai-chat-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="How can we help you?"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" disabled={isTyping || !chatInput.trim()}>
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}

export default Help;