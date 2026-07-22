# 📒 Bachelor Khata (ব্যাচেলর খাতা)

Bachelor Khata is a premium, modern, and fully responsive web & mobile application designed for students and bachelors living in messes, hostels, or shared apartments. It helps you manage your personal finances, track mess expenses, calculate shared bazar costs, set financial goals, track debts, and communicate with roommates.

Live demo hosted on GitHub Pages: [sanjidalam69.github.io](https://sanjidalam69.github.io)

---

## 🚀 Key Features

*   **📊 Comprehensive Dashboard**: View total balance, monthly income/expense trends, and savings rate with a highly polished UI.
*   **🍽️ Shared Mess Manager**: Track mess member deposits, overall mess expenses, and instantly calculate individual share amounts.
*   **💬 Real-Time Mess Chat**: Chat in real-time with roommates connected to your room/mess code to discuss expenses or daily plans.
*   **📂 PDF Report Downloader**: Export clean, printable PDF reports of transactions filtered by Daily, Monthly, Yearly, or Custom date ranges.
*   **🛒 Bazar List**: Separate bazar items tracking with automatic Done status, quantities, and categorized items.
*   **👥 Real-Time Cloud Sync**: Join a mess/room via a unique room code. Changes are instantly synchronized across roommates.
*   **📅 Interactive Calendar**: View all transactions and mess expenses on a responsive monthly calendar.
*   **💰 Personal Finance**: Custom category tagging, budgets, and savings goals.
*   **📈 Rich Analytics**: Dynamic 12-month bar chart trends for long-term income and expense reports.
*   **🌓 Pro-Level Themes**: Sleek 'Deep Slate & Electric Sky-Blue' dark theme, and an elegant 'Soft Gray & Solid White' modern light theme.
*   **📱 Native Mobile App**: Fully integrated with Capacitor to build directly to Android via Android Studio.
*   **✨ Smooth Mobile Navigation**: Optimized responsive layout with an auto-centering month selector tab for easy navigation.

---

## 🛠️ Tech Stack

*   **Frontend Web**: Vanilla HTML5, Vanilla CSS3 (custom responsive design variables, glassmorphism), Vanilla JavaScript (ES6+).
*   **Mobile Wrapper**: Capacitor (`@capacitor/core`, `@capacitor/android`) for native Android builds.
*   **Libraries**: [Chart.js](https://www.chartjs.org/) (interactive charts), FontAwesome (modern icons), Google Fonts (Inter & Hind Siliguri).

---

## 📦 How to Build the Mobile App (Android)

The project is already configured with Capacitor. To build the Android app:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Sync Web Assets to Android**:
   ```bash
   npx cap sync
   ```
3. **Open Android Studio & Build**:
   ```bash
   npx cap open android
   ```
   *From Android Studio, you can run the app on an emulator or build the APK.*

---

## 📂 Project Structure

```text
bachelor-khata/
├── android/           # Generated Android Studio Project
├── capacitor.config.ts# Capacitor configuration
├── package.json       # Node dependencies for mobile wrapper
└── www/               # Core Web Application Assets
    ├── index.html     # Main app layout, styles, and modals
    ├── README.md      # Documentation (You are here)
    └── src/
        └── script.js  # App logic, Chart.js integrations, and sync service
```

---

### 🇧🇩 ব্যাচেলর খাতা - বাংলা বিবরণী

ব্যাচেলর খাতা একটি আধুনিক এবং অত্যন্ত রেস্পন্সিভ বাজেট ট্র্যাকিং অ্যাপ্লিকেশন, যা বিশেষভাবে মেস, হোস্টেল বা শেয়ার্ড অ্যাপার্টমেন্টে থাকা ব্যাচেলর ও শিক্ষার্থীদের হিসাব-নিকাশ সহজ করতে তৈরি। 

**মূল সুবিধাসমূহ:**
*   ব্যক্তিগত ও মেসের খরচ হিসাব ট্র্যাকিং।
*   মেস মেম্বারদের ডেপোজিট এবং বাজার খরচের সুন্দর হিসাব ও জনপ্রতি খরচের সহজ বিবরণী।
*   রুমমেটদের সাথে আলোচনা করার জন্য সম্পূর্ণ নিজস্ব **রিয়েল-টাইম মেস চ্যাট** সুবিধা।
*   লেনদেন রিপোর্টের চমৎকার **PDF ডাউনলোড** সিস্টেম (দৈনিক, মাসিক, বাৎসরিক বা কাস্টম তারিখ)।
*   রুমমেটদের সাথে মেস কোডের মাধ্যমে রিয়েল-টাইম ক্লাউড সিঙ্ক।
*   প্রো-লেভেল ডার্ক ও লাইট থিম, সাথে স্মুথ ট্রানজিশন অ্যানিমেশন।
*   সরাসরি অ্যান্ড্রয়েড অ্যাপ হিসেবে বিল্ড করার সুবিধা (Capacitor)।
*   মোবাইল স্ক্রিনে মাসের তালিকা অটো-সেন্টারিং এবং স্মুথ টাচ রেস্পন্স।

---
Developed by pair-programming with Antigravity AI. Licensed under the MIT License.
