const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const user = require('./middleware/user');
const { JWT_SECRET, CORS_ORIGINS } = require('./config');
const { writeFileAtomic, readJSON } = require('./jsonfs');
const { usersStore, favoritesStore, historyStore, searchHistoryStore } = require('./store');
const accessLog = require('./accessLog');

const app = express();
const PORT = 3000;

const multer = require('multer');
const sharp = require('sharp');

// 中间件（访问日志放最前，覆盖全部请求）
app.use(accessLog);
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====== 可变数据：内存缓存层（store.js） + 退出兜底落盘 ======
// 内存缓存启动时读入；写队列串行 + 10s 防抖落盘。
// 进程退出/被杀时同步 flush，尽量不丢最后 10s 内的变更。
function flushAllSync() {
  [usersStore, favoritesStore, historyStore, searchHistoryStore].forEach(s => s.flushNowSync());
}
process.on('exit', flushAllSync);
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    flushAllSync();
    process.exit(0);
  });
}

// 加载歌曲数据（只读关键数据：缺失/损坏时显式退出，不能静默继续，否则 songs 全为 undefined）
const songsData = readJSON('songs.json');
if (!songsData || !Array.isArray(songsData.songs)) {
  console.error('[启动失败] data/songs.json 缺失或格式损坏，请修复后重启。');
  process.exit(1);
}
const songs = songsData.songs;
const playlists = songsData.playlists || [];

// 数据文件初始化：缺失或损坏时重建为默认结构（内存 store 读入即重建）
const { writeJSON } = require('./jsonfs');
function ensureDataFile(filename, defaultValue) {
  if (readJSON(filename) === null) {
    console.warn(`[init] ${filename} 缺失或损坏，重建为默认结构`);
    writeJSON(filename, defaultValue);
  }
}
ensureDataFile('users.json', []);
ensureDataFile('favorites.json', {});
ensureDataFile('history.json', {});

// ====== 公共 API ======

// 封面地址改写：数据文件存的是 PNG（/covers/N.png），已由 scripts/optimize-covers.mjs
// 批量转为 WebP（/covers/N.webp 大图 480px、/covers/N-240.webp 中图 240px、/covers/N-112.webp 列表小图 112px）。
// 这里统一把 cover 改写为 WebP 大图，并补充 coverMedium/coverThumb 缩略图，前端零改动即受益。
function withWebpCover(song) {
  if (!song) return song;
  const cover = song.cover || '';
  const webp = cover.replace(/\.(png|jpe?g|gif)$/i, '.webp');
  return {
    ...song,
    cover: webp,
    coverMedium: webp.replace(/\.webp$/i, '-240.webp'),
    coverThumb: webp.replace(/\.webp$/i, '-112.webp')
  };
}

// 列表接口：只返回列表需要的字段，剥离歌词（歌词仅在详情接口按需返回，减小首屏 JSON）
function toListSong(song) {
  const { lyrics, ...rest } = withWebpCover(song);
  return rest;
}

// 获取所有歌曲（支持搜索和分类过滤）
app.get('/api/songs', (req, res) => {
  let result = [...songs];
  const { q, category } = req.query;

  if (q) {
    const keyword = q.toLowerCase();
    result = result.filter(
      s =>
        s.title.toLowerCase().includes(keyword) ||
        s.artist.toLowerCase().includes(keyword)
    );
  }

  if (category) {
    result = result.filter(s => s.category === category);
  }

  res.json({ songs: result.map(toListSong) });
});

// 获取单首歌曲详情（含歌词）
app.get('/api/songs/:id', (req, res) => {
  const song = songs.find(s => s.id === req.params.id);
  if (song) {
    res.json(withWebpCover(song));
  } else {
    res.status(404).json({ error: '歌曲不存在' });
  }
});

// 获取所有推荐歌单
app.get('/api/playlists', (req, res) => {
  // 歌单封面同样改写为 WebP 并补齐缩略图（与歌曲封面同一套资源）：
  // cover 大图 480px（详情 hero）、coverMedium 中图 240px（首页歌单卡）、coverThumb 小图 112px（推荐小卡）
  const plWithCover = (playlists || []).map(pl => {
    const webp = (pl.cover || '').replace(/\.(png|jpe?g|gif)$/i, '.webp');
    return {
      ...pl,
      cover: webp,
      coverMedium: webp.replace(/\.webp$/i, '-240.webp'),
      coverThumb: webp.replace(/\.webp$/i, '-112.webp')
    };
  });
  res.json({ playlists: plWithCover });
});

