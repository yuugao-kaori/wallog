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

// 関数をexportする
export function markdownToHtml(markdown) {
    console.log(`blog_purse_start`);
    // HTMLタグを判定する関数を追加
    function isHtmlTag(text) {
        return /^<[^>]+>.*<\/[^>]+>$/.test(text.trim());
    }

    // 特殊文字のエスケープ（HTMLタグは除外）
    function escapeHtml(text) {
        // テキストがHTMLタグの形式の場合はそのまま返す
        if (isHtmlTag(text)) {
            return text;
        }
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/'/g, '&apos;')
            .replace(/"/g, '&quot;')
            .replace(/`/g, '&#96;');  // バッククォートのエスケープを追加
    }

    const lines = markdown.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeContent = '';
    let inOrderedList = false;  // 番号付きリストの状態を追跡

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // コードブロックの処理
        const codeBlockMatches = line.match(/```/g);
        if (codeBlockMatches) {
            const matchCount = codeBlockMatches.length;
            
            if (!inCodeBlock) {
                // コードブロック開始
                inCodeBlock = true;
                const contentAfterStart = line.split('```')[1];
                html += '<p><pre><code>';
                if (matchCount > 1) {
                    // 同じ行に終了タグがある場合
                    const parts = line.split('```');
                    const content = parts[1]; // 開始と終了の間のコンテンツ
                    html += escapeHtml(content);
                    html += '</code></pre></p>\n';
                    inCodeBlock = false;
                } else {
                    // 開始タグのみの場合
                    if (contentAfterStart) {
                        html += escapeHtml(contentAfterStart) + '\n';
                    }
                }
                continue;
            } else {
                // コードブロック終了
                inCodeBlock = false;
                const contentBeforeEnd = line.split('```')[0];
                if (contentBeforeEnd) {
                    html += escapeHtml(contentBeforeEnd);
                }
                html += '</code></pre></p>\n';
                continue;
            }
        }

        // コードブロック内の処理
        if (inCodeBlock) {
            html += escapeHtml(line) + '\n';
            continue;
        }

        // 行全体がHTMLタグの場合はそのまま使用
        if (isHtmlTag(line)) {
            if (inOrderedList) {
                html += '</ol>\n';
                inOrderedList = false;
            }
            html += `${line}\n`;
            continue;
        }

        // 見出しの処理（h1-h6タグがそのまま含まれている場合）
        const headingMatch = line.match(/^<h([1-6])>(.*?)<\/h\1>$/);
        if (headingMatch) {
            if (inOrderedList) {
                html += '</ol>\n';
                inOrderedList = false;
            }
            const [, level, content] = headingMatch;
            html += `<h${level}>${content}</h${level}>\n`;
            continue;
        }

        // マークダウン形式の見出しの処理
        if (line.startsWith('#')) {
            if (inOrderedList) {
                html += '</ol>\n';
                inOrderedList = false;
            }
            const level = line.match(/^#+/)[0].length;
            const content = line.substring(level).trim();
            if (level >= 1 && level <= 6) {
                html += `<h${level}>${escapeHtml(content)}</h${level}>\n`;
                continue;
            }
        }

        // 番号付きリストの処理
        if (/^\d+\.\s/.test(line)) {
            if (!inOrderedList) {
                html += '<ol>\n';
                inOrderedList = true;
            }
            html += `<li>${escapeHtml(line.substring(line.indexOf('.') + 1).trim())}</li>\n`;
            continue;
        }

        // 番号付きリスト以外の要素が来た場合、リストを閉じる
        if (inOrderedList) {
            html += '</ol>\n';
            inOrderedList = false;
        }

        // リストの処理
        if (line.startsWith('- ')) {
            html += `<li>${escapeHtml(line.substring(2))}</li>\n`;
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

        // 空行またはスペースのみの行も段落として処理
        html += `<p>${line}</p>\n`;

    }

    // ファイル終端でまだリストが開いている場合は閉じる
    if (inOrderedList) {
        html += '</ol>\n';
    }

    // ファイル終端でまだコードブロックが開いている場合は閉じる
    if (inCodeBlock) {
        html += '</code></pre></p>\n';
    }

    return html;
}