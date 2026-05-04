
```javascript
#!/usr/bin/env node

import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateQuizQuestions(topic, difficulty) {
  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate 5 multiple choice quiz questions about "${topic}" at ${difficulty} difficulty level. 
Format each question exactly like this:
Q: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]

Make sure to include the answer key at the end.`,
      },
    ],
  });

  return message.content[0].text;
}

function parseQuizQuestions(text) {
  const questions = [];
  const lines = text.split("\n");
  let currentQuestion = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("Q:")) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        question: line.substring(2).trim(),
        options: {},
        answer: null,
      };
    } else if (currentQuestion && line.match(/^[A-D]\)/)) {
      const option = line[0];
      currentQuestion.options[option] = line.substring(3).trim();
    } else if (line.startsWith("Answer:")) {
      if (currentQuestion) {
        currentQuestion.answer = line.substring(7).trim().toUpperCase();
      }
    }
  }

  if (currentQuestion && currentQuestion.answer) {
    questions.push(currentQuestion);
  }

  return questions.filter((q) => q.answer && Object.keys(q.options).length === 4);
}

async function askQuestion(question, questionNumber, totalQuestions) {
  console.log(`\n--- Question ${questionNumber}/${totalQuestions} ---`);
  console.log(`\n${question.question}`);
  console.log(`A) ${question.options.A}`);
  console.log(`B) ${question.options.B}`);
  console.log(`C) ${question.options.C}`);
  console.log(`D) ${question.options.D}`);

  let answer = "";
  while (!["A", "B", "C", "D"].includes(answer.toUpperCase())) {
    answer = await question_prompt("Your answer (A/B/C/D): ");
    if (!["A", "B", "C", "D"].includes(answer.toUpperCase())) {
      console.log("Please enter A, B, C, or D");
    }
  }

  return answer.toUpperCase();
}

function question_prompt(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function calculateScore(userAnswers, questions) {
  let correctCount = 0;
  const results = [];

  for (let i = 0; i < questions.length; i++) {
    const isCorrect = userAnswers[i] === questions[i].answer;
    if (isCorrect) {
      correctCount++;
    }

    results.push({
      question: questions[i].question,
      userAnswer: userAnswers[i],
      correctAnswer: questions[i].answer,
      isCorrect,
    });
  }

  return {
    score: correctCount,
    total: questions.length,
    percentage: Math.round((correctCount / questions.length) * 100),
    results,
  };
}

function displayResults(scoreData) {
  console.log("\n========== QUIZ RESULTS ==========");
  console.log(`Score: ${scoreData.score}/${scoreData.total}`);
  console.log(`Percentage: ${scoreData.percentage}%`);

  let grade = "F";
  if (scoreData.percentage >= 90) grade = "A";
  else if (scoreData.percentage >= 80) grade = "B";
  else if (scoreData.percentage >= 70) grade = "C";
  else if (scoreData.percentage >= 60) grade = "D";

  console.log(`Grade: ${grade}`);

  console.log("\n========== DETAILED RESULTS ==========");
  scoreData.results.forEach((result, index) => {
    const status = result.isCorrect ? "✓ CORRECT" : "✗ INCORRECT";
    console.log(`\nQuestion ${index + 1}: ${status}`);
    console.log(`Your answer: ${result.userAnswer}`);
    if (!result.isCorrect) {
      console.log(`Correct answer: ${result.correctAnswer}`);
    }
  });
}

async function runQuiz() {
  console.log("========== GENERAL KNOWLEDGE QUIZ ==========\n");

  const topics = [
    "History",
    "Science",
    "Geography",
    "Literature",
    "Technology",
  ];
  console.log("Available topics:");
  topics.forEach((topic, index) => {
    console.log(`${index + 1}. ${topic}`);
  });

  const topicChoice = await question("Select topic (1-5): ");
  const topicIndex = parseInt(topicChoice) - 1;

  if (topicIndex < 0 || topicIndex >= topics.length) {
    console.log("Invalid selection");
    rl.close();
    return;
  }

  const selectedTopic = topics[topicIndex];
  const difficulties = ["Easy", "