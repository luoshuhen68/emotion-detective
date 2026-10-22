/* ============================================================
   《情绪侦探》交互逻辑
   纯原生 JavaScript，无依赖，可直接双击 index.html 运行。
   题目数据在 data.js，样式在 styles.css。
   ============================================================ */
(function () {
  'use strict';

  var D = window.GAME_DATA;
  var EMO = D.EMOTIONS;
  var byId = {};
  D.PHOTOS.forEach(function (p) { byId[p.id] = p; });

  var KEY = 'emotion-detective-v1';
  var TOTAL_BADGES = D.LEVEL1.length + D.LEVEL2.length + D.LEVEL3.length;
  var CN_NUM = ['一', '二', '三'];
  var LEVEL_INFO = {
    1: { name: '情绪认知站', goal: '把真人照片和情绪词语连起来，认识开心、难过、生气、害怕、惊讶。' },
    2: { name: '情绪配对站', goal: '找出不同人物照片里相同的情绪，练习情绪分类。' },
    3: { name: '情境推理站', goal: '读一读生活故事，猜猜人物的感受，并说说理由。' }
  };

  var state = {
    screen: 'home',
    unlocked: 1,
    badges: 0,
    soundOn: false,
    hintMode: 'standard',
    timerOn: false,
    l2Start: 0,
    timeLeft: 120,
    levelDone: { 1: false, 2: false, 3: false },
    stats: {
      1: { done: 0, correct: 0 },
      2: { done: 0, correct: 0 },
      3: { done: 0, correct: 0 }
    },
    l1: null,
    l2: null,
    l3: null,
    completeLevel: null,
    modalOpen: false,
    restartPending: false
  };

  var screenEl = document.getElementById('screen');
  var modalRoot = document.getElementById('modalRoot');
  var timerId = null;
  var lastScreen = null;

  /* ---------------- 存储 ---------------- */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        unlocked: state.unlocked,
        badges: state.badges,
        soundOn: state.soundOn,
        hintMode: state.hintMode,
        timerOn: state.timerOn,
        l2Start: state.l2Start,
        levelDone: state.levelDone,
        stats: state.stats
      }));
    } catch (e) { /* 隐私模式或本地文件限制时忽略 */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (typeof d.unlocked === 'number') state.unlocked = Math.min(3, Math.max(1, d.unlocked));
      if (typeof d.badges === 'number') state.badges = Math.min(TOTAL_BADGES, d.badges);
      state.soundOn = !!d.soundOn;
      state.hintMode = d.hintMode === 'support' ? 'support' : 'standard';
      state.timerOn = !!d.timerOn;
      if (typeof d.l2Start === 'number' && d.l2Start >= 0 && d.l2Start <= 2) state.l2Start = d.l2Start;
      if (d.levelDone) {
        state.levelDone[1] = !!d.levelDone[1];
        state.levelDone[2] = !!d.levelDone[2];
        state.levelDone[3] = !!d.levelDone[3];
      }
      if (d.stats) {
        [1, 2, 3].forEach(function (n) {
          if (d.stats[n]) {
            state.stats[n].done = Number(d.stats[n].done) || 0;
            state.stats[n].correct = Number(d.stats[n].correct) || 0;
          }
        });
      }
    } catch (e) { /* 忽略损坏的存档 */ }
  }

  /* ---------------- 基础工具 ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function award() {
    if (state.badges < TOTAL_BADGES) state.badges++;
  }

  var AVATAR = '<svg class="fallback-avatar" viewBox="0 0 120 120" aria-hidden="true">' +
    '<circle cx="60" cy="42" r="21" fill="none" stroke="#B9AC9B" stroke-width="3"/>' +
    '<path d="M20 112c4-24 20-34 40-34s36 10 40 34" fill="none" stroke="#B9AC9B" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>';

  // 记录已经在本次会话中成功加载过的图片 URL。
  // 第二次（及以后）再渲染同一 URL 时，直接加 `.loaded` 类，避免 loading 文字闪一下。
  var loadedUrls = Object.create(null);

  function photoHTML(p) {
    var url = p.url;
    var wasLoaded = !!loadedUrls[url];
    return '<div class="photo' + (wasLoaded ? ' loaded' : '') + '">' +
      (wasLoaded ? '' : '<p class="photo-loading">图片加载中…</p>') +
      '<img src="' + url + '" alt="' + esc(p.person) + '" decoding="async" ' +
      'onload="window._markLoaded && _markLoaded(this.src);this.parentNode.classList.add(\'loaded\')" ' +
      'onerror="this.parentNode.classList.add(\'failed\');this.remove();">' +
      '<div class="photo-fallback">' + AVATAR +
      '<p class="fallback-note">图片暂时没有加载出来。<br>表情线索：' + esc(p.cue) + '。</p>' +
      '</div></div>';
  }

  function sceneHTML(sc) {
    var url = sc.url;
    var wasLoaded = !!loadedUrls[url];
    return '<div class="scene' + (wasLoaded ? ' loaded' : '') + '">' +
      (wasLoaded ? '' : '<p class="photo-loading">图片加载中…</p>') +
      '<img src="' + url + '" alt="' + esc(sc.label) + '" decoding="async" ' +
      'onload="window._markLoaded && _markLoaded(this.src);this.parentNode.classList.add(\'loaded\')" ' +
      'onerror="this.parentNode.classList.add(\'failed\');this.remove();">' +
      '<div class="scene-fallback">' + AVATAR +
      '<p>图片暂时没有加载出来。可以请老师读一读故事，再想一想。</p>' +
      '</div></div>';
  }

  function feedbackHTML(fb) {
    if (!fb) return '';
    var cls = fb.type === 'ok' ? 'ok' : fb.type === 'hint' ? 'hint' : 'info';
    return '<div class="feedback ' + cls + '" role="status" aria-live="polite">' +
      '<strong>' + esc(fb.title) + '</strong><p>' + esc(fb.text) + '</p></div>';
  }

  function dotsHTML(total, index) {
    var html = '';
    for (var i = 0; i < total; i++) {
      var cls = 'dot' + (i < index ? ' done' : i === index ? ' now' : '');
      html += '<span class="' + cls + '"></span>';
    }
    return '<div class="dots" aria-hidden="true">' + html + '</div>';
  }

  function gameHead(n, title, index, total, extra, unit) {
    unit = unit || '题';
    return '<div class="game-head"><div>' +
      '<p class="eyebrow">第' + CN_NUM[n - 1] + '关 · ' + LEVEL_INFO[n].name + '</p>' +
      '<h2>' + title + '</h2>' +
      dotsHTML(total, index) +
      '</div><div class="head-right">' +
      extra +
      '<span class="progress-chip">第 ' + (index + 1) + ' / ' + total + ' ' + unit + '</span>' +
      (state.timerOn ? '<span class="timer-chip" id="timer">剩余 2:00</span>' : '') +
      '</div></div>';
  }

  /* ---------------- 朗读 ---------------- */
  function speak(text, force) {
    if (!('speechSynthesis' in window)) return;
    if (!state.soundOn && !force) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 0.92;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 不支持时静默 */ }
  }

  function currentSpeakText() {
    if (state.screen === 'level1' && state.l1) {
      var q = D.LEVEL1[state.l1.i];
      if (q.mode === 'photo-to-word') {
        return '看看这张照片，照片里的人可能是什么情绪？选项是：' +
          q.options.map(function (k) { return EMO[k].label; }).join('、') + '。';
      }
      return '请找出表示' + EMO[q.word].label + '的照片。';
    }
    if (state.screen === 'level2' && state.l2) {
      var g = D.LEVEL2[state.l2.g];
      return '请找出和目标照片情绪相同的照片，可以选多张。' + (g.note || '');
    }
    if (state.screen === 'level3' && state.l3) {
      var sc = D.LEVEL3[state.l3.i];
      if (state.l3.step === 'sentence') {
        var emo = EMO[state.l3.emotion];
        return sc.subject + '可能觉得' + (emo ? emo.label : '') + '，因为什么呢？';
      }
      return sc.story + ' ' + '你觉得' + sc.subject + '此时可能有什么感受？';
    }
    return '';
  }

  function speakCurrent(force) {
    var t = currentSpeakText();
    if (t) speak(t, force);
  }

  /* ---------------- 计时（默认关闭，仅显示，不惩罚） ---------------- */
  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function paintTimer() {
    var el = document.getElementById('timer');
    if (!el) return;
    var t = Math.max(0, state.timeLeft);
    var m = Math.floor(t / 60);
    var s = t % 60;
    el.textContent = '剩余 ' + m + ':' + (s < 10 ? '0' + s : s);
  }

  function startTimerIfNeeded() {
    stopTimer();
    if (!state.timerOn) return;
    if (['level1', 'level2', 'level3'].indexOf(state.screen) === -1) return;
    paintTimer();
    if (state.timeLeft <= 0) return;
    timerId = setInterval(function () {
      state.timeLeft--;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        paintTimer();
        stopTimer();
        timeUp();
        return;
      }
      paintTimer();
    }, 1000);
  }

  function timeUp() {
    var msg = {
      type: 'info',
      title: '时间到了，没关系。',
      text: '我们继续慢慢看。可以点“提示”，也可以请老师帮忙。'
    };
    if (state.screen === 'level1' && state.l1) {
      state.l1.hint = Math.max(state.l1.hint, 1);
      state.l1.feedback = msg;
    } else if (state.screen === 'level2' && state.l2) {
      state.l2.hint = Math.max(state.l2.hint, 1);
      state.l2.feedback = msg;
    } else if (state.screen === 'level3' && state.l3) {
      state.l3.clue = true;
      state.l3.feedback = msg;
    }
    render();
  }

  /* ---------------- 渲染入口 ---------------- */
  function render() {
    stopTimer();
    if (state.screen === 'home') {
      screenEl.innerHTML = homeView();
    } else if (state.screen === 'level1') {
      screenEl.innerHTML = level1View();
    } else if (state.screen === 'level2') {
      screenEl.innerHTML = level2View();
    } else if (state.screen === 'level3') {
      screenEl.innerHTML = level3View();
    } else if (state.screen === 'complete') {
      screenEl.innerHTML = completeView();
    } else if (state.screen === 'finale') {
      screenEl.innerHTML = finaleView();
    }
    updateChrome();
    renderModal();
    if (lastScreen !== state.screen) {
      window.scrollTo(0, 0);
      lastScreen = state.screen;
    }
    startTimerIfNeeded();
  }

  function updateChrome() {
    var badge = document.getElementById('badgeCount');
    if (badge) badge.textContent = '徽章 ' + state.badges + ' / ' + TOTAL_BADGES;
    var sb = document.getElementById('soundBtn');
    if (sb) {
      sb.textContent = state.soundOn ? '朗读：开' : '朗读：关';
      sb.setAttribute('aria-pressed', state.soundOn ? 'true' : 'false');
    }
  }

  /* ---------------- 首页 ---------------- */
  function homeView() {
    var doneCount = [1, 2, 3].filter(function (n) { return state.levelDone[n]; }).length;
    var cards = [1, 2, 3].map(levelCard).join('');
    return '' +
      '<section class="hero">' +
      '<p class="eyebrow">生活语文 · 情绪学习</p>' +
      '<h1 class="hero-title">情绪侦探</h1>' +
      '<p class="hero-sub">看一看表情，找一找线索，说一说感受。<br>你就是今天的情绪侦探。</p>' +
      '<div class="hero-actions">' +
      '<button type="button" class="btn btn-primary btn-lg" data-action="start">开始游戏</button>' +
      '<button type="button" class="btn btn-ghost btn-lg" data-action="how">先看玩法</button>' +
      '</div>' +
      '<p class="hero-note">不用说话也能玩 · 答错不扣徽章 · 可以一直重试</p>' +
      '</section>' +

      '<section class="how card" id="howCard">' +
      '<h2>怎么玩</h2>' +
      '<ol class="steps">' +
      '<li><span class="step-num">1</span><div><strong>看一看</strong><p>观察照片里人物的眉毛、眼睛和嘴巴。</p></div></li>' +
      '<li><span class="step-num">2</span><div><strong>想一想</strong><p>点一下你认为对的答案。需要帮忙就点“提示”。</p></div></li>' +
      '<li><span class="step-num">3</span><div><strong>说一说</strong><p>可以用词语、图片或句子表达；不想说也没关系。</p></div></li>' +
      '</ol>' +
      '</section>' +

      '<section class="levels">' +
      '<h2 class="section-title">三个关卡</h2>' +
      '<div class="level-grid">' + cards + '</div>' +
      '</section>' +

      '<section class="card progress-card">' +
      '<div class="progress-line"><span>已完成 ' + doneCount + ' / 3 关</span><span>徽章 ' + state.badges + ' / ' + TOTAL_BADGES + '</span></div>' +
      '<p class="micro">徽章只记录你参与了多少道题，答错不会减少徽章，也不和别的同学比较。</p>' +
      '</section>';
  }

  function levelCard(n) {
    var info = LEVEL_INFO[n];
    var unlocked = state.unlocked >= n;
    var done = state.levelDone[n];
    var stateText = done ? '已完成' : unlocked ? '可以开始' : '未解锁';
    var btnClass = done ? 'btn-ghost' : 'btn-primary';
    var label = done ? '再玩一次' : unlocked ? '开始这一关' : '完成上一关后解锁';
    return '<article class="level-card' + (unlocked ? '' : ' locked') + (done ? ' done' : '') + '">' +
      '<div class="level-top"><span class="level-tag">第' + CN_NUM[n - 1] + '关</span>' +
      '<span class="level-state">' + stateText + '</span></div>' +
      '<h3>' + info.name + '</h3>' +
      '<p>' + info.goal + '</p>' +
      '<button type="button" class="btn ' + btnClass + '" data-action="open-level" data-level="' + n + '"' +
      (unlocked ? '' : ' disabled') + '>' + label + '</button>' +
      '</article>';
  }

  /* ---------------- 第一关 ---------------- */
  function prepareL1() {
    var s = state.l1;
    var q = D.LEVEL1[s.i];
    s.order = shuffle(q.options.slice());
    s.answered = false;
    s.tried = [];
    s.hint = state.hintMode === 'support' ? 1 : 0;
    s.teacherOpen = false;
    s.feedback = null;
    state.timeLeft = 120;
  }

  function wordButton(key, s, action) {
    var e = EMO[key];
    var tried = s.tried && s.tried.indexOf(key) !== -1;
    return '<button type="button" class="option word' + (tried ? ' tried' : '') + '" data-action="' + action + '" data-value="' + key + '">' +
      '<span class="word-label">' + e.label + '</span>' +
      '<span class="pinyin">' + e.pinyin + '</span>' +
      (tried ? '<span class="tried-tag">再想想</span>' : '') +
      '</button>';
  }

  function photoOption(id, s) {
    var p = byId[id];
    var tried = s.tried && s.tried.indexOf(id) !== -1;
    return '<button type="button" class="option photo-option' + (tried ? ' tried' : '') + '" data-action="l1-photo" data-value="' + id + '">' +
      photoHTML(p) +
      (tried ? '<span class="tried-tag">再想想</span>' : '') +
      '</button>';
  }

  function level1View() {
    var s = state.l1;
    var q = D.LEVEL1[s.i];
    var total = D.LEVEL1.length;
    var isPhoto = q.mode === 'photo-to-word';
    var emo = EMO[isPhoto ? q.answer : q.word];
    var prompt = isPhoto
      ? '看看这张照片：照片里的人可能是什么情绪？'
      : '请找出表示「' + emo.label + '」的照片。';

    var media = isPhoto
      ? '<div class="media-single">' + photoHTML(byId[q.photo]) + '</div>'
      : '<div class="word-card"><div class="word-big">' + emo.label + '</div>' +
        '<div class="pinyin-big">' + emo.pinyin + '</div></div>';

    var options = isPhoto
      ? '<div class="options grid-2">' + s.order.map(function (k) { return wordButton(k, s, 'l1-word'); }).join('') + '</div>'
      : '<div class="options photos">' + s.order.map(function (id) { return photoOption(id, s); }).join('') + '</div>';

    var hint = '';
    if (s.hint > 0) {
      var first = isPhoto
        ? '先看看这个人的眉毛、眼睛和嘴巴，再选一个词语。'
        : '「' + emo.label + '」的意思是：' + emo.meaning;
      var second = isPhoto
        ? '这张照片更像「' + emo.label + '」：' + emo.cue + '。'
        : '找一找哪张照片里的人也是「' + emo.label + '」：' + emo.cue + '。';
      hint = '<div class="hintbox"><strong>提示 ' + s.hint + ' / 2</strong><p>' +
        (s.hint === 1 ? first : second) + '</p>' +
        (s.hint === 1 ? '<p class="micro">还想再看一个提示，可以再点一次“提示”。</p>' : '') +
        '</div>';
    }

    var sayBox = '';
    if (s.teacherOpen && !s.answered) {
      sayBox = '<div class="teacher-box"><p><strong>教师协助</strong> 请学生用说的方式回答。老师听到合理的回答后，点下面的按钮确认。</p>' +
        '<div class="actions"><button type="button" class="btn btn-primary" data-action="confirm-say">老师确认：回答合理</button>' +
        '<button type="button" class="btn" data-action="cancel-say">返回，继续自己作答</button></div></div>';
    }

    var actions = '<div class="actions">' +
      '<button type="button" class="btn" data-action="hint">提示</button>' +
      '<button type="button" class="btn" data-action="speak">朗读题目</button>' +
      (!s.answered ? '<button type="button" class="btn" data-action="say">我想说出来</button>' : '') +
      (s.answered
        ? '<button type="button" class="btn btn-primary" data-action="l1-next">' +
          (s.i < total - 1 ? '下一题' : '完成本关') + '</button>'
        : '') +
      '</div>';

    return gameHead(1, '情绪认知站', s.i, total) +
      '<section class="card question">' +
      '<p class="prompt">' + prompt + '</p>' +
      media + options + hint + feedbackHTML(s.feedback) + sayBox + actions +
      '</section>';
  }

  function pickL1(value) {
    var s = state.l1;
    var q = D.LEVEL1[s.i];
    if (s.answered) return;

    if (value === q.answer) {
      s.answered = true;
      s.correct++;
      state.stats[1].done++;
      if (!s.mistakes) state.stats[1].correct++;
      award();
      var label = EMO[q.mode === 'photo-to-word' ? q.answer : q.word].label;
      s.feedback = {
        type: 'ok',
        title: '答对了！',
        text: (q.mode === 'photo-to-word'
          ? '这张照片表达的是「' + label + '」。'
          : '你找到了表示「' + label + '」的照片。') + '你获得了一枚侦探徽章。'
      };
      save();
    } else {
      s.mistakes = (s.mistakes || 0) + 1;
      if (s.tried.indexOf(value) === -1) s.tried.push(value);
      s.feedback = {
        type: 'hint',
        title: '再看一看，没关系。',
        text: '注意这个人的眉毛、眼睛和嘴巴。答错不会扣徽章，你可以再试一次。'
      };
    }
    render();
  }

  function completeL1ByTeacher() {
    var s = state.l1;
    var q = D.LEVEL1[s.i];
    if (s.answered) return;
    s.answered = true;
    s.correct++;
    s.teacherOpen = false;
    state.stats[1].done++;
    state.stats[1].correct++;
    award();
    var label = EMO[q.mode === 'photo-to-word' ? q.answer : q.word].label;
    s.feedback = {
      type: 'ok',
      title: '老师已确认你的回答。',
      text: '你表达的是「' + label + '」。你获得了一枚侦探徽章。'
    };
    save();
    render();
  }

  function nextL1() {
    var s = state.l1;
    if (!s.answered) return;
    if (s.i < D.LEVEL1.length - 1) {
      s.i++;
      prepareL1();
      render();
      speakCurrent(false);
    } else {
      finishLevel(1);
    }
  }

  /* ---------------- 第二关 ---------------- */
  function prepareL2() {
    var s = state.l2;
    var g = D.LEVEL2[s.g];
    s.order = shuffle(g.candidates.slice());
    s.sel = [];
    s.result = null;
    s.hint = state.hintMode === 'support' ? 1 : 0;
    s.feedback = null;
    state.timeLeft = 120;
  }

  function candidateOption(id, s, g) {
    var p = byId[id];
    var selected = s.sel.indexOf(id) !== -1;
    var correct = s.result === 'ok' && g.answers.indexOf(id) !== -1;
    return '<button type="button" class="option photo-option' + (selected ? ' is-selected' : '') + (correct ? ' is-correct' : '') + '" ' +
      'data-action="l2-pick" data-value="' + id + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
      (selected ? '<span class="check">已选</span>' : '') +
      (correct ? '<span class="match-tag">相同情绪</span>' : '') +
      photoHTML(p) +
      '</button>';
  }

  function level2View() {
    var s = state.l2;
    var g = D.LEVEL2[s.g];
    var total = D.LEVEL2.length;
    var target = byId[g.target];

    var hint = '';
    if (s.hint > 0) {
      hint = '<div class="hintbox"><strong>提示 ' + s.hint + ' / 2</strong><p>' +
        (s.hint === 1
          ? '先看看目标照片：' + target.cue + '。'
          : '目标照片表达的是「' + EMO[g.emotion].label + '」。再找一找同样是「' + EMO[g.emotion].label + '」的照片。') +
        '</p></div>';
    }

    return gameHead(2, '情绪配对站', s.g, total,
        '<span class="level-note">' + g.level + '</span>', '组') +
      '<section class="card question">' +
      '<p class="prompt">找出和目标照片情绪相同的照片（可以选多张）。</p>' +
      '<p class="micro" style="margin:-10px 0 18px">' + esc(g.note) + '</p>' +
      '<div class="pair-layout">' +
      '<div class="target-block"><p class="micro">目标照片</p>' + photoHTML(target) + '</div>' +
      '<div class="candidate-block">' +
      '<div class="options photos two-col">' + s.order.map(function (id) { return candidateOption(id, s, g); }).join('') + '</div>' +
      '</div></div>' +
      hint + feedbackHTML(s.feedback) +
      '<div class="actions">' +
      '<button type="button" class="btn" data-action="hint">提示</button>' +
      '<button type="button" class="btn" data-action="speak">朗读题目</button>' +
      (s.result !== 'ok'
        ? '<button type="button" class="btn btn-primary" data-action="l2-check"' + (s.sel.length ? '' : ' disabled') + '>确认选择</button>'
        : '<button type="button" class="btn btn-primary" data-action="l2-next">' + (s.g < total - 1 ? '下一组' : '完成本关') + '</button>') +
      '</div>' +
      '</section>';
  }

  function togglePickL2(id) {
    var s = state.l2;
    if (s.result === 'ok') return;
    var i = s.sel.indexOf(id);
    if (i === -1) s.sel.push(id);
    else s.sel.splice(i, 1);
    s.feedback = null;
    render();
  }

  function checkL2() {
    var s = state.l2;
    var g = D.LEVEL2[s.g];
    if (s.result === 'ok' || !s.sel.length) return;

    var same = s.sel.length === g.answers.length &&
      g.answers.every(function (id) { return s.sel.indexOf(id) !== -1; });

    if (same) {
      s.result = 'ok';
      state.stats[2].done++;
      if (!s.mistakes) state.stats[2].correct++;
      award();
      s.feedback = {
        type: 'ok',
        title: '正确！',
        text: '这些照片中的人物都表现出「' + EMO[g.emotion].label + '」的情绪。不同的人，也可以用同样的方式表达同一种感受。'
      };
      save();
    } else {
      s.mistakes = (s.mistakes || 0) + 1;
      var found = s.sel.filter(function (id) { return g.answers.indexOf(id) !== -1; }).length;
      var text;
      if (found === 0) {
        text = '先仔细看看目标照片里的眼睛和嘴巴，再挑一张试试。';
      } else if (found < g.answers.length) {
        text = '你找到了一部分。再看一看，还有没有照片里的情绪和目标一样？';
      } else {
        text = '你找对了，不过还多选了照片。其中有一张的情绪和目标不一样，再看看眼睛和嘴巴。';
      }
      s.feedback = {
        type: 'hint',
        title: '再观察一下。',
        text: text + '答错不会扣徽章，可以重新选择。'
      };
    }
    render();
  }

  function nextL2() {
    var s = state.l2;
    if (s.result !== 'ok') return;
    if (s.g < D.LEVEL2.length - 1) {
      s.g++;
      prepareL2();
      render();
      speakCurrent(false);
    } else {
      finishLevel(2);
    }
  }

  /* ---------------- 第三关 ---------------- */
  function prepareL3() {
    var s = state.l3;
    s.step = 'choose';
    s.emotion = null;
    s.clue = state.hintMode === 'support';
    s.reason = null;
    s.custom = '';
    s.result = null;
    s.teacherOpen = false;
    s.feedback = null;
    state.timeLeft = 120;
  }

  function emotionOption(key, selected) {
    if (key === 'unsure') {
      return '<button type="button" class="option word' + (selected ? ' is-selected' : '') + '" ' +
        'data-action="l3-emotion" data-value="unsure" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
        '<span class="word-label small">不确定</span>' +
        '<span class="pinyin">还需要更多线索</span></button>';
    }
    var e = EMO[key];
    return '<button type="button" class="option word' + (selected ? ' is-selected' : '') + '" ' +
      'data-action="l3-emotion" data-value="' + key + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
      '<span class="word-label">' + e.label + '</span>' +
      '<span class="pinyin">' + e.pinyin + '</span></button>';
  }

  function cluesHTML(sc, open) {
    if (!open) return '';
    return '<div class="clues"><strong>情境线索</strong><ul>' +
      sc.clues.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') +
      '</ul></div>';
  }

  function level3View() {
    var s = state.l3;
    var sc = D.LEVEL3[s.i];
    var total = D.LEVEL3.length;
    var sceneBlock = '<div class="scene-wrap">' + sceneHTML(D.SCENES[sc.scene]) +
      '<div class="story"><p class="story-title">' + esc(sc.title) + '</p>' +
      '<p>' + esc(sc.story) + '</p>' +
      '<p class="behavior">' + esc(sc.behavior) + '</p></div></div>';

    var body = '';
    if (s.step === 'choose') {
      var options = '<div class="options grid-2">' +
        sc.options.map(function (k) { return emotionOption(k, s.emotion === k); }).join('') + '</div>';
      body = '<p class="prompt">你觉得' + esc(sc.subject) + '此时可能有什么感受？</p>' +
        options +
        '<div class="actions">' +
        '<button type="button" class="btn" data-action="l3-clue" aria-expanded="' + (s.clue ? 'true' : 'false') + '">' +
        (s.clue ? '收起情境线索' : '查看情境线索') + '</button>' +
        '<button type="button" class="btn" data-action="speak">朗读故事</button>' +
        '<button type="button" class="btn btn-primary" data-action="l3-to-sentence"' +
        (!s.emotion || s.emotion === 'unsure' ? ' disabled' : '') + '>下一步：说说理由</button>' +
        '</div>' +
        cluesHTML(sc, s.clue) + feedbackHTML(s.feedback);
    } else {
      var reasonObj = null;
      if (s.reason) {
        sc.reasons.forEach(function (r) { if (r.id === s.reason) reasonObj = r; });
      }
      var reasonText = reasonObj ? reasonObj.text : (s.custom.trim() ? s.custom.trim() : '');
      var emo = EMO[s.emotion] || { label: '' };

      var chips = sc.reasons.map(function (r) {
        return '<button type="button" class="chip' + (s.reason === r.id ? ' is-selected' : '') + '" ' +
          'data-action="l3-reason" data-value="' + r.id + '">' + esc(r.text) + '</button>';
      }).join('');

      var sayPanel = '';
      if (s.teacherOpen && s.result !== 'ok') {
        sayPanel = '<div class="teacher-box"><p><strong>教师协助</strong> 学生可以用口头方式说出“觉得……因为……”。老师听完后确认即可。</p>' +
          '<div class="actions"><button type="button" class="btn btn-primary" data-action="l3-confirm-say">老师确认：学生已说明理由</button>' +
          '<button type="button" class="btn" data-action="l3-cancel-say">返回</button></div></div>';
      }

      body = '<p class="prompt">把句子补充完整，再说一说你的理由。</p>' +
        '<div class="sentence-box"><p class="sentence">' + esc(sc.subject) + '可能觉得' +
        '<span class="slot filled">' + esc(emo.label) + '</span>，因为' +
        '<span class="slot' + (reasonText ? ' filled' : '') + '">' + esc(reasonText || '……') + '</span>。</p></div>' +
        '<p class="micro">选一个理由，也可以用自己的话写一写。</p>' +
        '<div class="chips">' + chips + '</div>' +
        '<label class="custom-label">用自己的话说（可以请老师帮忙写）' +
        '<textarea id="customReason" rows="2" placeholder="例如：因为她搭了很久的积木倒了">' + esc(s.custom) + '</textarea></label>' +
        '<div class="actions">' +
        '<button type="button" class="btn" data-action="l3-back">重新选择感受</button>' +
        '<button type="button" class="btn" data-action="l3-say">我说给老师听</button>' +
        '<button type="button" class="btn" data-action="speak">朗读句子</button>' +
        (s.result === 'ok'
          ? '<button type="button" class="btn btn-primary" data-action="l3-next">' +
            (s.i < total - 1 ? '下一题' : '完成本关') + '</button>'
          : '<button type="button" class="btn btn-primary" id="l3Submit" data-action="l3-submit"' +
            (!(s.reason || s.custom.trim()) ? ' disabled' : '') + '>提交我的句子</button>') +
        '</div>' +
        feedbackHTML(s.feedback) + sayPanel +
        (s.clue ? cluesHTML(sc, true) : '');
    }

    return gameHead(3, '情境推理站', s.i, total) +
      '<section class="card question">' + sceneBlock + body + '</section>';
  }

  function chooseL3Emotion(key) {
    var s = state.l3;
    var sc = D.LEVEL3[s.i];
    if (s.result === 'ok') return;
    s.emotion = key;
    if (key === 'unsure') {
      s.clue = true;
      s.feedback = {
        type: 'info',
        title: '不确定也没关系。',
        text: '我们先看看故事里的线索，再选一次。'
      };
    } else {
      s.feedback = {
        type: 'info',
        title: '你选择了「' + EMO[key].label + '」。',
        text: '如果还想改，可以重新选择。接下来，我们说一说理由。'
      };
    }
    render();
  }

  function l3ToSentence() {
    var s = state.l3;
    if (!s.emotion || s.emotion === 'unsure') return;
    s.step = 'sentence';
    s.feedback = null;
    s.result = null;
    render();
    speakCurrent(false);
  }

  function l3Back() {
    var s = state.l3;
    if (s.result === 'ok') return;
    s.step = 'choose';
    s.reason = null;
    s.custom = '';
    s.feedback = null;
    render();
  }

  function l3ChooseReason(id) {
    var s = state.l3;
    if (s.result === 'ok') return;
    s.reason = s.reason === id ? null : id;
    if (s.reason) s.custom = '';
    render();
  }

  function submitL3() {
    var s = state.l3;
    var sc = D.LEVEL3[s.i];
    var ta = document.getElementById('customReason');
    if (ta) s.custom = ta.value;

    var chosenReason = null;
    sc.reasons.forEach(function (r) { if (r.id === s.reason) chosenReason = r; });
    var hasReason = !!(chosenReason || s.custom.trim());

    if (!s.emotion || s.emotion === 'unsure') {
      s.feedback = {
        type: 'info',
        title: '先选一个感受吧。',
        text: '可以点“查看情境线索”，再选一个你觉得可能的感受。'
      };
      s.clue = true;
      render();
      return;
    }
    if (!hasReason) {
      s.feedback = { type: 'hint', title: '还差一个理由。', text: '从下面的理由里选一个，或者用自己的话写一写。' };
      render();
      return;
    }

    var emoOk = sc.accepted.indexOf(s.emotion) !== -1;
    if (!emoOk) {
      s.mistakes = (s.mistakes || 0) + 1;
      s.feedback = {
        type: 'hint',
        title: '这个感受有可能，不过故事里的线索更像另一种。',
        text: sc.guide + '你可以重新选一个感受，再试一次。'
      };
      s.clue = true;
      s.step = 'choose';
      s.reason = null;
      s.custom = '';
      render();
      return;
    }

    if (chosenReason && !chosenReason.ok) {
      s.mistakes = (s.mistakes || 0) + 1;
      s.feedback = {
        type: 'hint',
        title: '这个理由在故事里没有出现。',
        text: '点“查看情境线索”，从故事里的信息中选一个理由，再说一次。'
      };
      s.clue = true;
      render();
      return;
    }

    s.result = 'ok';
    state.stats[3].done++;
    if (!s.mistakes) state.stats[3].correct++;
    award();
    var label = EMO[s.emotion].label;
    var why = chosenReason ? chosenReason.text : s.custom.trim();
    s.feedback = {
      type: 'ok',
      title: '说得很好！',
      text: sc.subject + '可能觉得「' + label + '」，因为' + why + '。' +
        (chosenReason
          ? '你结合故事里的线索说出了自己的理由，这就是侦探的做法。'
          : '你用自己的话写下了理由，可以请老师和你一起读一读这个句子。')
    };
    save();
    render();
  }

  function l3TeacherConfirm() {
    var s = state.l3;
    if (s.result === 'ok') return;
    s.result = 'ok';
    s.teacherOpen = false;
    state.stats[3].done++;
    state.stats[3].correct++;
    award();
    s.feedback = {
      type: 'ok',
      title: '老师已经听到你的想法。',
      text: '你用自己的方式说出了感受和理由，很棒。'
    };
    save();
    render();
  }

  function nextL3() {
    var s = state.l3;
    if (s.result !== 'ok') return;
    if (s.i < D.LEVEL3.length - 1) {
      s.i++;
      prepareL3();
      render();
      speakCurrent(false);
    } else {
      finishLevel(3);
    }
  }

  /* ---------------- 关卡完成 / 通关 ---------------- */
  function finishLevel(n) {
    state.levelDone[n] = true;
    if (n < 3) state.unlocked = Math.max(state.unlocked, n + 1);
    state.completeLevel = n;
    state.screen = n < 3 ? 'complete' : 'finale';
    save();
    render();
  }

  function completeView() {
    var n = state.completeLevel || 1;
    var info = LEVEL_INFO[n];
    var st = state.stats[n];
    var hasNext = n < 3;
    return '<section class="card complete">' +
      '<p class="eyebrow">第' + CN_NUM[n - 1] + '关完成</p>' +
      '<h2>' + info.name + '，完成啦！</h2>' +
      '<p class="micro">你完成了 ' + st.done + ' 道题，收集到 ' + st.done + ' 枚侦探徽章。</p>' +
      '<div class="stat-row">' +
      '<div class="stat"><b>' + st.done + '</b><span>完成题数</span></div>' +
      '<div class="stat"><b>' + st.correct + '</b><span>一次答对</span></div>' +
      '<div class="stat"><b>' + state.badges + '</b><span>徽章总数</span></div>' +
      '</div>' +
      (hasNext
        ? '<p>下一关「' + LEVEL_INFO[n + 1].name + '」已经解锁。</p>' +
          '<div class="actions"><button type="button" class="btn btn-primary btn-lg" data-action="next-level">进入第' + CN_NUM[n] + '关</button>' +
          '<button type="button" class="btn btn-ghost btn-lg" data-action="home">回到首页</button></div>'
        : '<div class="actions"><button type="button" class="btn btn-primary btn-lg" data-action="home">查看通关证书</button></div>') +
      '<p class="micro" style="margin-top:20px">“一次答对”只给老师了解练习情况，不排名，也不和别的同学比较。</p>' +
      '</section>';
  }

  function finaleView() {
    var allDone = state.levelDone[1] && state.levelDone[2] && state.levelDone[3];
    return '<section class="card complete">' +
      '<p class="eyebrow">' + (allDone ? '全部通关' : '通关页') + '</p>' +
      '<h2>恭喜你，成为情绪侦探！</h2>' +
      '<div class="certificate">' +
      '<div class="seal">侦探</div>' +
      '<h3>情绪侦探证书</h3>' +
      '<p>你完成了情绪认知站、情绪配对站和情境推理站。</p>' +
      '<p>一共收集了 <b>' + state.badges + '</b> 枚侦探徽章。</p>' +
      '<p class="micro">徽章记录的是你的参与，不是分数。</p>' +
      '</div>' +
      '<p class="micro">你可以随时回到任意一关再练习一次。</p>' +
      '<div class="actions">' +
      '<button type="button" class="btn btn-primary btn-lg" data-action="home">回到首页</button>' +
      '<button type="button" class="btn btn-ghost btn-lg" data-action="open-level" data-level="1">再玩第一关</button>' +
      '</div>' +
      '</section>';
  }

  /* ---------------- 教师面板 ---------------- */
  function renderModal() {
    if (!state.modalOpen) {
      modalRoot.innerHTML = '';
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    var rows = [1, 2, 3].map(function (n) {
      return '<div><span>第' + CN_NUM[n - 1] + '关 ' + LEVEL_INFO[n].name + '</span>' +
        '<span>完成 ' + state.stats[n].done + ' 题 · 一次答对 ' + state.stats[n].correct + ' 题</span></div>';
    }).join('');

    var restartBox = state.restartPending
      ? '<div class="warn">确定要清空进度、重新开始吗？徽章和关卡解锁都会回到最初。<div class="actions">' +
        '<button type="button" class="btn btn-primary" data-action="restart-confirm">确定重新开始</button>' +
        '<button type="button" class="btn" data-action="restart-cancel">取消</button></div></div>'
      : '';

    modalRoot.innerHTML = '<div class="modal-backdrop" data-action="backdrop">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="teacherTitle">' +
      '<h2 id="teacherTitle">教师设置</h2>' +
      '<p class="micro">这里的数据只保存在本机浏览器中，不会上传，也没有账号系统。</p>' +
      '<div class="teacher-stats">' + rows +
      '<div><span>徽章总数</span><span>' + state.badges + ' / ' + TOTAL_BADGES + '</span></div></div>' +
      '<div class="settings">' +
      '<div class="setting-row"><div class="setting-label">语音朗读<span>使用浏览器自带的中文朗读，需要手动开启</span></div>' +
      '<button type="button" class="btn btn-small" data-action="toggle-sound">' + (state.soundOn ? '已开启' : '已关闭') + '</button></div>' +
      '<div class="setting-row"><div class="setting-label">提示方式<span>“更多提示”会在题目开始时先显示一条观察提示</span></div>' +
      '<div class="segmented">' +
      '<button type="button" class="btn btn-small' + (state.hintMode === 'standard' ? ' is-active' : '') + '" data-action="hint-mode" data-value="standard">标准</button>' +
      '<button type="button" class="btn btn-small' + (state.hintMode === 'support' ? ' is-active' : '') + '" data-action="hint-mode" data-value="support">更多提示</button>' +
      '</div></div>' +
      '<div class="setting-row"><div class="setting-label">第二关起始难度<span>学生可以从较简单的一组开始，也可以直接练习进阶组</span></div>' +
      '<div class="segmented">' +
      '<button type="button" class="btn btn-small' + (state.l2Start === 0 ? ' is-active' : '') + '" data-action="l2-start" data-value="0">初级</button>' +
      '<button type="button" class="btn btn-small' + (state.l2Start === 1 ? ' is-active' : '') + '" data-action="l2-start" data-value="1">中级</button>' +
      '<button type="button" class="btn btn-small' + (state.l2Start === 2 ? ' is-active' : '') + '" data-action="l2-start" data-value="2">进阶</button>' +
      '</div></div>' +
      '<div class="setting-row"><div class="setting-label">倒计时<span>默认关闭；开启后只显示剩余时间，时间到也不会失败或扣分</span></div>' +
      '<button type="button" class="btn btn-small" data-action="toggle-timer">' + (state.timerOn ? '已开启' : '已关闭') + '</button></div>' +
      '<div class="setting-row"><div class="setting-label">解锁全部关卡<span>方便教师提前查看第三关内容</span></div>' +
      '<button type="button" class="btn btn-small" data-action="unlock-all">解锁全部</button></div>' +
      '</div>' +
      restartBox +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-small" data-action="restart">重新开始</button>' +
      '<button type="button" class="btn btn-small btn-primary" data-action="close-modal" id="closeModalBtn">关闭</button>' +
      '</div></div></div>';
  }

  function openTeacher() {
    state.modalOpen = true;
    state.restartPending = false;
    render();
    var b = document.getElementById('closeModalBtn');
    if (b) b.focus();
  }

  function closeModal() {
    state.modalOpen = false;
    state.restartPending = false;
    render();
    var t = document.querySelector('[data-action="teacher"]');
    if (t) t.focus();
  }

  function restartAll() {
    state.unlocked = 1;
    state.badges = 0;
    state.levelDone = { 1: false, 2: false, 3: false };
    state.stats = { 1: { done: 0, correct: 0 }, 2: { done: 0, correct: 0 }, 3: { done: 0, correct: 0 } };
    state.l1 = state.l2 = state.l3 = null;
    state.completeLevel = null;
    state.modalOpen = false;
    state.restartPending = false;
    state.screen = 'home';
    try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
    render();
  }

  /* ---------------- 导航与通用动作 ---------------- */
  function goHome() {
    state.screen = 'home';
    state.l1 = state.l2 = state.l3 = null;
    state.completeLevel = null;
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
    }
    render();
  }

  function startFlow() {
    var n;
    for (n = 1; n <= 3; n++) {
      if (state.unlocked >= n && !state.levelDone[n]) {
        startLevel(n);
        return;
      }
    }
    if (state.levelDone[1] && state.levelDone[2] && state.levelDone[3]) {
      state.screen = 'finale';
      render();
      return;
    }
    startLevel(state.unlocked);
  }

  function startLevel(n) {
    state.stats[n] = { done: 0, correct: 0 };
    state.timeLeft = 120;
    if (n === 1) {
      state.screen = 'level1';
      state.l1 = { i: 0, answered: false, correct: 0, mistakes: 0, tried: [], hint: 0, order: [], teacherOpen: false, feedback: null };
      prepareL1();
    } else if (n === 2) {
      state.screen = 'level2';
      state.l2 = { g: state.l2Start, sel: [], result: null, mistakes: 0, hint: 0, order: [], feedback: null };
      prepareL2();
    } else {
      state.screen = 'level3';
      state.l3 = { i: 0, step: 'choose', emotion: null, clue: false, reason: null, custom: '', result: null, mistakes: 0, teacherOpen: false, feedback: null };
      prepareL3();
    }
    save();
    render();
    speakCurrent(false);
  }

  function doHint() {
    if (state.screen === 'level1' && state.l1 && !state.l1.answered) {
      state.l1.hint = Math.min(2, state.l1.hint + 1);
      render();
    } else if (state.screen === 'level2' && state.l2 && state.l2.result !== 'ok') {
      state.l2.hint = Math.min(2, state.l2.hint + 1);
      render();
    } else if (state.screen === 'level3' && state.l3) {
      state.l3.clue = !state.l3.clue;
      render();
    }
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    if (!state.soundOn && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
    }
    save();
    render();
  }

  function captureTextarea() {
    var ta = document.getElementById('customReason');
    if (ta && state.l3 && state.l3.step === 'sentence') {
      state.l3.custom = ta.value;
    }
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.dataset.action;

    if (action === 'backdrop') {
      if (e.target === el) closeModal();
      return;
    }

    captureTextarea();

    switch (action) {
      case 'home':
        goHome();
        break;
      case 'start':
        startFlow();
        break;
      case 'how': {
        var c = document.getElementById('howCard');
        if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'open-level': {
        var n = Number(el.dataset.level);
        if (n >= 1 && n <= 3 && n <= state.unlocked) startLevel(n);
        break;
      }
      case 'next-level':
        if (state.completeLevel && state.completeLevel < 3) startLevel(state.completeLevel + 1);
        break;

      case 'l1-word':
      case 'l1-photo':
        if (state.screen === 'level1') pickL1(el.dataset.value);
        break;
      case 'l1-next':
        nextL1();
        break;

      case 'l2-pick':
        if (state.screen === 'level2') togglePickL2(el.dataset.value);
        break;
      case 'l2-check':
        checkL2();
        break;
      case 'l2-next':
        nextL2();
        break;

      case 'l3-emotion':
        chooseL3Emotion(el.dataset.value);
        break;
      case 'l3-clue':
        if (state.l3) { state.l3.clue = !state.l3.clue; render(); }
        break;
      case 'l3-to-sentence':
        l3ToSentence();
        break;
      case 'l3-reason':
        l3ChooseReason(el.dataset.value);
        break;
      case 'l3-submit':
        submitL3();
        break;
      case 'l3-back':
        l3Back();
        break;
      case 'l3-next':
        nextL3();
        break;
      case 'l3-say':
        if (state.l3) { state.l3.teacherOpen = true; render(); }
        break;
      case 'l3-cancel-say':
        if (state.l3) { state.l3.teacherOpen = false; render(); }
        break;
      case 'l3-confirm-say':
        l3TeacherConfirm();
        break;

      case 'hint':
        doHint();
        break;
      case 'speak':
        speakCurrent(true);
        break;
      case 'say':
        if (state.l1 && !state.l1.answered) { state.l1.teacherOpen = true; render(); }
        break;
      case 'cancel-say':
        if (state.l1) { state.l1.teacherOpen = false; render(); }
        break;
      case 'confirm-say':
        completeL1ByTeacher();
        break;

      case 'toggle-sound':
        toggleSound();
        break;
      case 'teacher':
        openTeacher();
        break;
      case 'close-modal':
        closeModal();
        break;
      case 'hint-mode':
        state.hintMode = el.dataset.value === 'support' ? 'support' : 'standard';
        save();
        render();
        break;
      case 'l2-start':
        state.l2Start = Math.min(2, Math.max(0, Number(el.dataset.value) || 0));
        save();
        render();
        break;
      case 'toggle-timer':
        state.timerOn = !state.timerOn;
        if (state.timerOn) state.timeLeft = 120;
        save();
        render();
        break;
      case 'unlock-all':
        state.unlocked = 3;
        save();
        render();
        break;
      case 'restart':
        state.restartPending = true;
        render();
        break;
      case 'restart-cancel':
        state.restartPending = false;
        render();
        break;
      case 'restart-confirm':
        restartAll();
        break;
      default:
        break;
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'customReason' && state.l3) {
      state.l3.custom = e.target.value;
      var btn = document.getElementById('l3Submit');
      if (btn) btn.disabled = !(state.l3.reason || e.target.value.trim());
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.modalOpen) closeModal();
  });

  /* ---------------- 启动 ---------------- */
  // 注入一个极轻量的全局钩子，供 photoHTML / sceneHTML 里内联 onload 调用来记录已加载 url。
  // 这是避免图片"闪一下"的关键：同一 URL 第二次 render 时，容器一开始就有 `.loaded` 类。
  window._markLoaded = function (url) { loadedUrls[url] = true; };

  load();
  render();
})();
