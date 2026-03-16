import { GoogleGenerativeAI } from "@google/generative-ai";

/*
API ключі
*/
const API_KEYS = [
  process.env.REACT_APP_GEMINI_AI_KEY,
  process.env.REACT_APP_GEMINI_AI_KEY_ALT_1,
  process.env.REACT_APP_GEMINI_AI_KEY_ALT_2,
  process.env.REACT_APP_GEMINI_AI_KEY_ALT_3,
  process.env.REACT_APP_GEMINI_AI_KEY_ALT_4
].filter(Boolean);

/*
Поточний активний ключ
*/
let currentKeyIndex = 0;

/*
Створюємо моделі один раз
*/
const models = API_KEYS.map((key) => {

  const genAI = new GoogleGenerativeAI(key);

  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",

    systemInstruction: `
Ти — офіційний консультант Nike.

ПРАВИЛА ОФОРМЛЕННЯ:
- Жодних смайлів.
- Кожна нова думка з нового рядка.
- Для списків використовуй дефіс (-).
- Використовуй подвійний перенос рядка (\\n\\n).
`
  });

});

/*
Допоміжна функція затримки
*/
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
Основна функція
*/
export const askGemini = async (userPrompt) => {

  if (!models.length) {
    return "Помилка: API ключі відсутні.";
  }

  let attempts = 0;

  while (attempts < models.length) {

    const keyNumber = currentKeyIndex + 1;
    const model = models[currentKeyIndex];

    try {

      console.log(`Використовується ключ #${keyNumber}`);

      const result = await model.generateContent(userPrompt);

      const text = result.response.text();

      return text + `\n\n---\n[Технічна інфо: ключ #${keyNumber}]`;

    } catch (error) {

      const status = error?.status || error?.response?.status;

      /*
      Якщо ліміт перевищено
      */
      if (status === 429 || error.message?.includes("429")) {

        console.warn(`Ключ #${keyNumber} перевищив ліміт.`);

        attempts++;

        currentKeyIndex = (currentKeyIndex + 1) % models.length;

        /*
        невелика затримка щоб API не банив
        */
        await sleep(1200);

        continue;
      }

      /*
      Інші помилки
      */
      console.error("Gemini error:", error);

      return "Сталася помилка під час обробки запиту.";
    }
  }

  return "На жаль, усі ключі перевищили ліміт запитів. Спробуйте пізніше.";
};