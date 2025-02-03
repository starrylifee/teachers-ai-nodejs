const express = require('express');
const { OpenAI } = require('openai');
const { Client } = require('@notionhq/client');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(express.json());

// Load API keys from environment variables
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Check if API keys are available
if (!OPENAI_API_KEY || !NOTION_API_KEY) {
  console.error('Missing API keys. Please check your .env file.');
  process.exit(1);
}

// Initialize OpenAI and Notion clients
const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
const notion = new Client({ auth: NOTION_API_KEY });

// Notion database IDs from environment variables
const DATABASES = {
  vision: process.env.NOTION_DATABASE_ID_VISION,
  text: process.env.NOTION_DATABASE_ID_TEXT,
  image: process.env.NOTION_DATABASE_ID_IMAGE,
  chatbot: process.env.NOTION_DATABASE_ID_CHATBOT,
};

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

/**
 * Helper: Generate student view using OpenAI  
 * promptType: "vision", "text", "chatbot" (image은 추후 별도 처리)
 */
const generateStudentView = async (teacherPrompt, promptType) => {
  let systemMessage, userMessage;
  switch(promptType) {
    case "vision":
      systemMessage = "당신은 교사가 만든 vision 프롬프트의 제목을 간단한 단어로 변환하는 AI 조교입니다.";
      userMessage = `다음 vision 프롬프트의 제목을 지어주고, 이 프롬프트와 인공지능 모델을 이용하기 위해 학생이 입력해야할 이미지를 말해주세요.: ${teacherPrompt}`;
      break;
    case "text":
      systemMessage = "당신은 교사가 만든 text generation 프롬프트의 제목을 간단한 단어로 변환하는 AI 조교입니다.";
      userMessage = `다음 text generation 프롬프트의 제목을 지어주고, 이 프롬프트와 인공지능 모델을 이용하기 위해 학생이 입력해야할 텍스트를 말해주세요.: ${teacherPrompt}`;
      break;
    case "chatbot":
      systemMessage = "당신은 교사가 만든 chatbot 프롬프트의 제목을 간단한 단어로 변환하는 AI 조교입니다.";
      userMessage = `다음 chatbot 프롬프트의 제목을 지어주고, 이 프롬프트와 인공지능 모델을 이용하기 위해 학생이 입력해야할 메시지를 말해주세요.: ${teacherPrompt}`;
      break;
    default:
      // 기본: vision 메시지 사용
      systemMessage = "당신은 교사가 만든 프롬프트의 제목을 간단한 단어로 변환하는 AI 조교입니다.";
      userMessage = `다음 프롬프트의 제목을 지어주고, 이 프롬프트와 인공지능 모델을 이용하기 위해 학생이 입력해야할 값을 말해주세요.: ${teacherPrompt}`;
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating student view:", error.message);
    throw new Error("Failed to generate student view");
  }
};

// Route: Save data to DB (hidden implementation)
app.post('/save-to-db', async (req, res) => {
  const { activityCode, teacherPrompt, email, password, promptType, adjectives } = req.body;
  console.log('Request received with data:', req.body);

  const databaseId = DATABASES[promptType];
  if (!databaseId) {
    console.error('Invalid prompt type:', promptType);
    return res.status(400).json({ success: false, error: 'Invalid prompt type' });
  }

  try {
    // 중복 활동코드 체크
    const duplicateQuery = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'activity_code',
        rich_text: {
          equals: activityCode,
        },
      },
    });

    if (duplicateQuery.results.length > 0) {
      console.error(`Duplicate activity code found: ${activityCode}`);
      return res.status(400).json({ success: false, error: 'Activity code already exists. Please use a unique code.' });
    }

    const currentDate = new Date().toISOString();

    let properties;
    if (promptType === "image") {
      // 이미지 타입은 page, date, prompt, activity_code, email, password, adjectives로 이루어짐 (모두 rich_text)
      properties = {
        activity_code: { rich_text: [{ text: { content: activityCode } }] },
        prompt: { rich_text: [{ text: { content: teacherPrompt } }] },
        email: { rich_text: [{ text: { content: email } }] },
        password: { rich_text: [{ text: { content: password } }] },
        adjectives: { rich_text: [{ text: { content: adjectives } }] },
        page: { rich_text: [{ text: { content: promptType } }] },
        date: { rich_text: [{ text: { content: currentDate } }] },
      };
    } else {
      const studentView = await generateStudentView(teacherPrompt, promptType);
      properties = {
        activity_code: { rich_text: [{ text: { content: activityCode } }] },
        prompt: { rich_text: [{ text: { content: teacherPrompt } }] },
        email: { rich_text: [{ text: { content: email } }] },
        password: { rich_text: [{ text: { content: password } }] },
        date: { rich_text: [{ text: { content: currentDate } }] },
        page: { rich_text: [{ text: { content: promptType } }] },
        student_view: { rich_text: [{ text: { content: studentView } }] },
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: properties,
    });
    console.log('Page created in Notion:', response);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving to DB:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save prompt' });
  }
});


