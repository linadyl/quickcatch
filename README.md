# QuickCatch - NHL Highlights Analysis

QuickCatch is a web application that provides NHL team highlight analysis. Users can select their favorite NHL team and view AI-generated summaries and performance analyses of recent highlights.

## Features

- Browse NHL teams by conference and division
- Search for specific teams
- View AI-analyzed highlights for any NHL team
- Watch embedded highlight videos
- Email highlight analyses to yourself or others

## Project Structure

The application consists of:
- React frontend with Tailwind CSS
- Express.js backend server
- Python script for AI video analysis using Perplexity AI

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- Python 3.8+
- FFmpeg (for video processing)

### Backend Setup

1. Clone the repository and navigate to the backend directory
```bash
cd backend
npm install
```

2. Install Python dependencies
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with the following:
```
PERPLEXITY_API_KEY=your_perplexity_api_key
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
```

4. Start the backend server
```bash
node server.js
```

### Frontend Setup

1. Navigate to the frontend directory
```bash
cd ../client
npm install
```

2. Start the frontend development server
```bash
npm run dev
```

3. Open your browser and navigate to the local host

## Usage

1. Log in with any email/password (demo mode)
2. Browse teams by conference and division or use the search bar
3. Click on a team to analyze their recent highlights
4. View the AI-generated analysis and watch the highlight video
5. Optionally, share the analysis via email

## Technologies Used

- React.js
- Tailwind CSS
- Express.js
- Python
- Perplexity AI API

## Notes for Judges

- The login screen is in demo mode and accepts any credentials
- The analysis may take a few moments to generate as the backend processes video content
- Email sharing requires valid SMTP credentials in the .env file (shared in devpost submission)
