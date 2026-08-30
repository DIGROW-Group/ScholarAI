const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
let puppeteer;

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const framesDir = path.join(__dirname, '..', 'tmp', 'demo_frames');
const ffmpegBin = path.join(__dirname, '..', 'tools', 'ffmpeg', 'ffmpeg.exe');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function run() {
  // Import puppeteer-core dynamically (module is ESM)
  try {
    const mod = await import('puppeteer-core');
    puppeteer = mod.default || mod;
  } catch (e) {
    console.error('Failed to import puppeteer-core:', e.message);
    process.exit(1);
  }
  await ensureDir(framesDir);

  console.log('Launching Chrome headless...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,720']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  const steps = [
    { name: 'home', action: async () => { await page.goto('http://localhost:3001'); await page.waitForTimeout(800); } },
    { name: 'login_student', action: async () => {
      await page.goto('http://localhost:3001/login');
      await page.waitForSelector('input[name=email]');
      await page.type('input[name=email]', 'student1@school.ma', { delay: 30 });
      await page.type('input[name=password]', 'password123', { delay: 30 });
      await Promise.all([page.click('button[type=submit]'), page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(()=>{})]);
      await page.waitForTimeout(1000);
    } },
    { name: 'student_dashboard', action: async () => { await page.goto('http://localhost:3001/student'); await page.waitForTimeout(1000); } },
    { name: 'student_tutor_interaction', action: async () => {
      // Type into any visible textarea or input for question
      await page.evaluate(() => { const ta = document.querySelector('textarea'); if (ta) ta.value = ''; });
      try { await page.type('textarea, input[type="text"], input[placeholder*="Ask"]', 'Explique la loi de Newton simplement', { delay: 20 }); } catch(e) {}
      await page.waitForTimeout(800);
      // Try clicking a send button
      await page.click('button[type=submit]').catch(()=>{});
      await page.waitForTimeout(2500);
    } },
    { name: 'logout_student', action: async () => { await page.goto('http://localhost:3001/login'); await page.waitForTimeout(600); } },
    { name: 'login_teacher', action: async () => {
      await page.goto('http://localhost:3001/login');
      await page.waitForSelector('input[name=email]');
      await page.type('input[name=email]', 'teacher1@school.ma', { delay: 30 });
      await page.type('input[name=password]', 'password123', { delay: 30 });
      await Promise.all([page.click('button[type=submit]'), page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(()=>{})]);
      await page.waitForTimeout(1000);
    } },
    { name: 'teacher_dashboard', action: async () => { await page.goto('http://localhost:3001/teacher'); await page.waitForTimeout(1000); } },
    { name: 'teacher_content', action: async () => { await page.goto('http://localhost:3001/content'); await page.waitForTimeout(1000); } },
    { name: 'logout_teacher', action: async () => { await page.goto('http://localhost:3001/login'); await page.waitForTimeout(600); } },
    { name: 'login_parent', action: async () => {
      await page.goto('http://localhost:3001/login');
      await page.waitForSelector('input[name=email]');
      await page.type('input[name=email]', 'parent@school.ma', { delay: 30 });
      await page.type('input[name=password]', 'password123', { delay: 30 });
      await Promise.all([page.click('button[type=submit]'), page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(()=>{})]);
      await page.waitForTimeout(1000);
    } },
    { name: 'parent_dashboard', action: async () => { await page.goto('http://localhost:3001/parent'); await page.waitForTimeout(1000); } }
  ];

  let i = 0;
  for (const step of steps) {
    console.log('Running step:', step.name);
    try { await step.action(); } catch (e) { console.warn('Step failed:', e.message); }
    const screenshotPath = path.join(framesDir, `frame_${String(i).padStart(5,'0')}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log('Saved', screenshotPath);
    } catch (e) {
      console.warn('Screenshot failed:', e.message);
    }
    i++;
  }

  await browser.close();

  // Assemble into MP4 using ffmpeg
  if (!fs.existsSync(ffmpegBin)) {
    console.error('ffmpeg not found at', ffmpegBin);
    console.error('Please run scripts\\download-ffmpeg.ps1 to fetch a Windows ffmpeg build.');
    process.exit(1);
  }

  const out = path.join(__dirname, '..', 'demo.mp4');
  // Create a ~3 minute (180s) slideshow by setting input framerate = framesCount / targetDuration
  const files = fs.readdirSync(framesDir).filter(f => f.endsWith('.png')).sort();
  const framesCount = files.length || 1;
  const targetDurationSec = 180; // 3 minutes
  const inputFramerate = framesCount / targetDurationSec; // each frame will display for ~targetDurationSec/framesCount seconds
  const args = [
    '-y',
    '-framerate', String(inputFramerate),
    '-i', path.join(framesDir, 'frame_%05d.png'),
    '-c:v', 'libx264',
    '-r', '30',
    '-pix_fmt', 'yuv420p',
    out
  ];

  console.log('Running ffmpeg to assemble frames into', out);
  execFileSync(ffmpegBin, args, { stdio: 'inherit' });
  console.log('Demo video generated at', out);
}

run().catch(err => { console.error(err); process.exit(1); });
