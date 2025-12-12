// 빌드 후 스크립트 버전 자동 업데이트
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const distJsPath = path.join(__dirname, 'dist', 'analyze_chat.js');

// dist/analyze_chat.js 파일의 수정 시간을 가져와서 버전으로 사용
if (fs.existsSync(distJsPath)) {
  const stats = fs.statSync(distJsPath);
  const version = stats.mtime.getTime(); // 파일 수정 시간을 밀리초로 변환
  
  // index.html 읽기
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // 스크립트 태그의 버전 업데이트 (또는 추가)
  const scriptRegex = /<script type="module" src="dist\/analyze_chat\.js(\?v=[^"]*)?"\s*><\/script>/;
  if (scriptRegex.test(htmlContent)) {
    htmlContent = htmlContent.replace(
      scriptRegex,
      `<script type="module" src="dist/analyze_chat.js?v=${version}"></script>`
    );
  } else {
    // 패턴이 없으면 찾아서 추가
    htmlContent = htmlContent.replace(
      /<script type="module" src="dist\/analyze_chat\.js"><\/script>/,
      `<script type="module" src="dist/analyze_chat.js?v=${version}"></script>`
    );
  }
  
  // index.html 저장
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`✅ 스크립트 버전 업데이트 완료: v=${version}`);
} else {
  console.warn('⚠️  dist/analyze_chat.js 파일을 찾을 수 없습니다.');
}

