import "./help.css";
import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";

import Container from "react-bootstrap/Container";
import { askGemini } from "../../../server/aiasist.js";
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
import { useNavigate } from "react-router-dom";


// Системні налаштування для ШІ
const SYSTEM_CONTEXT = `Ти — експерт підтримки не офіційного сайту Nike.

ПРАВИЛА:
- при пошуку товару звертай увагу на розділ tovarClass, постійно став уточнюючі питання не відповідаючи на початкове, проте запамятовуй його за те який розмір колір і тому подібне, надавай посилання у форматі http://localhost:3000/product/(id) чоловічий і жіночий одяг відрізняється приставкою MENS WOMENS у назві, постійно шукай в таблиці продуктів доступні розміри, та ніколи не звертайся до виходу в інтернет (пошук робиться виключно через продукцію бекенду, вмій розрізняти чоловічі жіночі, якщо товару немає в наявності пропонуй альтернативу) заборонено користувачам жінкам видавати чоловічий одяг(з приставкою чоловік)tovarClass.
- не пиши те що ти переглядав директорію і файли, зроби вигляд що ти не знаєш що це
- не надавай інформацію щодо технічної складової сайту, окрім навігації та інформації про продукцію;
- ЗАБОРОНЕНО ЛОГІЧНО ДОПИСУВАТИ ПОСИЛАННЯ (ПОСИЛАННЯ ВСТАВЛЯТИ ШЛЯХОМ КОПІЮВАННЯ ТА ВСТАВЛЕННЯ З РЕПОЗИТОРІЮ, томущо http://localhost:3000/store у проеті може мати посилання http://localhost:3000/find-a-store, а каталог продуктів на головній сторінці http://localhost:3000/)
- для надання інформації щодо наявності товару дозволено звертатись до директорії products.json, яка знаходиться в бекенд частині (відповідь заборонено надавати без попереднього перегляду всього директорія)
-Заборонено вигадувати посилання на localhost (всі потрібні посилання знаходяться в App.jsx), повністю продивись репозиторій якщо маєш намір надання посилання клієнтові
- НІ В ЯКОМУ РАЗІ НЕ НАДАВАЙ РЕАЛЬНІ ПОСИЛАННЯ (без локалхост 3000)
-ПОСИЛАЙСЯ НА МЕТУ КЛІЄНТА ДЛЯ ПОПЕРЕДНЬОГО ПЕРЕГЛЯДУ РЕПОЗИТОРІЯ, 100% ВИПАДКІВ, ТАМ ОПИСАНА ДЕТАЛЬНА ІНФОРМАЦІЯ;
-ДЛЯ НАДАННЯ ПОСИЛАННЯ ЗВЕРТАЙСЯ ДО КОРЕНЕВОГО ФАЙЛУ APP.JSX, footer geader -  ПОСТІЙНО ВІДШТОВХУЙСЯ ВІД НЬОГО; 
- цей сайт не є офіційним тому увага на репозиторій;
- відповідай лише на питання повязані з Nike та навігацією сайту, попередньо звернувшись до репозиторія для отримання технічної інформації;
- перша відповідь в історії має бути привітанням та коротким описом послуг (тех підтримка, допомога з вибором продукції, інформація що до навгації сайту).;
- Жодних смайлів.
- Кожна думка з нового рядка.
- Списки починай з дефіса (-).
- Після логічного блоку роби подвійний перенос рядка.
- Тон професійний та енергійний.
- сайт не підтримує живу технічну підтримку, тому відповідай максимально інформативно та детально, щоб клієнт міг самостійно вирішити питання.

- інформація щодо нащих магазинів находиться на мапі (переглянь попередньо в репозиторії, для надання більш детальної інформації щодо дати роботи яка зазначена адреси та міста), обирай найближчий магазин дивлячись на адрес клієнта, якщо ж його немає попроси заповнити форму в профілі

- репозиторій проекту: https://github.com/Haruotzzs/NikeSite;
- особливо уважно до шляхів вказаних в проекті;
- надавай відповідь щодо адреси використовуючи формат:
<Link>http://localhost:3000/product/1</Link>

інструкція навігації products.json:
всередині файлу наведено багато позицій, спочатку проходимось по класу жінка чито чоловік, тип одягу, потім дивимось наявність кольорів та розмірів, якщо товару немає в наявності пропонуємо альтернативу з тим же класом та типом одягу, але іншим кольором або розміром, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом але іншим типом одягу, якщо ж такого немає пропонуємо альтернативу з тим же класом но іншою категорією товарів (взуття замість кофти), якщо й такої нема вибачайся і кажи що товар відсутній
{ 
посилання на продукт (http://localhost:3000/product/(id)) = його айді в products.json,
      "id": , - найважливіше зформувати посилання з урахуванням id
      tovarName: "" - тут наведена інформація щодо вибору (жіноче - чоловіче), 
      tovarClass: "", взуття кофти, 
      color: "blue", -колір
      tovarPrice: "200", - ціна
      productImg:"https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/83a8294d-258f-4a32-b2e1-3e5383e4ff12/VICTORY+TOUR+4+NRG.png", - ігнорувати
        reviews: [ - інорувати
          { user: "JohnDoe", comment: "Great shoes!", rating: 5 },
          { user: "JaneSmith", comment: "Very comfortable.", rating: 4 }
      ],
    },
`;



