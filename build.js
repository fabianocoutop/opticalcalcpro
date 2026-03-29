// build.js - Script para copiar arquivos web para dist/ (Capacitor)
const fs = require('fs');
const path = require('path');

const filesToCopy = ['index.html', 'style.css', 'app.js', 'calculators.js'];
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('  ✅ ' + file);
    } else {
        console.log('  ⚠️ ' + file + ' não encontrado');
    }
});

console.log('\n📦 Arquivos copiados para dist/');
