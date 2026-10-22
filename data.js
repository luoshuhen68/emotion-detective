/* ============================================================
   《情绪侦探》数据配置
   ------------------------------------------------------------
   想改题目、情绪词或照片，只需要修改本文件：
   1) EMOTIONS  —— 情绪词语（名称、拼音、解释、表情线索）
   2) PHOTOS    —— 人物照片（id、情绪、人物描述、表情线索、图片地址）
   3) LEVEL1    —— 第一关题目
   4) LEVEL2    —— 第二关配对组
   5) LEVEL3    —— 第三关情境
   6) SCENES    —— 第三关情境图片
   图片地址可以整体替换成你自己的图床地址（建议方形、正面、半身、
   背景简洁的真实照片）。图片加载失败时页面会自动显示文字线索，
   不会出现空白或卡住。
   ============================================================ */
(function () {
  'use strict';

  const API = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';
  function imgUrl(prompt, size) {
    return API + '?prompt=' + encodeURIComponent(prompt) + '&image_size=' + (size || 'square');
  }

  const PORTRAIT_STYLE = '真实摄影风格，半身正面照，纯色浅背景，柔和自然光，画面干净，没有文字和水印，';
  const SCENE_STYLE = '真实摄影风格，生活场景，柔和自然光，画面干净简洁，没有文字和水印，';

  const EMOTIONS = {
    happy: { label: '开心', pinyin: 'kāi xīn', meaning: '心里很高兴，想笑。', cue: '嘴角向上，眼睛弯弯的' },
    sad: { label: '难过', pinyin: 'nán guò', meaning: '心里不舒服，想哭。', cue: '嘴角向下，眼睛湿湿的' },
    angry: { label: '生气', pinyin: 'shēng qì', meaning: '心里很气愤，不想说话。', cue: '皱着眉头，嘴唇抿紧' },
    scared: { label: '害怕', pinyin: 'hài pà', meaning: '心里紧张，想躲起来。', cue: '眼睛睁得很大，身体往后缩' },
    surprised: { label: '惊讶', pinyin: 'jīng yà', meaning: '没想到，很意外。', cue: '眉毛抬高，嘴巴张开' },
    disappointed: { label: '失望', pinyin: 'shī wàng', meaning: '希望落空了，心里不好受。', cue: '低头，叹气' },
    delighted: { label: '惊喜', pinyin: 'jīng xǐ', meaning: '又意外又高兴。', cue: '眼睛发亮，笑起来' },
    grateful: { label: '感激', pinyin: 'gǎn jī', meaning: '谢谢别人对自己的帮助。', cue: '看着对方，认真地说谢谢' },
    sorry: { label: '抱歉', pinyin: 'bào qiàn', meaning: '觉得自己给别人添了麻烦。', cue: '低着头，小声说对不起' },
    worried: { label: '担心', pinyin: 'dān xīn', meaning: '怕事情变得不好。', cue: '眉头轻轻皱着，心里不踏实' },
    lonely: { label: '孤单', pinyin: 'gū dān', meaning: '身边没有人陪，心里空空的。', cue: '一个人待着，有点安静' }
  };

  /* 每个人物都有独立的外貌描述，同一情绪由不同的人表达。 */
  const PHOTOS = [
    {
      id: 'h1', emotion: 'happy', cue: '嘴角向上，眼睛弯弯的',
      person: '一位 8 岁的女孩，齐肩短发，穿浅蓝色 T 恤',
      url: 'images/h1.jpg',
    },
    {
      id: 'h2', emotion: 'happy', cue: '笑得很开，露出牙齿',
      person: '一位 10 岁的男孩，圆脸，短寸头，穿白色卫衣',
      url: 'images/h2.jpg',
    },
    {
      id: 'h3', emotion: 'happy', cue: '头微微上扬，笑容自然',
      person: '一位 12 岁的女孩，扎马尾，穿米色毛衣',
      url: 'images/h3.jpg',
    },
    {
      id: 'h4', emotion: 'happy', cue: '嘴角轻轻向上，笑得很安静',
      person: '一位 13 岁的女孩，双辫，穿淡粉色外套',
      url: 'images/h4.jpg',
    },
    {
      id: 's1', emotion: 'sad', cue: '嘴角向下，眼睛里有泪水',
      person: '一位 12 岁的女孩，扎马尾，穿米色毛衣',
      url: 'images/s1.jpg',
    },
    {
      id: 's2', emotion: 'sad', cue: '嘴抿着，眼睛湿湿的',
      person: '一位 9 岁的男孩，戴黑框眼镜，穿格子衬衫',
      url: 'images/s2.jpg',
    },
    {
      id: 's3', emotion: 'sad', cue: '眼睛红红的，快哭了',
      person: '一位 7 岁的男孩，卷发，穿黄色 T 恤',
      url: 'images/s3.jpg',
    },
    {
      id: 's4', emotion: 'sad', cue: '眼神低落，表情安静',
      person: '一位 15 岁的女孩，长发，穿浅灰色上衣',
      url: 'images/s4.jpg',
    },
    {
      id: 'a1', emotion: 'angry', cue: '皱眉头，嘴唇紧闭',
      person: '一位 10 岁的男孩，圆脸，短寸头，穿白色卫衣',
      url: 'images/a1.jpg',
    },
    {
      id: 'a2', emotion: 'angry', cue: '皱着眉，瞪着前方',
      person: '一位 16 岁的男孩，短发，穿深蓝色上衣',
      url: 'images/a2.jpg',
    },
    {
      id: 'a3', emotion: 'angry', cue: '皱着眉，双手握紧',
      person: '一位 8 岁的女孩，齐肩短发，穿浅蓝色 T 恤',
      url: 'images/a3.jpg',
    },
    {
      id: 'f1', emotion: 'scared', cue: '眼睛睁大，身体往后缩',
      person: '一位 8 岁的女孩，齐肩短发，穿浅蓝色 T 恤',
      url: 'images/f1.jpg',
    },
    {
      id: 'f2', emotion: 'scared', cue: '张大嘴巴，眼睛睁圆',
      person: '一位 7 岁的男孩，卷发，穿黄色 T 恤',
      url: 'images/f2.jpg',
    },
    {
      id: 'f3', emotion: 'scared', cue: '缩着肩膀，眼神紧张',
      person: '一位 9 岁的男孩，戴黑框眼镜，穿格子衬衫',
      url: 'images/f3.jpg',
    },
    {
      id: 'u1', emotion: 'surprised', cue: '眉毛抬高，嘴巴微张',
      person: '一位 12 岁的女孩，扎马尾，穿米色毛衣',
      url: 'images/u1.jpg',
    },
    {
      id: 'u2', emotion: 'surprised', cue: '眉毛上扬，嘴巴张开',
      person: '一位 16 岁的男孩，短发，穿深蓝色上衣',
      url: 'images/u2.jpg'
    },
    {
      id: 'u3', emotion: 'surprised', cue: '眼睛睁大，微微张嘴',
      person: '一位 10 岁的男孩，圆脸，短寸头，穿白色卫衣',
      url: 'images/u3.jpg'
    }
  ];

  /* ---------------- 第一关：情绪认知站 ---------------- */
  /* photo-to-word：看照片选词语；word-to-photo：看词语选照片 */
  const LEVEL1 = [
    {
      mode: 'photo-to-word', photo: 'h3', answer: 'happy',
      options: ['happy', 'sad', 'angry', 'scared']
    },
    {
      mode: 'photo-to-word', photo: 's2', answer: 'sad',
      options: ['sad', 'scared', 'surprised', 'happy']
    },
    {
      mode: 'photo-to-word', photo: 'a3', answer: 'angry',
      options: ['angry', 'sad', 'surprised', 'scared']
    },
    {
      mode: 'photo-to-word', photo: 'f2', answer: 'scared',
      options: ['scared', 'angry', 'happy', 'sad']
    },
    {
      mode: 'word-to-photo', word: 'surprised', answer: 'u3',
      options: ['u3', 'h1', 's3', 'a1']
    },
    {
      mode: 'word-to-photo', word: 'sad', answer: 's1',
      options: ['s1', 'u2', 'h3', 'f3']
    }
  ];

  /* ---------------- 第二关：情绪配对站 ---------------- */
  /* candidates 中 answers 为正确项，均与 target 的情绪一致 */
  const LEVEL2 = [
    {
      level: '初级', target: 'h1', emotion: 'happy',
      candidates: ['h2', 'h3', 's1'], answers: ['h2', 'h3'],
      note: '这一组只有 3 张照片，表情比较明显。'
    },
    {
      level: '中级', target: 'u2', emotion: 'surprised',
      candidates: ['u1', 'u3', 'h2', 'f3'], answers: ['u1', 'u3'],
      note: '这一组有 4 张照片，人物年龄和外貌都不一样。'
    },
    {
      level: '进阶', target: 's4', emotion: 'sad',
      candidates: ['s1', 's3', 'h4', 'a3'], answers: ['s1', 's3'],
      note: '这一组表情比较细微，要仔细看看眼睛和嘴角。'
    }
  ];

  /* ---------------- 第三关：情境推理站 ---------------- */
  /* accepted：合理的情绪（可多选其一）；reasons 中 ok:false 为故事里
     没有出现过的理由，用来练习“依据线索说理由”。 */
  const LEVEL3 = [
    {
      scene: 'blocks', subject: '小红', title: '倒下的积木塔',
      story: '小红花了很长时间，终于搭好了一座高高的积木塔。就在她准备给老师看时，积木塔突然倒了。',
      behavior: '她站在积木旁边，低头看着地上的积木。',
      options: ['sad', 'happy', 'angry', 'unsure'],
      accepted: ['sad', 'disappointed', 'angry'],
      clues: ['小红花了很长时间搭积木。', '她原本想搭好后给老师看。', '积木塔突然倒了，她的努力一下子白费了。'],
      reasons: [
        { id: 'r1', text: '她花了很长时间搭积木', ok: true },
        { id: 'r2', text: '她很想把作品给老师看', ok: true },
        { id: 'r3', text: '积木塔突然倒了', ok: true },
        { id: 'r4', text: '同学把她的积木推倒了', ok: false }
      ],
      guide: '小红努力搭好的积木倒了，她还想给老师看，所以难过或生气都是合理的；选“开心”不太符合故事里的线索。'
    },
    {
      scene: 'gift', subject: '小宇', title: '期待已久的礼物',
      story: '小宇一直很想要一盒新的水彩笔。生日这天，妈妈把礼物递给他。他打开盒子，里面正是那盒水彩笔。',
      behavior: '他把盒子抱在怀里，看了又看。',
      options: ['happy', 'scared', 'sad', 'unsure'],
      accepted: ['happy', 'delighted', 'surprised'],
      clues: ['小宇一直想要一盒水彩笔。', '今天是他的生日。', '礼物盒里正是他想要的那盒水彩笔。'],
      reasons: [
        { id: 'r1', text: '他一直想要这盒水彩笔', ok: true },
        { id: 'r2', text: '礼物正好是他想要的', ok: true },
        { id: 'r3', text: '今天是他的生日', ok: true },
        { id: 'r4', text: '礼物不是他喜欢的', ok: false }
      ],
      guide: '小宇一直想要的彩笔出现在礼物盒里，他可能会开心，也可能觉得很满足；选“害怕”不太符合故事里的线索。'
    },
    {
      scene: 'empty', subject: '小安', title: '空着的座位',
      story: '课间，小安拿着两个球拍去找好朋友小杰打球。到了教室，他发现小杰的座位是空的。原来小杰今天请假了。',
      behavior: '小安把两个球拍放在桌上，站着看了一会儿空座位。',
      options: ['sad', 'scared', 'happy', 'unsure'],
      accepted: ['sad', 'disappointed', 'lonely'],
      clues: ['小安很想和小杰一起打球。', '他专门带了两个球拍。', '小杰今天请假，不在教室。'],
      reasons: [
        { id: 'r1', text: '他本来很想和小杰打球', ok: true },
        { id: 'r2', text: '小杰今天不在学校', ok: true },
        { id: 'r3', text: '他带来的球拍用不上了', ok: true },
        { id: 'r4', text: '小杰生他的气了', ok: false }
      ],
      guide: '小安本来很期待一起打球，但小杰请假了，他可能会难过；选“害怕”不太符合故事里的线索。'
    },
    {
      scene: 'stationery', subject: '小然', title: '碰倒的文具盒',
      story: '下课了，小然在走廊上跑，不小心碰倒了同学桌上的文具盒。铅笔和橡皮散了一地。这时，同学正好走进来。',
      behavior: '小然停下脚步，看着地上的文具，又看了看同学。',
      options: ['sad', 'scared', 'happy', 'unsure'],
      accepted: ['sad', 'scared', 'sorry', 'worried'],
      clues: ['小然是不小心碰倒的。', '文具散了一地。', '同学正好看到了。'],
      reasons: [
        { id: 'r1', text: '他不是故意的，但弄乱了同学的东西', ok: true },
        { id: 'r2', text: '同学看到了，他担心同学不高兴', ok: true },
        { id: 'r3', text: '他想把文具收拾好', ok: true },
        { id: 'r4', text: '他很喜欢同学的文具盒', ok: false }
      ],
      guide: '小然不是故意的，但同学的文具散了一地，他可能会难过或有点害怕。'
    },
    {
      scene: 'help', subject: '小雨', title: '有人来帮忙',
      story: '做数学作业时，小雨被一道题难住了，试了好几次都不对。同桌小林看见了，主动过来一步一步讲给她听。',
      behavior: '小雨一边听，一边在练习本上重新写算式。',
      options: ['scared', 'happy', 'angry', 'unsure'],
      accepted: ['happy', 'scared', 'grateful', 'worried'],
      clues: ['小雨试了好几次都没做对。', '小林主动来帮助她。', '小林一步一步讲给她听。'],
      reasons: [
        { id: 'r1', text: '有人主动帮助了她', ok: true },
        { id: 'r2', text: '那道题终于弄明白了', ok: true },
        { id: 'r3', text: '同桌愿意耐心讲给她听', ok: true },
        { id: 'r4', text: '小林拿走了她的作业本', ok: false }
      ],
      guide: '小雨遇到困难时有人主动帮忙，她可能会开心；选“害怕”不太符合故事里的线索。'
    }
  ];

  const SCENES = {
    blocks: {
      label: '教室地上的积木',
      url: 'images/blocks.jpg'
    },
    gift: {
      label: '打开的礼物盒',
      url: 'images/gift.jpg'
    },
    empty: {
      label: '空着的课桌',
      url: 'images/empty.jpg'
    },
    stationery: {
      label: '散落的文具',
      url: 'images/stationery.jpg'
    },
    help: {
      label: '同桌讲题',
      url: 'images/help.jpg'
    }
  };

  window.GAME_DATA = { EMOTIONS, PHOTOS, LEVEL1, LEVEL2, LEVEL3, SCENES };
})();