// 注册
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(422).json({ error: '用户名和密码不能为空' });
  }
  const users = usersStore.get();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  // #34：异步 hash，避免同步阻塞事件循环
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    // #38：randomUUID 避免同刻注册 id 重复
    id: 'u' + crypto.randomUUID(),
    username,
    password: hashedPassword
  };
  users.push(newUser);
  usersStore.touch(); // 内存引用已改，触发防抖落盘

  // 同时初始化该用户的收藏和历史为空
  const favorites = favoritesStore.get();
  favorites[newUser.id] = [];
  favoritesStore.touch();

  const history = historyStore.get();
  history[newUser.id] = [];
  historyStore.touch();

  res.json({ message: '注册成功' });
});

// 登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(422).json({ error: '用户名和密码不能为空' });
  }
  const users = usersStore.get();
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: '用户名不存在' });
  }

  // #34：异步 compare，避免同步阻塞事件循环
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: '密码错误' });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d'
  });

  res.json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar || null  
    }
  });
});

// ====== 需要认证的 API（user 中间件） ======

// 获取收藏列表（返回完整歌曲信息）
app.get('/api/user/favorites', user, (req, res) => {
  const favorites = favoritesStore.get();
  const userFavorites = favorites[req.userId] || [];
  // 从歌曲数据中提取出收藏的歌曲详情
  const favSongs = userFavorites
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean)
    .map(withWebpCover);
  res.json({ favorites: favSongs });
});

// 切换收藏状态
app.post('/api/user/favorites', user, (req, res) => {
  const { songId } = req.body;
  if (!songId) {
    return res.status(422).json({ error: '缺少 songId' });
  }
  const favorites = favoritesStore.get();
  if (!favorites[req.userId]) {
    favorites[req.userId] = [];
  }
  const list = favorites[req.userId];
  const index = list.indexOf(songId);
  if (index > -1) {
    list.splice(index, 1); // 取消收藏
  } else {
    list.push(songId); // 添加收藏
  }
  favoritesStore.touch();
  res.json({ favorites: list });
});

// 获取播放历史
app.get('/api/user/history', user, (req, res) => {
  const history = historyStore.get();
  const userHistory = history[req.userId] || [];
  // 按照时间戳降序排列，并填充歌曲信息（#37：拷贝后排序，避免原地修改）
  const sorted = [...userHistory].sort((a, b) => b.timestamp - a.timestamp);
  const historySongs = sorted
    .map(item => {
      const song = songs.find(s => s.id === item.songId);
      return song ? { ...withWebpCover(song), playedAt: item.timestamp } : null;
    })
    .filter(Boolean);
  res.json({ history: historySongs });
});

// 添加播放历史（去重并置顶，最多保留50条）
app.post('/api/user/history', user, (req, res) => {
  const { songId } = req.body;
  if (!songId) {
    return res.status(422).json({ error: '缺少 songId' });
  }
  const history = historyStore.get();
  if (!history[req.userId]) {
    history[req.userId] = [];
  }
  const userHistory = history[req.userId];
  // 移除已经存在的同歌曲记录
  const filtered = userHistory.filter(item => item.songId !== songId);
  // 插入新记录（时间戳为当前）
  filtered.push({ songId, timestamp: Date.now() });
  // 限制50条
  if (filtered.length > 50) {
    filtered.splice(0, filtered.length - 50);
  }
  history[req.userId] = filtered;
  historyStore.touch();
  res.json({ message: '已记录播放历史' });
});

// 清空播放历史
app.delete('/api/user/history', user, (req, res) => {
  const history = historyStore.get();
  history[req.userId] = [];
  historyStore.touch();
  res.json({ message: '播放历史已清空' });
});



//搜索历史

// GET 获取搜索历史
app.get('/api/user/search-history', user, (req, res) => {
  const userId = req.userId
  const data = searchHistoryStore.get()
  res.json({ history: data[userId] || [] })
})

// POST 添加搜索历史
app.post('/api/user/search-history', user, (req, res) => {
  const userId = req.userId
  const { keyword } = req.body

  if (!keyword) return res.status(422).json({ error: '缺少 keyword' })

  const data = searchHistoryStore.get()
  if (!data[userId]) data[userId] = []

  // 去重，最新的放前面
  data[userId] = data[userId].filter(k => k !== keyword)
  data[userId].unshift(keyword)

  // 最多保留 20 条
  data[userId] = data[userId].slice(0, 20)

  searchHistoryStore.touch()
  res.json({ history: data[userId] })
})

// DELETE 清空搜索历史
app.delete('/api/user/search-history', user, (req, res) => {
  const userId = req.userId
  const data = searchHistoryStore.get()
  data[userId] = []
  searchHistoryStore.touch()
  res.json({ success: true })
})

