let fullQuizData = [];
    let quizData = [];
    let wrongQuizData = [];
    let currentIndex = 0;
    let answered = false;
    let score = 0;
    let resultLog = [];
    let chapterList = [];
    let starredQuizData = []; // ⭐ 收藏題庫
    let currentMode = 'normal'; // 當前模式：normal, wrong, starred


    function renderQuestion() {
      const q = quizData[currentIndex];
      answered = false;
    
      const indexLabel = q.originalIndex
        ? `⭐ 第 ${q.originalIndex} 題`
        : `第 ${currentIndex + 1} 題`;
    
      // 顯示題目與章節
      document.getElementById('question').innerHTML = `
        <span style="color: #888; font-size: 14px;">
        ${q.chapter}｜${indexLabel}
        </span><br>${q.question}
      `;
    
      // 更新章節計數
      const currentChapter = q.chapter.replace(/第(\d+)章.*/, '$1') || 1;
      document.getElementById('current').textContent = currentChapter;
      
      // 動態計算當前章節的總題數
      const currentChapterText = `第${currentChapter}章`;
      const totalQuestionsInChapter = fullQuizData.filter(question => question.chapter.includes(currentChapterText)).length;
      document.getElementById('total').textContent = totalQuestionsInChapter;
    
      // 題目選項
      const optionsDiv = document.getElementById('options');
      optionsDiv.innerHTML = "";
    
      q.options.forEach((opt) => {
        const label = document.createElement("label");
        label.classList.add("option");
        label.innerHTML = `<input type="radio" name="option" value="${opt}"> ${opt}`;
        label.addEventListener('click', () => handleAnswer(label, opt, q.answer));
        optionsDiv.appendChild(label);
      });
    
      // ⭐ 收藏按鈕邏輯
      const controls = document.querySelector(".controls");
    
      // 先刪除舊的收藏按鈕（避免重複插入）
      const oldFav = document.getElementById('favBtn');
      if (oldFav) oldFav.remove();
    
      // 建立新的收藏按鈕
      const favBtn = document.createElement("button");
      favBtn.id = "favBtn";
      favBtn.style.marginRight = "10px";
      updateFavButton(favBtn, q); // 更新收藏狀態
      favBtn.onclick = () => toggleFavorite(q, favBtn);
      controls.insertBefore(favBtn, controls.firstChild);
    
      // ⬅️⬆️ 自由跳題：讓上一題/下一題都可點
      document.getElementById('prevBtn').disabled = false;
      document.getElementById('nextBtn').disabled = false;
    
      // ⛔ 可選：如果你想在第一題禁用上一題，可以打開這行
      // document.getElementById('prevBtn').disabled = currentIndex === 0;
    }
    
    

    function handleAnswer(selectedLabel, selectedAnswer, correctAnswer) {
      if (answered) return;
      answered = true;

      const allOptions = document.querySelectorAll('.option');
      allOptions.forEach(option => {
        option.classList.add('disabled');
        if (option.textContent.trim() === correctAnswer) {
          option.classList.add('correct');
        }
        if (option.textContent.trim() === selectedAnswer && selectedAnswer !== correctAnswer) {
          option.classList.add('wrong');
        }
      });

      // document.getElementById('nextBtn').disabled = false;

      resultLog.push({
        question: quizData[currentIndex].question,
        chapter: quizData[currentIndex].chapter,
        yourAnswer: selectedAnswer,
        correctAnswer: correctAnswer,
        isCorrect: selectedAnswer === correctAnswer
      });

      if (selectedAnswer === correctAnswer) {
        score++;
      }
    }

    function nextQuestion() {
      
      if (currentIndex < quizData.length - 1) {
        currentIndex++;
        renderQuestion();
      } else {
        const correctCount = score;
        const total = quizData.length;
        const accuracy = ((correctCount / total) * 100).toFixed(1);

        wrongQuizData = resultLog
          .filter(r => !r.isCorrect)
          .map(r => ({
            question: r.question,
            chapter: r.chapter,
            options: [r.yourAnswer, r.correctAnswer]
              .concat(["我猜猜", "我亂選"])
              .filter((v, i, a) => a.indexOf(v) === i),
            answer: r.correctAnswer
          }));
        
        // 保存錯題到localStorage
        saveWrongQuizDataToLocalStorage();

        document.querySelector('.quiz-box').innerHTML = `
          <h2>🎉 恭喜完成所有題目！</h2>
          <p>總共答對 <strong>${correctCount}</strong> / ${total} 題</p>
          <p>正確率：<strong>${accuracy}%</strong></p>
          <hr>
          <h3>📋 答題紀錄：</h3>
          <ul style="text-align: left;">
            ${resultLog.map((r, i) => `
              <li style="margin-bottom: 10px;">
                <strong>第 ${i + 1} 題：</strong> ${r.isCorrect ? '✅ 正確' : '❌ 錯誤'}<br>
                (${r.chapter}) ${r.question}<br>
                你的答案：${r.yourAnswer}<br>
                正確答案：${r.correctAnswer}
              </li>
            `).join('')}
          </ul>
          <div style="margin-top: 20px;">
            <button onclick="location.reload()">🔁 再練一次</button>
            <button onclick="retryWrongQuestions()">❌ 練錯題</button>
          </div>
        `;
      }
    }

    function retryWrongQuestions() {
      // 先加載錯題
      loadWrongQuizDataFromLocalStorage();
      
      if (wrongQuizData.length === 0) {
        alert("🎉 沒有錯題可以再練，太強了啦！");
        return;
      }
      
      // 重置整個頁面結構
      document.querySelector('.quiz-box').innerHTML = `
        <div style="margin-bottom: 10px; text-align: left; width: 100%;">
          <label><strong>🧠 題目模式：</strong></label>
          <select id="modeSelector" onchange="handleModeChange()">
            <option value="normal">正常模式</option>
            <option value="wrong" selected>錯題模式</option>
            <option value="starred">⭐ 收藏模式</option>
          </select>
        </div>
        <div style="margin-bottom: 10px; text-align: left; width: 100%;">
          <label><strong>📘 題庫章節：</strong></label>
          <select id="chapterSelector" onchange="handleChapterChange()">
            <option value="all">全部章節</option>
          </select>
        </div>
        <div class="question-counter">第<span id="current">1</span>章 / <span id="total">0</span></div>
        <h2 id="question">載入中...</h2>
        <div class="options" id="options"></div>
        <div class="controls">
          <button onclick="goToPrevQuestion()" id="prevBtn">⬅️ 上一題</button>
          <button onclick="nextQuestion()" id="nextBtn">➡️ 下一題</button>
        </div>
      `;
      
      // 重新填充章節選擇器
      const selector = document.getElementById("chapterSelector");
      const uniqueChapters = [...new Set(fullQuizData.map(q => q.chapter))];
      uniqueChapters.forEach(ch => {
        const opt = document.createElement("option");
        opt.value = ch;
        opt.textContent = ch;
        selector.appendChild(opt);
      });
      
      quizData = wrongQuizData;
      currentMode = 'wrong';
      document.getElementById('modeSelector').value = "wrong";
      resetQuiz();
    }

    function resetQuiz() {
      currentIndex = 0;
      score = 0;
      resultLog = [];
      renderQuestion();
    }

    function handleModeChange() {
      const selected = document.getElementById('modeSelector').value;
      currentMode = selected; // 更新當前模式
      
      if (selected === 'normal') {
        quizData = fullQuizData;
        resetQuiz();
      } else if (selected === 'wrong') {
        // 先加載錯題
        loadWrongQuizDataFromLocalStorage();
        
        if (wrongQuizData.length === 0) {
          alert("還沒有錯題紀錄唷～🥳");
          document.getElementById('modeSelector').value = "normal";
          currentMode = 'normal';
          return;
        }
        quizData = wrongQuizData;
        resetQuiz();
      } else if (selected === 'starred') {
        if (starredQuizData.length === 0) {
          alert("你還沒有收藏任何題目唷～🌟");
          document.getElementById('modeSelector').value = "normal";
          currentMode = 'normal';
          return;
        }
        quizData = starredQuizData;
        resetQuiz();
      }
    }
    

    function handleChapterChange() {
      const selectedChapter = document.getElementById("chapterSelector").value;
      quizData = selectedChapter === "all"
        ? fullQuizData
        : fullQuizData.filter(q => q.chapter === selectedChapter);
      resetQuiz();
    }

    // ⛓️ 連結你的 Google Sheets JSON API
    fetch('https://script.google.com/macros/s/AKfycbwqSzl7WIXCfYxfUB9szfGiAPRtM27nVDOCxsoyAyb9Y2QGlnD7IX2tZTLYxZOa4quS/exec')
      .then(res => res.json())
      .then(data => {
        fullQuizData = data.map(row => ({
          chapter: row.章節 || "未分類",
          question: row.題目,
          options: [row.選項A, row.選項B, row.選項C, row.選項D],
          answer: row.正確答案
        }));
        // 讀取收藏題庫和錯題
        loadStarredFromLocalStorage();
        loadWrongQuizDataFromLocalStorage();

        const selector = document.getElementById("chapterSelector");
        const uniqueChapters = [...new Set(fullQuizData.map(q => q.chapter))];
        uniqueChapters.forEach(ch => {
          const opt = document.createElement("option");
          opt.value = ch;
          opt.textContent = ch;
          selector.appendChild(opt);
        });

        quizData = fullQuizData;
        renderQuestion();
        const controls = document.querySelector(".controls");
const favBtn = document.createElement("button");
favBtn.style.marginRight = "10px";
updateFavButton(favBtn, quizData[currentIndex]);
favBtn.onclick = () => toggleFavorite(quizData[currentIndex], favBtn);

// 避免多次插入，先清除舊按鈕
const oldFav = document.getElementById('favBtn');
if (oldFav) oldFav.remove();

favBtn.id = 'favBtn';
controls.insertBefore(favBtn, controls.firstChild);
      });

      function toggleFavorite(currentQuestionObj, button) {
        const exists = starredQuizData.find(q => q.question === currentQuestionObj.question);
        if (exists) {
          starredQuizData = starredQuizData.filter(q => q.question !== currentQuestionObj.question);
        } else {
          const source = fullQuizData.find(q => q.question === currentQuestionObj.question) || currentQuestionObj;
          starredQuizData.push({
            ...source,
            originalIndex: fullQuizData.findIndex(q => q.question === source.question) + 1
          });
        }
        updateFavButton(button, currentQuestionObj);
        saveStarredToLocalStorage();
      }
      
      
      function updateFavButton(button, currentQuestionObj) {
        const isFav = starredQuizData.some(q => q.question === currentQuestionObj.question);
        button.textContent = isFav ? "✅ 已收藏" : "⭐ 收藏這題";
        button.style.backgroundColor = isFav ? "#ffcc00" : "#ccc";
        button.style.color = "#000";
      }



//本地存儲功能
function saveStarredToLocalStorage() {
  localStorage.setItem("starredQuizData", JSON.stringify(starredQuizData));
}

function loadStarredFromLocalStorage() {
  const saved = localStorage.getItem("starredQuizData");
  if (saved) {
    const parsed = JSON.parse(saved);
    starredQuizData = parsed.map(item => {
      const matched = fullQuizData.find(q => q.question === item.question);
      return matched ? { ...matched, originalIndex: item.originalIndex } : item;
    });
  }
}

function saveWrongQuizDataToLocalStorage() {
  localStorage.setItem("wrongQuizData", JSON.stringify(wrongQuizData));
}

function loadWrongQuizDataFromLocalStorage() {
  const saved = localStorage.getItem("wrongQuizData");
  if (saved) {
    const parsed = JSON.parse(saved);
    wrongQuizData = parsed.map(item => {
      const matched = fullQuizData.find(q => q.question === item.question);
      return matched ? { ...matched } : item;
    });
  }
}
      

//上一題按鈕
function goToPrevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}