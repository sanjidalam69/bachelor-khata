# 🚀 Smart Finance Tracker

![Smart Finance Tracker UI Preview](https://img.shields.io/badge/UI-Premium_Glassmorphism-6366f1?style=for-the-badge)
![Built With](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

A stunning, premium, and fully client-side personal finance dashboard. Built with a modern glassmorphic design and smooth micro-animations, this application allows you to track your daily income and expenses seamlessly. 

All your data is persisted safely inside your browser using **LocalStorage**. 

## ✨ Features

- **Premium UI/UX:** Deep dark mode palette (Zinc 900/950) paired with interactive glassmorphic panels and animated mesh gradients.
- **Taka (৳) Support:** Localized for Bangladeshi users with seamless ৳ formatting.
- **Cash Flow Analytics:** Real-time calculation of your net worth, total income, and total expenses.
- **Dynamic Data Visualization:** Beautiful, responsive doughnut charts powered by **Chart.js**.
- **Monthly Ledgers:** Filter and navigate your financial history month-by-month using the sleek sidebar rail.
- **Budget Goal Tracking:** Keep your spending in check with an automated visual progress bar.
- **Top Spending Analysis:** Instantly see your top 3 biggest spending categories with custom icons.
- **Zero Dependencies:** Runs entirely on the browser. No Node.js, NPM, or build steps required.

## 🛠️ Technology Stack

- **HTML5:** Semantic and accessible structure.
- **Vanilla JavaScript:** Clean, class-based ES6 logic for state and DOM management.
- **Tailwind CSS v4 (CDN):** For rapid, utility-first premium styling directly in the browser.
- **Chart.js (CDN):** For rendering the interactive expenses chart.
- **FontAwesome (CDN):** For beautiful, scalable vector icons.
- **Plus Jakarta Sans:** High-end geometric typography.

## 🚀 How to Run Locally

Because this project uses zero build tools, running it is incredibly simple:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/smart-finance-tracker.git
   ```
2. Navigate to the folder:
   ```bash
   cd smart-finance-tracker
   ```
3. **Open `index.html`** in any modern web browser (Chrome, Firefox, Safari, Edge). 
   - No local server required! The app functions perfectly using the `file://` protocol.

## 📁 Project Structure

```text
📦 smart-finance-tracker
 ┣ 📂 src
 ┃ ┗ 📜 script.js      # Core JavaScript logic & LocalStorage management
 ┣ 📜 index.html       # Main application layout and embedded Tailwind configuration
 ┣ 📜 profile.png      # User profile image asset
 ┗ 📜 README.md        # Documentation
```

## 💡 How It Works

1. **Add a Transaction:** Use the sticky form on the right to input Income or Expenses. Select the relevant category, title, amount, and date.
2. **Dashboard Updates:** Once added, your balance, monthly metrics, and visual charts update instantaneously.
3. **Data Storage:** The app automatically stringifies your data and saves it to the browser's `localStorage`. Whenever you reload or reopen the page, your ledger remains intact.
4. **Edit/Delete:** Hover over any transaction in the ledger to reveal edit and delete actions.

---
*Built with ❤️ for better personal finance tracking.*
