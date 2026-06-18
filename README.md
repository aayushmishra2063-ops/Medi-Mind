[README.md](https://github.com/user-attachments/files/29091889/README.md)[Uploading # 🏥 Medi-Mind — Digital Wellness Platform

> A feature-rich, personal health management web app built with vanilla HTML, CSS & JavaScript (frontend) and Django (backend).

![Django](https://img.shields.io/badge/Django-5.x-092E20?logo=django)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)

---

## ✨ Features

| Module | Description |
|---|---|
| 🔐 Auth (OTP Flow) | Sign up with email/phone, OTP verification, password setup |
| 📋 Health Profile | Store age, height, weight, blood group |
| 💊 Prescription Manager | Manually add and track doctor prescriptions |
| 🥗 Diet Manager | Log meals, track calories & macros (protein, carbs, fats), hydration |
| 📊 Nutrition Score | Real-time wellness score based on diet and activity |
| 🏃 Exercise Tracker | Log workouts, calorie burn, get profile-based routine recommendations |
| 🧪 Lab Test Schedule | Schedule diagnostics with prep instructions and completion status |
| ⏰ Medication Reminders | Set medication dose, time, and frequency reminders |

---

## 🗂️ Project Structure

```
medimind/
├── frontend/
│   ├── index.html          # Main SPA entry point
│   ├── css/
│   │   └── style.css       # All styles (themed, responsive)
│   └── js/
│       └── app.js          # All frontend logic (screens, state, localStorage)
├── medimind_backend/       # Django project root
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── manage.py
├── requirements.txt
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- pip

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/medi-mind.git
cd medi-mind
```

### 2. Set up the backend
```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

### 3. Open the frontend
Open `frontend/index.html` directly in your browser, or serve it via Django's static files.

> **Demo mode:** The frontend works fully offline using `localStorage` — no backend connection required to explore all features.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6) — no frameworks, no build tools
- **Backend:** Django 5.x (Python)
- **Database:** SQLite (dev) — swap to PostgreSQL for production
- **Fonts:** DM Sans + Playfair Display (Google Fonts)
- **Storage:** Browser `localStorage` for client-side state

---

## 🔮 Roadmap

- [ ] REST API integration (Django REST Framework)
- [ ] Real OTP delivery via SMS/email (Twilio / SendGrid)
- [ ] AI-powered diet & exercise recommendations (LLM integration)
- [ ] PWA support (offline mode, installable)
- [ ] Data export (PDF health report)
- [ ] Dark mode toggle

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👤 Author

**Aayush Mishra**  
B.Tech CSE (AI) | AKTU — KCC Institute of Technology and Management  