// 修改密码
app.put('/api/user/password', user, async (req, res) => {
  const { oldPassword, newPassword } = req.body

  // 1. 参数校验
  if (!oldPassword || !newPassword) {
    return res.status(422).json({ error: '请输入旧密码和新密码' })
  }
  if (newPassword.length < 6) {
    return res.status(422).json({ error: '新密码至少6位' })
  }

  // 2. 读取用户数据（内存 store）
  const users = usersStore.get()
  const userIndex = users.findIndex(u => u.id === req.userId)

  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在' })
  }

  // 3. 验证旧密码
  const isMatch = await bcrypt.compare(oldPassword, users[userIndex].password)
  if (!isMatch) {
    return res.status(401).json({ error: '旧密码错误' })
  }

  // 4. 更新密码
  users[userIndex].password = await bcrypt.hash(newPassword, 10)
  usersStore.touch()

  // 5. 返回成功
  res.json({ message: '密码修改成功' })
})


// ====== 上传头像 ======

// 图片内容魔数检测：返回服务器端扩展名（.png/.jpg/.gif/.webp），非图片返回 null
function getImageExt(buf) {
  if (!buf || buf.length < 3) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return '.png'
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg'
  // GIF87a / GIF89a
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return '.gif'
  // WebP: "RIFF" + 4 字节长度 + "WEBP"（字节 0-3、8-11）
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return '.webp'
  return null
}

const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

// memoryStorage：文件内容先读入内存（≤2MB），handler 中魔数校验后再原子写盘
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter(req, file, cb) {
    // 第一道闸：MIME 白名单。内容魔数检测在 handler 中完成（fileFilter 阶段 buffer 尚不可用）。
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(null, false)
    }
    cb(null, true)
  }
})

// 确保 avatars 目录存在
const avatarsDir = path.join(__dirname, 'public', 'avatars')
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true })
}

// 头像尺寸上限：最大显示约 80px（登录卡），按 2x DPR 取 160px 足够清晰
const AVATAR_MAX_SIZE = 160
const AVATAR_MAX_QUALITY = 82
// 已是优化态的头像判定体积阈值（≤160px WebP 通常远小于此值）
const AVATAR_OPTIMIZED_BYTES = 12 * 1024

/**
 * 服务端头像压缩：decode → 保留 EXIF 方向 → 按最大边长 160px 等比缩小（不放大）→ WebP。
 * 无论客户端是否压缩，落盘的头像恒为 ≤160px WebP，保证小尺寸显示不加载大头像。
 * 返回压缩后的 Buffer；失败时抛错，由调用方回退原文件。
 */
async function compressAvatar(buf) {
  return await sharp(buf)
    .rotate()
    .resize({
      width: AVATAR_MAX_SIZE,
      height: AVATAR_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: AVATAR_MAX_QUALITY })
    .toBuffer()
}

// 头像上传限频（内存，按用户）：与前端 auth store 的 3s 冷却一致，后端兜底防绕过 UI 直接刷接口
const avatarUploadThrottle = new Map() // userId -> 上次上传成功时间戳
const AVATAR_UPLOAD_COOLDOWN_MS = 3000

// 上传头像
app.post('/api/user/avatar', user, uploadAvatar.single('avatar'), async (req, res) => {
  const now = Date.now()
  const last = avatarUploadThrottle.get(req.userId) || 0
  if (now - last < AVATAR_UPLOAD_COOLDOWN_MS) {
    return res.status(429).json({ error: '操作太频繁，请稍后再试' })
  }

  if (!req.file) {
    return res.status(400).json({ error: '请选择图片' })
  }

  // 第二道闸：内容魔数校验 + 服务端定扩展名（不信任用户文件名/扩展名）
  const ext = getImageExt(req.file.buffer)
  if (!ext) {
    return res.status(400).json({ error: '图片格式无效（仅支持 PNG/JPEG/GIF/WebP）' })
  }

  // 先确认用户存在再落盘，避免写孤儿文件（内存 store）
  const users = usersStore.get()
  if (!Array.isArray(users)) {
    return res.status(500).json({ error: '用户数据异常，请稍后重试' })
  }
  const userIndex = users.findIndex(u => u.id === req.userId)
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在' })
  }

  // 服务端压缩：恒定为 ≤160px WebP 落盘（无论客户端是否压缩，避免大头像漏入）；
  // sharp 压缩失败（如异常动图）回退原文件 + 原扩展名
  const oldAvatar = users[userIndex].avatar
  let filename = `${req.userId}.webp`
  let payload = req.file.buffer
  try {
    payload = await compressAvatar(req.file.buffer)
  } catch (e) {
    console.error(`[avatar] sharp 压缩失败，回退原文件：${e.message}`)
    filename = `${req.userId}${ext}`
  }

  // 原子写盘（临时文件 + rename），文件名由服务端决定
  writeFileAtomic(path.join(avatarsDir, filename), payload)

  // 更新用户数据（内存 store 修改 + 防抖落盘）
  users[userIndex].avatar = `/avatars/${filename}`
  usersStore.touch()

  // 旧头像清理（best-effort）：换新文件后删除旧文件，避免磁盘堆积（同名时跳过）
  if (oldAvatar && path.basename(oldAvatar) !== filename) {
    try {
      fs.unlinkSync(path.join(avatarsDir, path.basename(oldAvatar)))
    } catch (e) {
      /* 旧文件可能已被迁移/不存在，忽略 */
    }
  }

  // 成功才记录时间戳：校验失败/写盘失败不触发冷却，避免"刚失败又要等"
  avatarUploadThrottle.set(req.userId, Date.now())

  res.json({ avatar: `/avatars/${filename}`, message: '头像更新成功' })
})

