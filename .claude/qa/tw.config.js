// Cấu hình Tailwind giống tailwind.config trong index.html — chỉ dùng để chụp thử offline (máy chủ test không tải được CDN)
const path = require('path');
module.exports = { content: [path.join(__dirname, '../../mc-life-english-stage/index.html')], theme: { extend: {
  colors: { mint:{DEFAULT:'#58CC02',dark:'#46A302',light:'#D7FFB8'}, blu:{DEFAULT:'#1CB0F6',dark:'#1899D6',light:'#DDF4FF'},
    sun:{DEFAULT:'#FFC800',dark:'#E0A800',light:'#FFF4CC'}, coral:{DEFAULT:'#FF4B4B',dark:'#EA2B2B',light:'#FFDFE0'},
    ink:'#3C3C3C', mute:'#AFAFAF', line:'#E5E5E5', snow:'#F7F7F7' },
  fontFamily: { display:['"Baloo 2"','Nunito','system-ui','sans-serif'], body:['Nunito','system-ui','sans-serif'] } } } };
