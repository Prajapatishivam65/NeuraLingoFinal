# 🧠 NeuroLingo - AI Mock Interviewing Platform 🌐

**NeuroLingo** is an advanced AI-powered mock interviewing platform designed to revolutionize interview preparation. With real-time feedback, multilingual support, and intelligent analysis, users can confidently practice for interviews, regardless of language or background.

## 🚀 Key Features

- 🎙️ **AI-Powered Mock Interviews:** Realistic interview simulations powered by Google Gemini AI.
- 🌍 **Multilingual Support:** Practice interviews in multiple languages.
- 📝 **Real-Time Feedback:** Instant AI-driven feedback on clarity, structure, and relevance.
- 🎥 **Video & Audio Support:** Record responses via audio or video for immersive practice.
- 🔍 **Customizable Interview Sets:** Select questions based on job roles, industries, and skill levels.
- 📊 **Performance Insights:** Detailed analytics and improvement suggestions.

---

## ⚙️ Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Video Calling:** React Webcam
- **AI Models:** Google Generative AI (Gemini 1.5 flash)
- **Database:** postgreSQL
- **Authentication:** Clerk

---

## 📦 Installation

### 1. **Clone the Repository**

```bash
git clone https://github.com/prajapatishivam65/neurolingofinal.git
cd neurolingo
```

### 2. **Install Dependencies**

```bash
npm install
# or
yarn install
```

### 3. **Set Up Environment Variables**

Create a `.env` file in the root directory and add:

```
env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_test_
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_DRIZZLE_DB_URL
GEMINI_API_KEY
NEXT_PUBLIC_ASSEMBLYAI_API_KEY
```

### 4. **Run the Development Server**

```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the app.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

---

## 🛡️ License

## This project is licensed under the [MIT License](LICENSE)

🚀 **Prepare smarter, interview better, and succeed with NeuroLingo!** 🧠💼