/**
 * 启动自愈迁移：把历史遗留的大头像压缩为 ≤160px WebP 并更新用户路径。
 * （上传压缩功能上线前遗留的旧文件可达 100KB+，见"图片按显示尺寸交付"优化。）
 * 幂等：已是「.webp 且 ≤160px 且 ≤12KB」的头像跳过；损坏/缺失文件跳过不中断启动。
 * 迁移完成后 flushNowSync 立即落盘，避免防抖窗口内进程被杀丢更新。
 */
async function migrateLegacyAvatars() {
  const users = usersStore.get()
  if (!Array.isArray(users)) return
  let changed = false
  for (const u of users) {
    const avatar = u.avatar
    if (!avatar || !avatar.startsWith('/avatars/')) continue
    const filePath = path.join(avatarsDir, path.basename(avatar))
    if (!fs.existsSync(filePath)) continue
    try {
      const stat = fs.statSync(filePath)
      const meta = await sharp(filePath).metadata()
      const alreadySmall =
        /\.webp$/i.test(avatar) &&
        (meta.width || 0) <= AVATAR_MAX_SIZE &&
        (meta.height || 0) <= AVATAR_MAX_SIZE &&
        stat.size <= AVATAR_OPTIMIZED_BYTES
      if (alreadySmall) continue

      const compressed = await compressAvatar(fs.readFileSync(filePath))
      const newFile = path.join(avatarsDir, `${u.id}.webp`)
      writeFileAtomic(newFile, compressed)
      const oldPath = u.avatar
      u.avatar = `/avatars/${u.id}.webp`
      // 成功后删除旧文件，避免磁盘堆积（新旧同名时跳过）
      if (path.basename(oldPath) !== `${u.id}.webp`) {
        try {
          fs.unlinkSync(filePath)
        } catch (e) {
          /* 旧文件删除失败不影响主流程 */
        }
      }
      changed = true
      console.log(
        `[avatar] 迁移 ${u.username || u.id}: ${oldPath} → ${u.avatar} ` +
          `(${(stat.size / 1024).toFixed(1)}KB → ${(compressed.length / 1024).toFixed(1)}KB)`
      )
    } catch (e) {
      console.warn(`[avatar] 迁移跳过 ${u.username || u.id}（${avatar}）：${e.message}`)
    }
  }
  if (changed) {
    usersStore.flushNowSync()
    console.log('[avatar] 遗留头像迁移完成，已落盘。')
  }
}



// ====== 注销账号 ======
// 删除用户及其关联数据（收藏/播放历史/搜索历史），避免孤儿数据残留（#39）
// 注：跨四个 store 的操作非事务，单个 store 落盘失败仅记录日志不中断（与现状一致）
app.delete('/api/user', user, (req, res) => {
  const userId = req.userId

  // 1. 从用户列表移除（内存 store；userExists 即刻返回 false，token 立即失效）
  const users = usersStore.get()
  const userIndex = users.findIndex(u => u.id === userId)
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在' })
  }
  users.splice(userIndex, 1)
  usersStore.touch()

  // 2. 清理关联数据（键不存在时跳过）
  const favorites = favoritesStore.get()
  if (favorites[userId]) {
    delete favorites[userId]
    favoritesStore.touch()
  }

  const history = historyStore.get()
  if (history[userId]) {
    delete history[userId]
    historyStore.touch()
  }

  const searchHistory = searchHistoryStore.get()
  if (searchHistory[userId]) {
    delete searchHistory[userId]
    searchHistoryStore.touch()
  }

  res.json({ message: '账号已注销' })
})

// ====== 错误处理中间件 ======
app.use((err, req, res, next) => {
  // multer 文件大小超限等上传错误：语义为 400，而非服务器错误
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? '文件过大（最大 2MB）'
      : `上传失败：${err.message}`;
    return res.status(400).json({ error: message });
  }
  console.error(err);
  res.status(500).json({ error: '服务器错误' });
});

// 启动前先跑遗留头像迁移（幂等、异常不阻塞启动），完成后开始监听
migrateLegacyAvatars()
  .catch((e) => console.warn('[avatar] 启动迁移异常：', e.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`后端服务已启动：http://localhost:${PORT}`);
    });
  });