// Route: Generate Vision AI prompt (인공지능 도움받기 - Vision 전용)
app.post('/generate-vision-ai-prompt', async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }
  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 Vision API를 사용하여 교육 목적으로 프롬프트를 만드는 AI 도우미입니다."
        },
        {
          role: "user",
          content: `프롬프트의 주제는: ${topic}입니다. 이 주제를 바탕으로 창의적이고 교육적인 이미지 분석 프롬프트를 생성해 주세요.`
        }
      ],
    });
    const aiPrompt = response.choices[0].message.content.trim();
    res.json({ success: true, prompt: aiPrompt });
  } catch (error) {
    console.error("Error generating AI prompt:", error.message);
    res.status(500).json({ success: false, error: "Failed to generate AI prompt" });
  }
});

// Route: Search prompts by password
app.post('/search-prompts', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }
  try {
    // *** 모든 데이터베이스(vision, text, image, chatbot)를 순회하여 검색하도록 수정 ***
    const dbKeys = Object.keys(DATABASES); // ["vision", "text", "image", "chatbot"]
    let allPrompts = [];
    for (const key of dbKeys) {
      const databaseId = DATABASES[key];
      const response = await notion.databases.query({
        database_id: databaseId,
        filter: {
          property: 'password',
          rich_text: { equals: password },
        },
      });
      const prompts = response.results.map((page) => {
        // *** 각 페이지에 저장된 prompt type이 있다면 사용하고, 없으면 현재 key를 사용 (image의 경우 student_view가 없으므로 adjectives를 대체) ***
        const promptType = page.properties.page?.rich_text?.[0]?.text?.content || key;
        return {
          id: page.id,
          promptType: promptType, // Prompt Type 추가
          activityCode: page.properties.activity_code?.rich_text?.[0]?.text?.content || '',
          teacherPrompt: page.properties.prompt?.rich_text?.[0]?.text?.content || '',
          studentView: promptType === "image"
            ? (page.properties.adjectives?.rich_text?.[0]?.text?.content || '')
            : (page.properties.student_view?.rich_text?.[0]?.text?.content || ''),
          date: page.properties.date?.rich_text?.[0]?.text?.content || '' // *** 날짜 필드 추가 ***
        };
      });
      allPrompts.push(...prompts);
    }
    // *** 날짜(date)를 기준으로 내림차순 정렬 (최신 입력값이 위로) ***
    allPrompts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ success: true, prompts: allPrompts });
  } catch (error) {
    console.error('Error searching prompts:', error.message);
    res.status(500).json({ success: false, error: 'Failed to search prompts' });
  }
});


// Route: Delete prompt (archive the page)
app.post('/delete-prompt', async (req, res) => {
  const { id } = req.body;
  console.log("Delete prompt request received for id:", id);
  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }
  try {
    const response = await notion.pages.update({
      page_id: id,
      archived: true,
    });
    console.log("Notion deletion response:", response);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete prompt' });
  }
});

// Route: Update prompt
app.post('/update-prompt', async (req, res) => {
  const { id, activityCode, teacherPrompt, email, password, promptType } = req.body;
  console.log("Update prompt request received for id:", id);
  if (!id) {
    return res.status(400).json({ success: false, error: 'ID is required' });
  }
  try {
    let properties;
    if (promptType === "image") { // *** 이미지 타입일 경우 ***
      let adjectivesInput = req.body.adjectives || "";
      // *** 쉼표로 구분된 문자열을 배열로 변환 후 JSON 문자열로 저장 (빈 문자열이면 빈 배열 처리) ***
      const adjectivesArray = adjectivesInput.trim() 
        ? adjectivesInput.split(",").map(s => s.trim()) 
        : [];
      const adjectivesJSON = JSON.stringify(adjectivesArray);
      
      properties = {
        activity_code: { rich_text: [{ text: { content: activityCode } }] },
        prompt: { rich_text: [{ text: { content: teacherPrompt } }] },
        email: { rich_text: [{ text: { content: email } }] },
        password: { rich_text: [{ text: { content: password } }] },
        adjectives: { rich_text: [{ text: { content: adjectivesJSON } }] } // *** 업데이트된 형식 저장 ***
      };
    } else {
      // image가 아닌 경우는 student_view를 다시 생성하여 업데이트
      const studentView = await generateStudentView(teacherPrompt, promptType);
      properties = {
        activity_code: { rich_text: [{ text: { content: activityCode } }] },
        prompt: { rich_text: [{ text: { content: teacherPrompt } }] },
        email: { rich_text: [{ text: { content: email } }] },
        password: { rich_text: [{ text: { content: password } }] },
        // "page" 프로퍼티 업데이트 제거 (404 오류 방지)
        student_view: { rich_text: [{ text: { content: studentView } }] },
      };
    }

    const response = await notion.pages.update({
      page_id: id,
      properties: properties,
    });
    console.log("Notion update response:", response);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating prompt:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update prompt' });
  }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
