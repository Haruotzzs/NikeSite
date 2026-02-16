import { GoogleGenerativeAI } from "@google/generative-ai";

export const askGemini = async (prompt) => {
  // 1. Ваш ключ (обов'язково в лапках)
  const API_KEY = "AIzaSyD0tVg-FWZ-oOJN7b6jAtRrwjH9tvxctIc";

  const genAI = new GoogleGenerativeAI(API_KEY);

  try {
    // Використовуємо "gemini-1.5-flash-latest" — це найбільш стабільний шлях
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Додаємо невеликі налаштування, щоб відповіді були чіткішими
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;

  } catch (error) {
    console.error("Повна помилка Gemini:", error);

    // Якщо все ж таки 404, спробуємо модель 1.0 Pro
    if (error.message.includes("404")) {
      try {
        const backupModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await backupModel.generateContent(prompt);
        return result.response.text();
      } catch (inner) {
        return "Помилка: Модель не знайдена. Перевірте доступність у вашому регіоні.";
      }
    }

    return `Помилка: ${error.message}`;
  }
};