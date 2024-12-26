# Personal Blog

This project is based on the roadmap.sh project challenge:
[Personal Blog Project](https://roadmap.sh/projects/personal-blog)

## Features

- Public article viewing
- Admin dashboard for content management
- Markdown support for articles
- Session-based authentication
- File-based storage system

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Default Admin Credentials

- Username: admin
- Password: admin123

## Project Structure

- `/articles` - Stores blog posts
- `/views` - EJS templates
- `app.js` - Main application file

## Technologies Used

- Express.js
- EJS templating
- Marked (for Markdown parsing)
- Express Session
