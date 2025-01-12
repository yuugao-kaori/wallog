// 「#」のHTML purse（#1つでh1、#2つでh2、#3つでh3、#4つでh4、#5つでh5、#6つでh6）
// 「-」のHTML purse（-で順序無しリスト）
// 「1.」のHTML purse（1.で順序リスト）
// 「>」のHTML purse（>で引用）
// 「```」のHTML purse（```で複数行コードブロック）
// 「---」のHTML purse（水平線）
// 「**太字**」のHTML purse（で太字）
// 「*斜体*」のHTML purse（*で斜体）
// 「~~取り消し線~~」のHTML purse（~~で取り消し線）
// 「__下線__」のHTML purse（で下線）
// 「https://example.com」のHTML purse（https://example.comでリンク）

function markdownToHtml(markdown) {
    // 特殊文字のエスケープ
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    const lines = markdown.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeContent = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // コードブロックの処理
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                continue;
            } else {
                html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
                codeContent = '';
                inCodeBlock = false;
                continue;
            }
        }

        if (inCodeBlock) {
            codeContent += line + '\n';
            continue;
        }

        // 見出しの処理
        if (line.startsWith('#')) {
            const level = line.match(/^#+/)[0].length;
            const content = line.substring(level).trim();
            html += `<h${level}>${escapeHtml(content)}</h${level}>\n`;
            continue;
        }

        // リストの処理
        if (line.startsWith('- ')) {
            html += `<li>${escapeHtml(line.substring(2))}</li>\n`;
            continue;
        }

        // 番号付きリストの処理
        if (/^\d+\.\s/.test(line)) {
            html += `<li>${escapeHtml(line.substring(line.indexOf('.') + 1).trim())}</li>\n`;
            continue;
        }

        // 引用の処理
        if (line.startsWith('> ')) {
            html += `<blockquote>${escapeHtml(line.substring(2))}</blockquote>\n`;
            continue;
        }

        // 水平線の処理
        if (line === '---') {
            html += '<hr>\n';
            continue;
        }

        // インライン要素の処理
        line = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/__(.+?)__/g, '<u>$1</u>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');

        // 空行でない場合は段落として処理
        if (line.length > 0) {
            html += `<p>${line}</p>\n`;
        }
    }


    return html;
}


module.exports = { markdownToHtml };