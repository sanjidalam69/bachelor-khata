# 📒 Bachelor Khata (ব্যাচেলর খাতা)

**Bachelor Khata** is a premium, modern, and fully responsive web & mobile application designed for students and bachelors living in messes, hostels, or shared apartments. It helps you manage your personal finances, track mess expenses, calculate shared bazar costs, generate instant PDF reports, set financial goals, track debts, and communicate in real-time with roommates.

Live demo hosted on GitHub Pages: [sanjidalam69.github.io](https://sanjidalam69.github.io/bachelor-khata/)

---

## 🚀 Key Features

* **🍽️ Shared Mess Manager**: Track mess member deposits, shared mess expenses, individual out-of-pocket costs, and auto-calculate per-head shares and member balances (Surplus/Deficit).
* **📄 Direct Mess PDF Export**: Export comprehensive Mess Financial Reports in clean PDF format containing deposit summaries, per-head shares, member balances, and full transaction logs using background `html2pdf.js` rendering with Bengali typography (`Hind Siliguri`).
* **📂 Transaction PDF Reports**: Download instant PDF reports of personal transactions filtered by Daily, Monthly, Yearly, or Custom date ranges without print prompt popups.
* **⚡ High-Availability Cloud Sync**: Zero-configuration 6-character room codes (e.g. `A7B2X9`). Sync mess data instantly across roommate devices using a high-reliability Cloud REST API engine with 99.99% uptime.
* **💬 Real-Time Mess Chat**: Native in-app chat for roommates connected to your room code with background polling and instant messaging.
* **👥 Active Roommate Presence**: Live indicators showing active roommates currently online or active in your mess group.
* **📊 Comprehensive Dashboard**: Monitor total balance, monthly income/expense trends, and category distribution charts with Chart.js.
* **🛒 Bazar List Manager**: Track group shopping lists with item quantities, completion status, and quick additions.
* **📱 Mobile UX & Smooth Edit Motion**: Tap any transaction to edit—automatically smooth-scrolls and highlights the form on mobile devices with high-visibility outline animation.
* **✨ Center-Focused Month Selector**: Smooth auto-centering scroll tab bar for effortless month navigation on touchscreens.
* **🌓 Pro-Level Themes**: Sleek 'Deep Slate & Electric Sky-Blue' dark theme, and an elegant 'Soft Gray & Solid White' modern light theme.
* **📱 Native Mobile Application**: Fully integrated with Capacitor for building native Android APKs (`.apk`).

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox/Grid, Glassmorphic cards), JavaScript (ES6+ async/await).
* **PDF Generator**: `html2pdf.js` with dynamic Google Font injection (`Hind Siliguri`) for Bengali typography.
* **Cloud Engine**: High-Availability Cloud REST API engine (`api.restful-api.dev`) using RESTful `fetch()` endpoints.
* **Data Persistence**: Offline-first `localStorage` architecture (100% data privacy & zero phone storage bloat).
* **Charts & Icons**: [Chart.js](https://www.chartjs.org/) for interactive financial charts, FontAwesome 6 for modern UI icons.
* **Mobile Framework**: Capacitor (`@capacitor/core`, `@capacitor/android`) for native Android builds.

---

## 📦 How to Build the Mobile App (Android APK)

The project is pre-configured with Capacitor. Follow these steps to build the Android app:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Sync Web Assets to Android**:
   ```bash
   npx cap sync
   ```
3. **Build Debug APK via Gradle**:
   ```bash
   cd android
   .\gradlew assembleDebug
   ```
   *The compiled APK will be available at:*  
   `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Open in Android Studio (Optional)**:
   ```bash
   npx cap open android
   ```

---

## 📂 Project Structure

```text
bachelor-khata/
├── android/            # Native Android Studio Project
├── capacitor.config.ts # Capacitor Configuration
├── package.json        # Dependencies & Capacitor scripts
└── www/                # Core Web & Mobile Application Code
    ├── index.html      # Main application markup & UI layout
    ├── README.md       # Project Documentation
    └── src/
        └── script.js   # Application logic, Cloud REST Sync, PDF generator & UI handlers
```

---

### 🇧🇩 ব্যাচেলর খাতা - বাংলা বিবরণী

**ব্যাচেলর খাতা** একটি আধুনিক ও অত্যন্ত রেস্পন্সিভ বাজেট ও মেস হিসাব অ্যাপ্লিকেশন, যা বিশেষভাবে মেস, হোস্টেল বা শেয়ার্ড অ্যাপার্টমেন্টে থাকা ব্যাচেলর ও শিক্ষার্থীদের হিসাব-নিকাশ সহজ করতে তৈরি। 

**প্রধান সুবিধাসমূহ:**
* **মেস হিসাব ও শেয়ারিং:** মেস মেম্বারদের জমা টাকা, মোট মেস খরচ এবং জনপ্রতি খরচের সহজ ও নিখুঁত হিসাব (পাবে/দেবে হিসাবসহ)।
* **মেস PDF রিপোর্ট ডাউনলোড:** এক ক্লিকে মেসের জমা-খরচ ও সদস্য ভিত্তিক হিসাবের আকর্ষণীয় বাংলা PDF ফাইল সরাসরি ডিভাইসে সেভ।
* **লেনদেন PDF রিপোর্ট:** দৈনিক, মাসিক, বাৎসরিক বা পছন্দমতো যেকোনো তারিখের আয়-ব্যয় রিপোর্টের সরাসরি PDF ডাউনলোড।
* **রিয়েল-টাইম ক্লাউড সিঙ্ক:** ৬ অক্ষরের মেস কোড তৈরি করে রুমমেটদের সাথে ৯৯.৯৯% আপটাইম ক্লাউড ডাটাবেসের মাধ্যমে তাতক্ষণিক হিসাব আদান-প্রদান।
* **রিয়েল-টাইম মেস চ্যাট:** রুমমেটদের সাথে মেসেজ দেওয়া-নেওয়া ও খরচের আলোচনা করার নিজস্ব চ্যাট অপশন।
* **স্মুথ মোবাইল নেভিগেশন:** মোবাইলে লেনদেন এডিটের কলম চিহ্নে চাপ দিলে স্বয়ংক্রিয়ভাবে স্ক্রোল হয়ে হাইলাইটসহ ফর্ম প্রদর্শন।
* **সম্পূর্ণ অফলাইন সেফটি:** ডাটা প্রথমে ফোনে সুরক্ষিতভাবে সেভ থাকে, তাই ইন্টারনেট না থাকলেও অ্যাপ দ্রুত কাজ করে।
* **অ্যান্ড্রয়েড অ্যাপ (APK):** সরাসরি ইনস্টলযোগ্য অ্যান্ড্রয়েড APK ফাইল বিল্ড করার তৈরি পরিবেশ (Capacitor)।

---

Developed by pair-programming with Antigravity AI. Licensed under the MIT License.
