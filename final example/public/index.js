document.addEventListener('DOMContentLoaded', function () {

    const apiKey = '4129b31d13f14c53a46acab4f15c9611'; 
    const city = 'Seoul'; 

    function fetchWeather() {
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Weather data:', data); 
                const weatherElement = document.getElementById('weather');
                if (data.weather && data.weather.length > 0) {
                    const weatherHTML = `
                        <div class="card weather-card">
                            <div class="card-body">
                                <h5 class="card-title">${data.weather[0].description}</h5>
                                <p class="card-text">온도: ${data.main.temp}°C</p>
                                <p class="card-text">습도: ${data.main.humidity}%</p>
                            </div>
                        </div>
                    `;
                    weatherElement.innerHTML = weatherHTML;
                } else {
                    weatherElement.innerHTML = '<p>날씨 정보를 가져올 수 없습니다.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                document.getElementById('weather').innerHTML = '<p>날씨 정보를 가져오는 중 오류가 발생했습니다.</p>';
            });
    }

    fetchWeather();

    document.getElementById('add-diary').addEventListener('click', function() {
        fetch('/api/check-auth')
            .then(response => response.json())
            .then(data => {
                if (data.loggedIn) {
                    document.getElementById('diaryModal').style.display = 'block';
                } else {
                    alert('로그인하세요');
                    document.getElementById('loginModal').style.display = 'block';
                }
            });
    });

    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('diaryModal').style.display = 'none';
    });

    document.getElementById('diaryForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const title = document.getElementById('diaryTitle').value;
    const content = document.getElementById('diaryContent').value;
    const diaryImage = document.getElementById('diaryImage').files[0];

    if (title && content) {
        fetch('/api/check-auth')
            .then(response => response.json())
            .then(authData => {
                if (authData.loggedIn) {
                    const formData = new FormData();
                    formData.append('title', title);
                    formData.append('content', content);
                    if (diaryImage) {
                        formData.append('image', diaryImage);
                    }

                    fetch('/api/diary', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        const diaryList = document.getElementById('diary');
                        const newDiaryItem = document.createElement('li');
                        newDiaryItem.className = 'list-group-item diary-item';
                        newDiaryItem.innerHTML = `<b>${data.title}</b>`;

                        const contentDiv = document.createElement('div');
                        contentDiv.style.display = 'none';
                        contentDiv.innerHTML = `<p>${data.content}</p>`;
                        if (data.image) {
                            const imgElement = document.createElement('img');
                            imgElement.src = `/uploads/${data.image}`;
                            imgElement.style.width = '100%';
                            contentDiv.appendChild(imgElement);
                        }
                        contentDiv.innerHTML += `<button class="btn btn-secondary btn-sm share-btn">공유</button>`;
                        newDiaryItem.appendChild(contentDiv);

                        newDiaryItem.addEventListener('click', function() {
                            contentDiv.style.display = contentDiv.style.display === 'none' ? 'block' : 'none';
                        });

                        diaryList.appendChild(newDiaryItem);
                        document.getElementById('diaryModal').style.display = 'none';

                        document.querySelectorAll('.share-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                fetch('/api/community', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ title: data.title, content: data.content, username: authData.nickname, image: data.image })
                                })
                                .then(response => response.json())
                                .then(sharedData => {
                                    addCommunityPost(sharedData);
                                });
                            });
                        });

                        document.getElementById('diaryForm').reset();
                    });
                } else {
                    alert('로그인하세요');
                }
            });
    }
});

    function addCommunityPost(post) {
    const communityBoard = document.getElementById('community-board');
    const sharedItem = document.createElement('div');
    sharedItem.className = 'col-md-4 mb-3';
    sharedItem.innerHTML = `<div class="card community-post">
                                <div class="card-body">
                                    <h5 class="card-title">${post.title}</h5>
                                    <p class="card-text">${post.content}</p>`;
    if (post.image) {
        sharedItem.innerHTML += `<img src="/uploads/${post.image}" style="width: 100%;">`;
    }
    sharedItem.innerHTML += `<p class="text-muted">작성자: ${post.username}</p>
                                    <p class="text-muted">좋아요: <span class="like-count">${post.likes ? post.likes.length : 0}</span></p>
                                    <button class="btn btn-primary btn-sm like-btn" data-post-id="${post.id}">좋아요</button>
                                    <button class="btn btn-primary btn-sm comment-btn">댓글</button>
                                    <div class="comment-section mt-2">
                                        <div class="form-group">
                                            <input type="text" class="form-control comment-input" placeholder="댓글을 입력하세요">
                                            <button class="btn btn-secondary btn-sm comment-submit">확인</button>
                                        </div>
                                        <ul class="list-group comment-list"></ul>
                                    </div>
                                </div>
                            </div>`;
    communityBoard.appendChild(sharedItem);

    sharedItem.querySelector('.comment-btn').addEventListener('click', function() {
        const commentSection = sharedItem.querySelector('.comment-section');
        commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';
    });

    sharedItem.querySelector('.like-btn').addEventListener('click', function() {
        const postId = this.getAttribute('data-post-id');
        fetch(`/api/community/${postId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.text())
        .then(message => {
            if (message === '좋아요 추가 성공') {
                const likeCountElement = sharedItem.querySelector('.like-count');
                likeCountElement.textContent = parseInt(likeCountElement.textContent) + 1;
            } else {
                alert(message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('좋아요 추가 실패');
        });
    });

    const commentInput = sharedItem.querySelector('.comment-input');
    const commentSubmit = sharedItem.querySelector('.comment-submit');

    const submitComment = function() {
        if (commentInput.value.trim() !== '') {
            const commentList = sharedItem.querySelector('.comment-list');
            const newComment = document.createElement('li');
            newComment.className = 'list-group-item comment-item';

            fetch(`/api/community/${post.id}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment: commentInput.value })
            })
            .then(response => response.json())
            .then(commentData => {
                newComment.innerHTML = `<strong>${commentData.username}:</strong> <span>${commentData.comment}</span>
                                        <button class="btn btn-danger btn-sm delete-comment" data-comment-id="${commentData.id}">삭제</button>
                                        <button class="btn btn-secondary btn-sm edit-comment" data-comment-id="${commentData.id}">수정</button>`;
                commentList.appendChild(newComment);
                commentInput.value = '';

                // 댓글 삭제 이벤트 리스너 추가
                newComment.querySelector('.delete-comment').addEventListener('click', function() {
                    const commentId = this.getAttribute('data-comment-id');
                    fetch(`/api/community/comment/${commentId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => {
                        if (response.ok) {
                            commentList.removeChild(newComment);
                        } else {
                            alert('댓글 삭제에 실패했습니다.');
                        }
                    });
                });

                // 댓글 수정 이벤트 리스너 추가
                newComment.querySelector('.edit-comment').addEventListener('click', function() {
                    const commentId = this.getAttribute('data-comment-id');
                    const originalCommentText = newComment.querySelector('span').textContent.trim();
                    const newCommentText = prompt('수정할 댓글 내용을 입력하세요:', originalCommentText);
                    if (newCommentText && newCommentText !== originalCommentText) {
                        fetch(`/api/community/comment/${commentId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ comment: newCommentText })
                        })
                        .then(response => {
                            if (response.ok) {
                                newComment.querySelector('span').textContent = newCommentText;
                                alert('댓글 수정 성공');
                            } else {
                                alert('댓글 수정에 실패했습니다.');
                            }
                        });
                    }
                });
            });
        }
    };

    commentSubmit.addEventListener('click', submitComment);

    commentInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitComment();
        }
    });
}

    window.addEventListener('load', () => {
        fetch('/api/community')
        .then(response => response.json())
        .then(data => {
            data.forEach(post => addCommunityPost(post));
        });

        fetch('/api/check-auth')
        .then(response => response.json())
        .then(data => {
            if (data.loggedIn) {
                showUserInfo(data.nickname);
            }
        });
    });

    document.getElementById('login-btn').addEventListener('click', function() {
        document.getElementById('loginModal').style.display = 'block';
    });

    document.getElementById('closeLoginModal').addEventListener('click', function() {
        document.getElementById('loginModal').style.display = 'none';
    });

    document.getElementById('loginForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Invalid credentials');
            }
            return response.json();
        })
        .then(data => {
            showUserInfo(data.nickname);
            document.getElementById('loginModal').style.display = 'none';
        })
        .catch(error => {
            alert(error.message);
        });
    });

    document.getElementById('register-btn').addEventListener('click', function() {
        document.getElementById('registerModal').style.display = 'block';
    });

    document.getElementById('closeRegisterModal').addEventListener('click', function() {
        document.getElementById('registerModal').style.display = 'none';
    });

    document.getElementById('registerForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const nickname = document.getElementById('reg-nickname').value;

        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, nickname })
        })
        .then(response => response.text())
        .then(message => {
            alert(message);
            if (message === 'User registered successfully') {
                document.getElementById('registerModal').style.display = 'none';
            }
        });
    });

    document.getElementById('show-register').addEventListener('click', function() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('registerModal').style.display = 'block';
    });

    document.getElementById('logout-btn').addEventListener('click', function() {
        fetch('/api/logout', { method: 'POST' })
        .then(() => {
            hideUserInfo();
        });
    });

    function showUserInfo(nickname) {
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('nickname-display').textContent = nickname;
        document.getElementById('user-info').style.display = 'block';
    }

    function hideUserInfo() {
        document.getElementById('auth-buttons').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
    }
});
