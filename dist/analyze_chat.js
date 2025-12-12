"use strict";
// 브라우저용 카카오톡 채팅 통계 분석기
// analyze_chat.ts의 모든 함수를 포함하되, fs 모듈 제거
// analyze_chat.ts의 모든 함수들을 여기에 복사 (fs, path 제거)
// 간단화를 위해 핵심 함수들만 포함
function parseChatMessage(match, fullText, startIndex, nextStartIndex) {
    const fullLine = match[0];
    const dateTime = match[1];
    const namePart = match[2];
    const messageStart = match.index + fullLine.length;
    const messageEnd = nextStartIndex > 0 ? nextStartIndex : fullText.length;
    let message = fullText.substring(messageStart, messageEnd).trim();
    let date = '';
    let time = '';
    const dateTimeMatch = dateTime.match(/^(\d+년\s*\d+월\s*\d+일)\s*(오전|오후)\s*(\d+:\d+)/);
    if (dateTimeMatch) {
        date = dateTimeMatch[1];
        time = `${dateTimeMatch[2]} ${dateTimeMatch[3]}`;
    }
    else {
        const dateOnlyMatch = dateTime.match(/^(\d+년\s*\d+월\s*\d+일)/);
        if (dateOnlyMatch) {
            date = dateOnlyMatch[1];
        }
        else {
            return null;
        }
    }
    const name = namePart.split('/')[0].trim();
    const fullName = namePart.trim();
    const timestamp = parseDateTime(date, time);
    if (!timestamp)
        return null;
    return { date, time, name, message, fullName, timestamp };
}
function detectMessageType(message) {
    if (message.includes('사진') || message.includes('photo') ||
        message.includes('image')) {
        return 'photo';
    }
    if (message.includes('동영상') || message.includes('video')) {
        return 'video';
    }
    if (message.includes('이모티콘') || message.includes('emoji')) {
        return 'emoji';
    }
    if (message.match(/https?:\/\//)) {
        return 'link';
    }
    if (message.trim().length === 0) {
        return 'other';
    }
    return 'text';
}
function parseHour(time) {
    const match = time.match(/(오전|오후)\s*(\d+):(\d+)/);
    if (!match)
        return -1;
    const [, period, hourStr] = match;
    let hour = parseInt(hourStr, 10);
    if (period === '오후' && hour !== 12) {
        hour += 12;
    }
    else if (period === '오전' && hour === 12) {
        hour = 0;
    }
    return hour;
}
function getDayOfWeek(dateStr) {
    const match = dateStr.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
    if (!match)
        return '알 수 없음';
    const [, year, month, day] = match;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[date.getDay()];
}
function parseDateTime(dateStr, timeStr) {
    const dateMatch = dateStr.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
    if (!dateMatch)
        return null;
    const [, year, month, day] = dateMatch;
    const timeMatch = timeStr.match(/(오전|오후)\s*(\d+):(\d+)/);
    if (!timeMatch)
        return null;
    const [, period, hourStr, minuteStr] = timeMatch;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (period === '오후' && hour !== 12) {
        hour += 12;
    }
    else if (period === '오전' && hour === 12) {
        hour = 0;
    }
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), hour, minute);
}
function extractMentionedNames(message) {
    const mentionPattern = /@([^/\s@]+)(?:\/[^\s@]*)?/g;
    const names = [];
    let match;
    while ((match = mentionPattern.exec(message)) !== null) {
        const name = match[1].trim();
        if (name) {
            names.push(name);
        }
    }
    return names;
}
function countCryingExpressions(message) {
    const cryingPattern = /[ㅜㅠ]{1,}/g;
    const matches = message.match(cryingPattern);
    return matches ? matches.length : 0;
}
function countLaughingExpressions(message) {
    const laughingPattern = /(ㅋ{1,}|ㅎ{1,}|ㅊ{1,}|하하|호호|헤헤|히히|크크|킥킥)/g;
    const matches = message.match(laughingPattern);
    return matches ? matches.length : 0;
}
function extractWords(message) {
    const words = [];
    const koreanWords = message.match(/[가-힣]{2,}/g) || [];
    const englishWords = (message.match(/[a-zA-Z]{2,}/g) || []).map(w => w.toLowerCase());
    words.push(...koreanWords, ...englishWords);
    return words;
}
function analyzeChat(content, startDate, endDate, keywords) {
    const messages = [];
    const messagesByParticipant = new Map();
    const messagesByDate = new Map();
    const messagesByHour = new Map();
    const messagesByDayOfWeek = new Map();
    const messageTypes = { text: 0, photo: 0, video: 0, emoji: 0, link: 0, other: 0 };
    const mentionsByParticipant = new Map();
    const cryingByParticipant = new Map();
    const laughingByParticipant = new Map();
    let longestMessage = { name: '', message: '', length: 0 };
    let shortestMessage = { name: '', message: '', length: Infinity };
    const messageLengthByParticipant = new Map();
    const wordCount = new Map();
    const lateNightMessages = new Map();
    const photoCount = new Map();
    const videoCount = new Map();
    const linkCount = new Map();
    const keywordMentions = new Map();
    // 기본 키워드 또는 전달받은 키워드 사용
    const defaultKeywords = [
        '벙', '정모', '술', '맛집', '공연', '연습', '밴드', '음악', '노래', '라이브'
    ];
    const keywordsToUse = keywords && keywords.length > 0 ? keywords : defaultKeywords;
    for (const keyword of keywordsToUse) {
        keywordMentions.set(keyword, new Map());
    }
    let lastSender = '';
    let lastMessageTime = null;
    let consecutiveCount = 0;
    const maxConsecutiveByParticipant = new Map();
    const CONSECUTIVE_MESSAGE_THRESHOLD_MS = 5 * 60 * 1000;
    const messagePattern = /(\d+년\s*\d+월\s*\d+일\s*(?:오전|오후)\s*\d+:\d+),\s*([^:\n]+?)\s*:\s*/g;
    const matches = [];
    let match;
    while ((match = messagePattern.exec(content)) !== null) {
        matches.push(match);
    }
    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;
        const nextStartIndex = nextMatch ? nextMatch.index : content.length;
        const message = parseChatMessage(currentMatch, content, currentMatch.index, nextStartIndex);
        if (!message || !message.date || !message.timestamp)
            continue;
        // 날짜 필터링
        if (startDate && message.timestamp < startDate)
            continue;
        if (endDate && message.timestamp > endDate)
            continue;
        messages.push(message);
        const participantCount = messagesByParticipant.get(message.name) || 0;
        messagesByParticipant.set(message.name, participantCount + 1);
        const dateCount = messagesByDate.get(message.date) || 0;
        messagesByDate.set(message.date, dateCount + 1);
        let hour = parseHour(message.time);
        if (hour >= 0) {
            const hourCount = messagesByHour.get(hour) || 0;
            messagesByHour.set(hour, hourCount + 1);
        }
        const dayOfWeek = getDayOfWeek(message.date);
        const dayCount = messagesByDayOfWeek.get(dayOfWeek) || 0;
        messagesByDayOfWeek.set(dayOfWeek, dayCount + 1);
        const type = detectMessageType(message.message);
        messageTypes[type]++;
        const mentionedNames = extractMentionedNames(message.message);
        for (const mentionedName of mentionedNames) {
            const mentionCount = mentionsByParticipant.get(mentionedName) || 0;
            mentionsByParticipant.set(mentionedName, mentionCount + 1);
        }
        const cryingCount = countCryingExpressions(message.message);
        if (cryingCount > 0) {
            const currentCrying = cryingByParticipant.get(message.name) || 0;
            cryingByParticipant.set(message.name, currentCrying + cryingCount);
        }
        const laughingCount = countLaughingExpressions(message.message);
        if (laughingCount > 0) {
            const currentLaughing = laughingByParticipant.get(message.name) || 0;
            laughingByParticipant.set(message.name, currentLaughing + laughingCount);
        }
        const msgLength = message.message.length;
        if (msgLength > longestMessage.length) {
            longestMessage = {
                name: message.name,
                message: message.message.substring(0, 200) +
                    (message.message.length > 200 ? '...' : ''),
                length: msgLength
            };
        }
        if (msgLength > 0 && msgLength < shortestMessage.length) {
            shortestMessage = {
                name: message.name,
                message: message.message,
                length: msgLength
            };
        }
        const lengthData = messageLengthByParticipant.get(message.name) || { total: 0, count: 0 };
        lengthData.total += msgLength;
        lengthData.count += 1;
        messageLengthByParticipant.set(message.name, lengthData);
        if (type === 'text' && msgLength > 0) {
            const words = extractWords(message.message);
            for (const word of words) {
                const count = wordCount.get(word) || 0;
                wordCount.set(word, count + 1);
            }
        }
        if (hour >= 2 && hour < 5) {
            const lateNightCount = lateNightMessages.get(message.name) || 0;
            lateNightMessages.set(message.name, lateNightCount + 1);
        }
        if (type === 'photo') {
            const count = photoCount.get(message.name) || 0;
            photoCount.set(message.name, count + 1);
        }
        else if (type === 'video') {
            const count = videoCount.get(message.name) || 0;
            videoCount.set(message.name, count + 1);
        }
        else if (type === 'link') {
            const count = linkCount.get(message.name) || 0;
            linkCount.set(message.name, count + 1);
        }
        const lowerMessage = message.message.toLowerCase();
        for (const keyword of keywordsToUse) {
            const keywordLower = keyword.toLowerCase().trim();
            // 띄어쓰기가 포함된 키워드도 처리할 수 있도록 패턴 수정
            // 키워드 내부의 띄어쓰기는 그대로 유지하고, 특수문자만 이스케이프
            const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 한국어 특성상 단어 경계가 모호하므로, 단순히 포함 여부만 확인
            // 띄어쓰기 처리 무시 - 메시지에 키워드가 포함되어 있으면 매칭
            const pattern = new RegExp(escapedKeyword, 'g');
            if (pattern.test(lowerMessage)) {
                const keywordMap = keywordMentions.get(keyword);
                const count = keywordMap.get(message.name) || 0;
                keywordMap.set(message.name, count + 1);
            }
        }
        const currentMessageTime = parseDateTime(message.date, message.time);
        if (message.name === lastSender && currentMessageTime && lastMessageTime) {
            const timeDiff = currentMessageTime.getTime() - lastMessageTime.getTime();
            if (timeDiff >= 0 && timeDiff <= CONSECUTIVE_MESSAGE_THRESHOLD_MS) {
                consecutiveCount++;
            }
            else {
                if (consecutiveCount > 0) {
                    const currentMax = maxConsecutiveByParticipant.get(lastSender) || 0;
                    if (consecutiveCount > currentMax) {
                        maxConsecutiveByParticipant.set(lastSender, consecutiveCount);
                    }
                }
                consecutiveCount = 1;
            }
            lastMessageTime = currentMessageTime;
        }
        else {
            if (lastSender && consecutiveCount > 0) {
                const currentMax = maxConsecutiveByParticipant.get(lastSender) || 0;
                if (consecutiveCount > currentMax) {
                    maxConsecutiveByParticipant.set(lastSender, consecutiveCount);
                }
            }
            lastSender = message.name;
            consecutiveCount = 1;
            lastMessageTime = currentMessageTime;
        }
    }
    if (lastSender && consecutiveCount > 0) {
        const currentMax = maxConsecutiveByParticipant.get(lastSender) || 0;
        if (consecutiveCount > currentMax) {
            maxConsecutiveByParticipant.set(lastSender, consecutiveCount);
        }
    }
    const topParticipants = Array.from(messagesByParticipant.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const topDates = Array.from(messagesByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    const topHours = Array.from(messagesByHour.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    const topMentioned = Array.from(mentionsByParticipant.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const topCrying = Array.from(cryingByParticipant.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const topLaughing = Array.from(laughingByParticipant.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const avgMessageLengthByParticipant = Array.from(messageLengthByParticipant.entries())
        .map(([name, data]) => ({ name, avgLength: Math.round(data.total / data.count) }))
        .sort((a, b) => b.avgLength - a.avgLength)
        .slice(0, 20);
    const stopWords = new Set([
        '그리고', '그런데', '그래서', '그러나', '하지만', '그때', '그것', '이것',
        '저것', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'this',
        'that'
    ]);
    const topWords = Array.from(wordCount.entries())
        .filter(([word]) => !stopWords.has(word) && word.length >= 2)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const lateNightParticipants = Array.from(lateNightMessages.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const spamParticipants = Array.from(maxConsecutiveByParticipant.entries())
        .map(([name, maxConsecutive]) => ({ name, maxConsecutive }))
        .sort((a, b) => b.maxConsecutive - a.maxConsecutive)
        .slice(0, 20);
    const photoSharing = Array.from(photoCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const videoSharing = Array.from(videoCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const linkSharing = Array.from(linkCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const keywordMentionsResult = new Map();
    for (const keyword of keywordsToUse) {
        const keywordMap = keywordMentions.get(keyword);
        const topMentions = Array.from(keywordMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        if (topMentions.length > 0) {
            keywordMentionsResult.set(keyword, topMentions);
        }
    }
    // 날짜 범위 계산 (필터링 전 모든 메시지)
    // 전체 메시지를 파싱하여 날짜 범위 계산 (첫 분석 시에만 필요)
    let minDate = null;
    let maxDate = null;
    const allMessagesForRange = [];
    // 전체 메시지를 파싱하여 날짜 범위 계산
    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;
        const nextStartIndex = nextMatch ? nextMatch.index : content.length;
        const msg = parseChatMessage(currentMatch, content, currentMatch.index, nextStartIndex);
        if (msg && msg.timestamp) {
            allMessagesForRange.push(msg);
            if (!minDate || msg.timestamp < minDate)
                minDate = msg.timestamp;
            if (!maxDate || msg.timestamp > maxDate)
                maxDate = msg.timestamp;
        }
    }
    const result = {
        stats: {
            totalMessages: messages.length,
            totalParticipants: messagesByParticipant.size,
            messagesByParticipant,
            messagesByDate,
            messagesByHour,
            messagesByDayOfWeek,
            messageTypes,
            topParticipants,
            topDates,
            topHours,
            mentionsByParticipant,
            cryingByParticipant,
            laughingByParticipant,
            topMentioned,
            topCrying,
            topLaughing,
            longestMessage,
            shortestMessage,
            avgMessageLengthByParticipant,
            topWords,
            lateNightParticipants,
            spamParticipants,
            photoSharing,
            videoSharing,
            linkSharing,
            keywordMentions: keywordMentionsResult
        },
        allMessages: allMessagesForRange,
        dateRange: { min: minDate || new Date(), max: maxDate || new Date() }
    };
    return result;
}
// HTML 렌더링 함수
function renderStatistics(stats) {
    let html = '';
    // 기본 통계
    html += `
    <div class="stat-section">
      <h2>📊 기본 통계</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value">${stats.totalMessages.toLocaleString()}</div>
          <div class="label">총 메시지 수</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.totalParticipants}</div>
          <div class="label">총 참여자 수</div>
        </div>
      </div>
    </div>
  `;
    // 메시지 타입별 통계
    html += `
    <div class="stat-section">
      <h2>📝 메시지 타입별 통계</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value">${stats.messageTypes.text.toLocaleString()}</div>
          <div class="label">텍스트 (${((stats.messageTypes.text / stats.totalMessages) * 100)
        .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.photo.toLocaleString()}</div>
          <div class="label">사진 (${((stats.messageTypes.photo / stats.totalMessages) * 100)
        .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.video.toLocaleString()}</div>
          <div class="label">동영상 (${((stats.messageTypes.video / stats.totalMessages) * 100)
        .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.emoji.toLocaleString()}</div>
          <div class="label">이모티콘 (${((stats.messageTypes.emoji / stats.totalMessages) * 100)
        .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.link.toLocaleString()}</div>
          <div class="label">링크 (${((stats.messageTypes.link / stats.totalMessages) * 100)
        .toFixed(1)}%)</div>
        </div>
      </div>
    </div>
  `;
    // 상위 참여자
    html += `
    <div class="stat-section">
      <h2>👥 상위 참여자 (Top 20)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>메시지 수</th>
              <th>비율</th>
            </tr>
          </thead>
          <tbody>
  `;
    stats.topParticipants.forEach((participant, index) => {
        const percentage = ((participant.count / stats.totalMessages) * 100).toFixed(1);
        html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${participant.name}</td>
        <td class="count">${participant.count.toLocaleString()}개</td>
        <td class="percentage">${percentage}%</td>
      </tr>
    `;
    });
    html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
    // 가장 많이 웃은 사람
    html += `
    <div class="stat-section">
      <h2>😂 가장 많이 웃은 사람 (Top 20)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>횟수</th>
            </tr>
          </thead>
          <tbody>
  `;
    stats.topLaughing.forEach((person, index) => {
        html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${person.name}</td>
        <td class="count">${person.count.toLocaleString()}회</td>
      </tr>
    `;
    });
    html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
    // 가장 많이 운 사람
    html += `
    <div class="stat-section">
      <h2>😢 가장 많이 운 사람 (Top 20)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>횟수</th>
            </tr>
          </thead>
          <tbody>
  `;
    stats.topCrying.forEach((person, index) => {
        html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${person.name}</td>
        <td class="count">${person.count.toLocaleString()}회</td>
      </tr>
    `;
    });
    html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
    // 골뱅이 태그
    html += `
    <div class="stat-section">
      <h2>🏷️ 골뱅이 태그로 가장 많이 언급된 사람 (Top 20)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>횟수</th>
            </tr>
          </thead>
          <tbody>
  `;
    stats.topMentioned.forEach((person, index) => {
        html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${person.name}</td>
        <td class="count">${person.count.toLocaleString()}회</td>
      </tr>
    `;
    });
    html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
    // 메시지 길이 기록
    html += `
    <div class="stat-section">
      <h2>📏 메시지 길이 기록</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value">${stats.longestMessage.length.toLocaleString()}자</div>
          <div class="label">가장 긴 메시지</div>
          <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
            작성자: ${stats.longestMessage.name}<br>
            <div class="message-preview">${stats.longestMessage.message}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.shortestMessage.length}자</div>
          <div class="label">가장 짧은 메시지</div>
          <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
            작성자: ${stats.shortestMessage.name}<br>
            <div class="message-preview">${stats.shortestMessage.message}</div>
          </div>
        </div>
      </div>
    </div>
  `;
    // 연속 메시지
    html += `
    <div class="stat-section">
      <h2>💬 연속 메시지(스팸) 최고 기록 (Top 20)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>최대 연속</th>
            </tr>
          </thead>
          <tbody>
  `;
    stats.spamParticipants.forEach((person, index) => {
        html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${person.name}</td>
        <td class="count">${person.maxConsecutive.toLocaleString()}개</td>
      </tr>
    `;
    });
    html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
    // 키워드별 언급 (동적으로 표시)
    const keywordEntries = Array.from(stats.keywordMentions.entries());
    if (keywordEntries.length > 0) {
        html += `
      <div class="stat-section">
        <h2>🔍 키워드별 가장 많이 언급한 사람</h2>
    `;
        // 키워드를 언급 횟수 총합으로 정렬 (더 활발한 키워드가 먼저 표시)
        const sortedKeywords = keywordEntries
            .map(([keyword, mentions]) => {
            const totalMentions = mentions.reduce((sum, m) => sum + m.count, 0);
            return { keyword, mentions, totalMentions };
        })
            .filter(item => item.mentions.length > 0)
            .sort((a, b) => b.totalMentions - a.totalMentions);
        for (const { keyword, mentions } of sortedKeywords) {
            html += `
        <div class="keyword-item">
          <h3>"${keyword}" 키워드 (Top 10)</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>이름</th>
                  <th>횟수</th>
                </tr>
              </thead>
              <tbody>
      `;
            mentions.forEach((person, index) => {
                html += `
          <tr>
            <td class="rank">${index + 1}</td>
            <td class="name">${person.name}</td>
            <td class="count">${person.count.toLocaleString()}회</td>
          </tr>
        `;
            });
            html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
        }
        html += `</div>`;
    }
    return html;
}
// 파일 업로드 및 처리
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const fileInputButton = document.querySelector('.file-input-button');
    // 파일 선택 버튼 클릭 시 파일 입력 트리거
    if (fileInputButton) {
        fileInputButton.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
    }
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        console.log('파일 선택됨:', file.name);
        fileName.textContent = `선택된 파일: ${file.name}`;
        fileName.style.display = 'block';
        loading.classList.add('active');
        results.classList.remove('active');
        error.classList.remove('active');
        try {
            const content = await file.text();
            // 분석 실행
            let analysisResult = null;
            // 파일 선택 시점의 키워드 읽기
            const keywordsInputAtUpload = document.getElementById('keywordsInput');
            let keywordsAtUpload;
            if (keywordsInputAtUpload && keywordsInputAtUpload.value.trim()) {
                const rawKeywords = keywordsInputAtUpload.value.split(',')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
                keywordsAtUpload = rawKeywords.length > 0 ? rawKeywords : undefined;
            }
            try {
                analysisResult =
                    analyzeChat(content, undefined, undefined, keywordsAtUpload);
            }
            catch (analyzeError) {
                console.error('분석 중 에러 발생:', analyzeError);
                error.textContent = `분석 중 오류가 발생했습니다: ${analyzeError instanceof Error ? analyzeError.message :
                    String(analyzeError)}`;
                error.classList.add('active');
                loading.classList.remove('active');
                return;
            }
            if (!analysisResult) {
                console.error('analysisResult가 null 또는 undefined입니다!');
                error.textContent = '분석 결과를 받을 수 없습니다';
                error.classList.add('active');
                loading.classList.remove('active');
                return;
            }
            if (!analysisResult.dateRange) {
                console.error('analysisResult.dateRange가 없습니다!');
                error.textContent = '날짜 범위 정보를 찾을 수 없습니다';
                error.classList.add('active');
                loading.classList.remove('active');
                return;
            }
            const cachedDateRange = {
                min: new Date(analysisResult.dateRange.min),
                max: new Date(analysisResult.dateRange.max)
            };
            // 필터 섹션 초기화 및 활성화
            const filterSection = document.getElementById('filterSection');
            if (!filterSection) {
                console.error('filterSection을 찾을 수 없습니다!');
                throw new Error('filterSection 요소를 찾을 수 없습니다');
            }
            // 날짜 입력 필드 초기화
            const formatDateTime = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
            };
            const startInput = document.getElementById('startDateTime');
            const endInput = document.getElementById('endDateTime');
            const keywordsInput = document.getElementById('keywordsInput');
            const dateRangeInfo = document.getElementById('dateRangeInfo');
            if (startInput) {
                startInput.min = formatDateTime(cachedDateRange.min);
                startInput.max = formatDateTime(cachedDateRange.max);
                startInput.value = formatDateTime(cachedDateRange.min);
                startInput.removeAttribute('disabled');
                startInput.disabled = false;
                startInput.style.backgroundColor = 'white';
                startInput.style.cursor = 'pointer';
                startInput.style.opacity = '1';
            }
            else {
                console.error('startInput을 찾을 수 없습니다');
            }
            if (endInput) {
                endInput.min = formatDateTime(cachedDateRange.min);
                endInput.max = formatDateTime(cachedDateRange.max);
                endInput.value = formatDateTime(cachedDateRange.max);
                endInput.removeAttribute('disabled');
                endInput.disabled = false;
                endInput.style.backgroundColor = 'white';
                endInput.style.cursor = 'pointer';
                endInput.style.opacity = '1';
            }
            else {
                console.error('endInput을 찾을 수 없습니다');
            }
            if (keywordsInput) {
                // textarea의 내용이 없을 때만 기본값 설정
                const currentValue = keywordsInput.value || keywordsInput.textContent || '';
                if (!currentValue.trim()) {
                    keywordsInput.value =
                        '벙, 정모, 술, 맛집, 공연, 연습, 밴드, 음악, 노래, 라이브';
                }
            }
            else {
                console.error('keywordsInput을 찾을 수 없습니다');
            }
            if (dateRangeInfo) {
                dateRangeInfo.textContent =
                    `파일 범위: ${cachedDateRange.min.toLocaleString('ko-KR')} ~ ${cachedDateRange.max.toLocaleString('ko-KR')}`;
            }
            // 버튼 요소 가져오기
            const applyFilterBtn = document.getElementById('applyFilterBtn');
            const resetFilterBtn = document.getElementById('resetFilterBtn');
            // 초기 필터 값 저장 (초기화용)
            const initialStartDate = formatDateTime(cachedDateRange.min);
            const initialEndDate = formatDateTime(cachedDateRange.max);
            // 파일 선택 전에 입력된 키워드가 있으면 그것을 사용, 없으면 기본값 사용
            const initialKeywordsValue = keywordsInput && keywordsInput.value.trim() ?
                keywordsInput.value.trim() :
                '벙, 정모, 술, 맛집, 공연, 연습, 밴드, 음악, 노래, 라이브';
            // 결과 렌더링 함수
            const updateStatistics = () => {
                console.log('필터 적용 시작');
                // 로딩 표시 (즉시 표시)
                loading.classList.add('active');
                results.classList.remove('active');
                error.classList.remove('active');
                // 버튼 비활성화
                if (applyFilterBtn) {
                    applyFilterBtn.disabled = true;
                    applyFilterBtn.textContent = '처리 중...';
                }
                // UI 업데이트를 위해 다음 프레임에서 실행
                setTimeout(() => {
                    let startDate;
                    let endDate;
                    if (startInput && startInput.value) {
                        startDate = new Date(startInput.value);
                    }
                    if (endInput && endInput.value) {
                        endDate = new Date(endInput.value);
                    }
                    // 키워드 파싱 (띄어쓰기 유지)
                    let keywords;
                    if (keywordsInput && keywordsInput.value.trim()) {
                        // 쉼표로 구분하되, 각 키워드의 앞뒤 공백만 제거하고 내부 띄어쓰기는
                        // 유지
                        const rawKeywords = keywordsInput.value.split(',')
                            .map(k => k.trim())
                            .filter(k => k.length > 0);
                        keywords = rawKeywords.length > 0 ? rawKeywords : undefined;
                    }
                    else {
                        keywords = undefined;
                    }
                    try {
                        // 필터링된 통계 재계산
                        analysisResult = analyzeChat(content, startDate, endDate, keywords);
                        // 캐시된 날짜 범위 사용
                        analysisResult.dateRange = cachedDateRange;
                        // 결과 렌더링
                        results.innerHTML = renderStatistics(analysisResult.stats);
                        results.classList.add('active');
                        loading.classList.remove('active');
                        // 버튼 상태 복원
                        if (applyFilterBtn) {
                            applyFilterBtn.disabled = false;
                            applyFilterBtn.textContent = '✅ 적용';
                            applyFilterBtn.style.cursor = 'pointer';
                            applyFilterBtn.style.opacity = '1';
                        }
                        // 결과로 스크롤
                        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        console.log('필터 적용 완료');
                    }
                    catch (err) {
                        console.error('필터 적용 중 오류 발생:', err);
                        error.textContent = `필터 적용 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`;
                        error.classList.add('active');
                        loading.classList.remove('active');
                        // 버튼 상태 복원
                        if (applyFilterBtn) {
                            applyFilterBtn.disabled = false;
                            applyFilterBtn.textContent = '✅ 적용';
                            applyFilterBtn.style.cursor = 'pointer';
                            applyFilterBtn.style.opacity = '1';
                        }
                    }
                }, 50);
            };
            // 버튼 활성화 함수 (항상 활성화)
            const enableButtons = () => {
                if (applyFilterBtn) {
                    applyFilterBtn.disabled = false;
                    applyFilterBtn.style.cursor = 'pointer';
                    applyFilterBtn.style.opacity = '1';
                }
                if (resetFilterBtn) {
                    resetFilterBtn.disabled = false;
                    resetFilterBtn.style.cursor = 'pointer';
                    resetFilterBtn.style.opacity = '1';
                }
            };
            // 초기화 함수
            const resetFilters = () => {
                console.log('필터 초기화');
                if (startInput) {
                    startInput.value = initialStartDate;
                }
                if (endInput) {
                    endInput.value = initialEndDate;
                }
                if (keywordsInput) {
                    keywordsInput.value = initialKeywordsValue;
                }
                // 초기화 후 자동으로 적용
                updateStatistics();
            };
            // 입력 필드 변경 감지 - 아무것도 하지 않음 (통계 업데이트 없음)
            // 이벤트 리스너를 제거하여 실시간 업데이트 방지
            // 버튼 이벤트 리스너 등록
            if (applyFilterBtn) {
                applyFilterBtn.addEventListener('click', updateStatistics);
            }
            if (resetFilterBtn) {
                resetFilterBtn.addEventListener('click', resetFilters);
            }
            // 파일 업로드 시 버튼 항상 활성화
            enableButtons();
            results.innerHTML = renderStatistics(analysisResult.stats);
            results.classList.add('active');
            loading.classList.remove('active');
            filterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        catch (err) {
            console.error('오류 발생:', err);
            error.textContent = `오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`;
            error.classList.add('active');
            loading.classList.remove('active');
        }
    });
});
