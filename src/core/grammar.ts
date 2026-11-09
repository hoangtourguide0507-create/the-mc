// Kiểm tra nhanh các lỗi ngữ pháp và từ khẩu ngữ thường gặp của người Việt khi nói tiếng Anh.
// Đây không phải bộ phân tích ngữ pháp đầy đủ: chỉ bắt các mẫu sai điển hình để gợi ý sửa.

export interface GrammarIssue {
  wrong: string;
  fix: string;
}

const RULES: { pattern: RegExp; wrong: string; fix: string }[] = [
  { pattern: /\bdiscuss about\b/i, wrong: 'discuss about', fix: 'discuss' },
  { pattern: /\bI am agree\b/i, wrong: 'I am agree', fix: 'I agree' },
  { pattern: /\bexplain me\b/i, wrong: 'explain me', fix: 'explain it to me' },
  { pattern: /\baccording to me\b/i, wrong: 'according to me', fix: 'in my opinion' },
  { pattern: /\bmore better\b/i, wrong: 'more better', fix: 'better' },
  { pattern: /\bmore easy\b/i, wrong: 'more easy', fix: 'easier' },
  { pattern: /\bdepend of\b/i, wrong: 'depend of', fix: 'depend on' },
  { pattern: /\bmarry with\b/i, wrong: 'marry with', fix: 'marry' },
  { pattern: /\bI very like\b/i, wrong: 'I very like', fix: 'I really like' },
  { pattern: /\b(he|she|it) don'?t\b/i, wrong: "he/she/it don't", fix: "he/she/it doesn't" },
  { pattern: /\b(he|she|it) have\b/i, wrong: 'he/she/it have', fix: 'he/she/it has' },
  { pattern: /\bgonna\b/i, wrong: 'gonna', fix: 'going to' },
  { pattern: /\bwanna\b/i, wrong: 'wanna', fix: 'want to' },
  { pattern: /\bgotta\b/i, wrong: 'gotta', fix: 'have to' },
  { pattern: /\bkinda\b/i, wrong: 'kinda', fix: 'kind of' },
];

/** Trả về các lỗi tìm thấy trong câu nói (đã nhận dạng). Mỗi mẫu lỗi chỉ báo một lần. */
export function findGrammarIssues(text: string): GrammarIssue[] {
  const out: GrammarIssue[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text)) out.push({ wrong: rule.wrong, fix: rule.fix });
  }
  return out;
}