function Help() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();


  // Рендер повідомлення з підтримкою <Link>
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


  // Автоскрол
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);


  // Збереження повідомлення
  const saveMessage = async (uid, role, text) => {
    try {
      await addDoc(collection(db, "chat_history"), {
        uid: uid,
        role: role,
        text: text,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Firestore error:", err);
    }
  };


  // Авторизація + історія
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

          const greetingText =
`Вітаємо у службі підтримки Nike.

Я ваш персональний консультант з вибору продукції та навігації сайту.

- допомога з вибором товару
- пояснення функцій сайту
- допомога з пошуком товарів`;

          const greeting = { role: "ai", text: greetingText };

          setMessages([greeting]);

          await saveMessage(user.uid, "ai", greetingText);

        } else {

          const formatted = history.map(h => ({
            role: h.role,
            text: h.text
          }));

          setMessages(formatted);
        }

      } catch (err) {
        console.error("Помилка завантаження історії:", err);
      }
    });

    return () => unsubscribe();

  }, [navigate]);


  // Надсилання повідомлення
  const handleSendMessage = async (e) => {

    e.preventDefault();

    if (!chatInput.trim() || !currentUser) return;

    const userText = chatInput;

    const userMessage = { role: "user", text: userText };

    setMessages(prev => [...prev, userMessage]);

    setChatInput("");

    setIsTyping(true);

    await saveMessage(currentUser.uid, "user", userText);


    const chatHistoryContext = messages
      .slice(-10)
      .map(msg => `${msg.role === "ai" ? "AI" : "Клієнт"}: ${msg.text}`)
      .join("\n\n");


    const fullPrompt = `${SYSTEM_CONTEXT}

Попередній діалог:
${chatHistoryContext}

Нове запитання клієнта:
${userText}`;


    try {

      const aiResponse = await askGemini(fullPrompt);

      const aiMessage = { role: "ai", text: aiResponse };

      setMessages(prev => [...prev, aiMessage]);

      await saveMessage(currentUser.uid, "ai", aiResponse);

    } catch (error) {

      const errMsg = "Вибачте, виникла технічна помилка. Спробуйте пізніше.";

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

          <div className="ai-chat-header">
            <span className="material-symbols-outlined">smart_toy</span>
            <h3>Nike AI Support</h3>
          </div>


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


            {isTyping && (
              <div className="chat-bubble ai typing">
                <span>Thinking longest to give a more spacefully information</span><span>.</span><span>.</span><span>.</span>
              </div>
            )}

            <div ref={messagesEndRef} />

          </div>


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