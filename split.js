const fs = require('fs');
const path = 'c:\\Users\\center\\Desktop\\AI project\\260403_메인일단_3.html';
const html = fs.readFileSync(path, 'utf8');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  fs.writeFileSync('c:\\Users\\center\\Desktop\\AI project\\style.css', styleMatch[1].trim(), 'utf8');
}

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const scriptContent = scriptMatch[1];
  const dataMatch = scriptContent.match(/(var GRP = \[[\s\S]*?\];\n)/);
  if (dataMatch) {
    fs.writeFileSync('c:\\Users\\center\\Desktop\\AI project\\data.js', '/* ════ 데이터 ════ */\n' + dataMatch[1].trim(), 'utf8');
    let restScript = scriptContent.replace(dataMatch[1], '').trim();
    // remove the initial comments matched in dataMatch or if we had loose comments 
    restScript = restScript.replace('/* ════ 데이터 ════ */', '').trim();
    fs.writeFileSync('c:\\Users\\center\\Desktop\\AI project\\script.js', restScript, 'utf8');
  }
}

let newHtml = html.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="./style.css">');
newHtml = newHtml.replace(/<script>[\s\S]*?<\/script>/, '<script src="./data.js"></script>\n<script src="./script.js"></script>');

fs.writeFileSync(path, newHtml, 'utf8');
console.log("Splitting finished.");
