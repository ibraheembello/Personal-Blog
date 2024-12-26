// app.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs').promises;
const marked = require('marked');
const app = express();
const crypto = require('crypto');

// Configuration
const ARTICLES_DIR = 'articles';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // In production, use proper password hashing

// Add password hashing
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Update password storage
const ADMIN_PASSWORD_HASH = hashPassword('admin123');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'ejs');

// Ensure articles directory exists
(async () => {
    try {
        await fs.mkdir(ARTICLES_DIR);
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
})();

// Authentication middleware
const loginRequired = (req, res, next) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    next();
};

// Helper functions
async function saveArticle(title, content, date = null) {
    date = date || new Date().toISOString().split('T')[0];
    const filename = `${date}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    const metadata = {
        title,
        date,
        filename
    };
    
    await Promise.all([
        fs.writeFile(
            path.join(ARTICLES_DIR, `${filename}.json`),
            JSON.stringify(metadata)
        ),
        fs.writeFile(
            path.join(ARTICLES_DIR, `${filename}.md`),
            content
        )
    ]);
    
    return metadata;
}

async function getArticles() {
    try {
        const files = await fs.readdir(ARTICLES_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        const articles = await Promise.all(
            jsonFiles.map(async file => {
                const content = await fs.readFile(
                    path.join(ARTICLES_DIR, file),
                    'utf-8'
                );
                return JSON.parse(content);
            })
        );
        
        return articles.sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
        console.error('Error reading articles:', err);
        return [];
    }
}

async function getArticle(filename) {
    try {
        const [metadata, content] = await Promise.all([
            fs.readFile(
                path.join(ARTICLES_DIR, `${filename}.json`),
                'utf-8'
            ),
            fs.readFile(
                path.join(ARTICLES_DIR, `${filename}.md`),
                'utf-8'
            )
        ]);
        
        const article = JSON.parse(metadata);
        article.content = marked(content);
        return article;
    } catch (err) {
        console.error('Error reading article:', err);
        return null;
    }
}

// Routes
app.get('/', async (req, res) => {
    const articles = await getArticles();
    res.render('home', { articles, loggedIn: req.session.loggedIn });
});

app.get('/article/:filename', async (req, res) => {
    const article = await getArticle(req.params.filename);
    if (!article) {
        return res.status(404).send('Article not found');
    }
    res.render('article', { article, loggedIn: req.session.loggedIn });
});

app.route('/login')
    .get((req, res) => {
        res.render('login', { error: null, loggedIn: req.session.loggedIn });
    })
    .post((req, res) => {
        if (req.body.username === ADMIN_USERNAME && 
            hashPassword(req.body.password) === ADMIN_PASSWORD_HASH) {
            req.session.loggedIn = true;
            res.redirect('/dashboard');
        } else {
            res.render('login', { 
                error: 'Invalid username or password',
                loggedIn: req.session.loggedIn
            });
        }
    });

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/dashboard', loginRequired, async (req, res) => {
    const articles = await getArticles();
    res.render('dashboard', { articles, loggedIn: true });
});

app.route('/add')
    .get(loginRequired, (req, res) => {
        res.render('add_article', { loggedIn: true });
    })
    .post(loginRequired, async (req, res) => {
        try {
            if (!req.body.title || !req.body.content) {
                throw new Error('Title and content are required');
            }
            await saveArticle(req.body.title, req.body.content, req.body.date);
            res.redirect('/dashboard');
        } catch (err) {
            res.status(500).render('add_article', {
                error: 'Error saving article: ' + err.message,
                loggedIn: true
            });
        }
    });

app.route('/edit/:filename')
    .get(loginRequired, async (req, res) => {
        const article = await getArticle(req.params.filename);
        if (!article) {
            return res.status(404).send('Article not found');
        }
        res.render('edit_article', { article, loggedIn: true });
    })
    .post(loginRequired, async (req, res) => {
        const { filename } = req.params;
        try {
            await Promise.all([
                fs.unlink(path.join(ARTICLES_DIR, `${filename}.json`)),
                fs.unlink(path.join(ARTICLES_DIR, `${filename}.md`))
            ]);
            await saveArticle(req.body.title, req.body.content, req.body.date);
            res.redirect('/dashboard');
        } catch (err) {
            console.error('Error updating article:', err);
            res.status(500).send('Error updating article');
        }
    });

app.get('/delete/:filename', loginRequired, async (req, res) => {
    try {
        await Promise.all([
            fs.unlink(path.join(ARTICLES_DIR, `${req.params.filename}.json`)),
            fs.unlink(path.join(ARTICLES_DIR, `${req.params.filename}.md`))
        ]);
    } catch (err) {
        console.error('Error deleting article:', err);
    }
    res.redirect('/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});