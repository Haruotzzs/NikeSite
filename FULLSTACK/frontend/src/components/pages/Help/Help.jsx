import "./help.css"; // Створіть окремий файл стилів або використовуйте bag-card.css
import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import { askGemini } from "../../../server/aiasist.js";

function Help() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", text: "Привіт! Я твій Nike AI асистент. Чим я можу допомогти вам сьогодні?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: "user", text: chatInput };
    setMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsTyping(true);

    // Для сторінки Help ми не передаємо вміст кошика, а просто спілкуємося
    const prompt = `Ти — експерт підтримки Nike. Дай відповідь на питання: ${chatInput}`;

    try {
      const aiResponse = await askGemini(prompt);
      setMessages(prev => [...prev, { role: "ai", text: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", text: "Вибачте, виникла помилка." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Container>
      <div className="help-page">
        <h1 className="help-title">GET HELP</h1>
        
        <div className="ai-chat-container">
          <div className="ai-chat-header">
            <span className="material-symbols-outlined">smart_toy</span>
            <h3>Nike AI Support</h3>
          </div>
          
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {isTyping && <div className="chat-bubble ai typing">...</div>}
          </div>

          <form className="ai-chat-input-area" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="How can we help you?" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit">
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}

export default Help;