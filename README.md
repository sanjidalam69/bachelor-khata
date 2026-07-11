# 📒 Bachelor Khata (ব্যাচেলর খাতা)

Bachelor Khata is a premium, modern, and fully responsive web application designed for students and bachelors living in messes, hostels, or shared apartments. It helps you manage your personal finances, track mess expenses, calculate shared bazar costs, set financial goals, track debts, and visualize monthly spending patterns.

Live demo hosted on GitHub Pages: [sanjidalam69.github.io](https://sanjidalam69.github.io)

---

## 🚀 Key Features

*   **📊 Comprehensive Dashboard**: View total balance, monthly income/expense trends, and savings rate.
*   **🍽️ Shared Mess Manager**: Track mess member deposits, overall mess expenses, and instantly calculate individual share amounts.
*   **🛒 Bazar List**: Separate bazar items tracking with automatic Done status and quantities.
*   **👥 Real-Time Cloud Sync**: Join a mess/room via a unique room code. Changes are instantly synchronized across roommates.
*   **📅 Interactive Calendar**: View all transactions, bazar updates, and mess expenses on a responsive monthly calendar.
*   **💰 Personal Finance**: Multi-account support, custom category tagging, budgets, and savings goals.
*   **📈 Rich Analytics**: Categories donut charts, weekly spending insights, and responsive 12-month trends.
*   **🌓 Dark/Light Theme**: Sleek Cyberpunk Slate & Electric Sky-Blue dark theme, and an elegant Slate-Cyan light theme.
*   **📱 Fully Mobile Responsive**: Scrollable bottom navigation, optimized font size readability for Bengali text, and lightweight animations optimized for maximum mobile FPS.

---

## 🛠️ Tech Stack

*   **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom responsive design variables, no bulky frameworks), Vanilla JavaScript (ES6+ object-oriented).
*   **Libraries**: [Chart.js](https://www.chartjs.org/) (for interactive charts), FontAwesome (for modern icons), Google Fonts (Inter & Hind Siliguri).
*   **Sync Backend**: npoint JSON cloud database sync.

---

## 📦 How to Run Locally

Since this is built with pure vanilla technologies, running it is extremely simple:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/bachelor-khata.git
    cd bachelor-khata
    ```
2.  **Open in Browser**:
    *   Simply double-click `index.html` to run.
    *   Alternatively, run it using a local development server (e.g., Live Server in VS Code, or Python `python -m http.server 8000`).

---

## 📂 Project Structure

```text
bachelor-khata/
├── index.html         # Main application layout, styles, and modals
├── src/
│   └── script.js      # App logic, calculation engines, Chart.js integrations, and sync service
└── README.md          # Project documentation
```

---

## 🌐 Deploying to GitHub Pages

To host this project on GitHub Pages:

1.  Create a new public repository on GitHub.
2.  Push your code to the `main` branch.
3.  Go to **Settings** > **Pages** in your repository.
4.  Under **Build and deployment**, set Source to **Deploy from a branch** and select `main` (or `root`).
5.  Click **Save**. Your app will be live at `https://your-username.github.io/bachelor-khata/` in a few minutes!

---

### 🇧🇩 ব্যাচেলর খাতা - বাংলা বিবরণী

ব্যাচেলর খাতা একটি আধুনিক এবং অত্যন্ত রেস্পন্সিভ বাজেট ট্র্যাকিং ওয়েব অ্যাপ্লিকেশন, যা বিশেষভাবে মেস, হোস্টেল বা শেয়ার্ড অ্যাপার্টমেন্টে থাকা ব্যাচেলর ও শিক্ষার্থীদের হিসাব-নিকাশ সহজ করতে তৈরি। 

**মূল সুবিধাসমূহ:**
*   ব্যক্তিগত ও মেসের খরচ হিসাব আলাদা ট্র্যাকিং।
*   মেস মেম্বারদের মিল রেট, ডেপোজিট এবং খরচ ভাগাভাগির হিসাব।
*   রুমমেটদের সাথে মেস কোডের মাধ্যমে রিয়েল-টাইম ক্লাউড সিঙ্ক।
*   আকর্ষণীয় ডার্ক নিয়ন এবং আরামদায়ক লাইট থিম।
*   ক্যালেন্ডারে ক্লিক করে প্রতিদিনের বাজারের বিবরণ দেখা।
*   মোবাইল স্ক্রিনে চমৎকার রেস্পন্সিভনেস এবং স্মুথ অ্যানিমেশন।

---
Developed by pair-programming with Antigravity AI. Licensed under the MIT License.
