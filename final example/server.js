const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer'); 
const app = express();
const PORT = 3000;


const upload = multer({ dest: 'uploads/' }); 

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

let users = [];
let diaries = [];
let communityPosts = [];
let commentCounter = 0;

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.status(401).send('You need to log in first');
}

app.post('/api/register', async (req, res) => {
    const { username, password, nickname } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword, nickname });
    res.status(201).send('User registered successfully');
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { username: user.username, nickname: user.nickname };
        res.json({ message: 'Login successful', nickname: user.nickname });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.send('Logout successful');
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, nickname: req.session.user.nickname });
    } else {
        res.json({ loggedIn: false });
    }
});

// 일기 작성 API (이미지 업로드 포함)
app.post('/api/diary', isAuthenticated, upload.single('image'), (req, res) => {
    const { title, content } = req.body;
    const newDiary = {
        id: diaries.length + 1,
        title,
        content,
        username: req.session.user.username,
        image: req.file ? req.file.filename : null
    };
    diaries.push(newDiary);
    res.status(201).json(newDiary);
});

// 커뮤니티 게시글 작성 API
app.post('/api/community', isAuthenticated, (req, res) => {
    const { title, content, image } = req.body;
    const newPost = {
        id: communityPosts.length + 1,
        title,
        content,
        username: req.session.user.nickname,
        image,
        comments: [],
        likes: []
    };
    communityPosts.push(newPost);
    res.status(201).json(newPost);
});

app.post('/api/community/:id/comment', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const { comment } = req.body;
    const post = communityPosts.find(p => p.id === postId);
    if (post) {
        const newComment = { id: commentCounter++, comment, username: req.session.user.nickname };
        post.comments.push(newComment);
        res.status(201).json(newComment);
    } else {
        res.status(404).send('Post not found');
    }
});

app.get('/api/community', (req, res) => {
    res.json(communityPosts);
});

app.post('/api/community/:id/like', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const post = communityPosts.find(p => p.id === postId);
    if (post) {
        post.likes = post.likes || [];
        if (!post.likes.includes(req.session.user.username)) {
            post.likes.push(req.session.user.username);
            res.status(200).send('좋아요 추가 성공');
        } else {
            res.status(400).send('이미 좋아요를 눌렀습니다.');
        }
    } else {
        res.status(404).send('게시글을 찾을 수 없습니다.');
    }
});

app.delete('/api/community/:id/like', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const post = communityPosts.find(p => p.id === postId);
    if (post) {
        post.likes = post.likes || [];
        const index = post.likes.indexOf(req.session.user.username);
        if (index !== -1) {
            post.likes.splice(index, 1);
            res.status(200).send('좋아요 제거 성공');
        } else {
            res.status(400).send('좋아요를 누르지 않았습니다.');
        }
    } else {
        res.status(404).send('게시글을 찾을 수 없습니다.');
    }
});

app.delete('/api/community/comment/:commentId', isAuthenticated, (req, res) => {
    const commentId = parseInt(req.params.commentId, 10);
    let commentDeleted = false;

    communityPosts.forEach(post => {
        post.comments = post.comments.filter(comment => {
            if (comment.id === commentId && comment.username === req.session.user.nickname) {
                commentDeleted = true;
                return false;
            }
            return true;
        });
    });

    if (commentDeleted) {
        res.status(200).send('댓글 삭제 성공');
    } else {
        res.status(404).send('댓글을 찾을 수 없거나 삭제 권한이 없습니다.');
    }
});

app.put('/api/community/comment/:commentId', isAuthenticated, (req, res) => {
    const commentId = parseInt(req.params.commentId, 10);
    const { comment } = req.body;
    let commentUpdated = false;

    communityPosts.forEach(post => {
        post.comments = post.comments.map(c => {
            if (c.id === commentId && c.username === req.session.user.nickname) {
                commentUpdated = true;
                return { ...c, comment };
            }
            return c;
        });
    });

    if (commentUpdated) {
        res.status(200).send('댓글 수정 성공');
    } else {
        res.status(404).send('댓글을 찾을 수 없거나 수정 권한이 없습니다.');
    }
});

// 프로필 조회 API
app.get('/api/profile', isAuthenticated, (req, res) => {
    const user = users.find(u => u.username === req.session.user.username);
    if (user) {
        res.json({ nickname: user.nickname, bio: user.bio });
    } else {
        res.status(404).send('User not found');
    }
});

// 프로필 업데이트 API
app.put('/api/profile', isAuthenticated, upload.single('profilePic'), (req, res) => {
    const user = users.find(u => u.username === req.session.user.username);
    if (user) {
        user.nickname = req.body.nickname;
        user.bio = req.body.bio;
        if (req.file) {
            user.profilePic = req.file.filename;
        }
        res.json({ nickname: user.nickname, bio: user.bio });
    } else {
        res.status(404).send('User not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
