// 브라우저용 카카오톡 채팅 통계 분석기

interface ChatMessage {
  date: string;
  time: string;
  name: string;
  message: string;
  fullName?: string;
  timestamp: Date;
}

interface Statistics {
  totalMessages: number;
  totalParticipants: number;
  messagesByParticipant: Map<string, number>;
  messagesByDate: Map<string, number>;
  messagesByHour: Map<number, number>;
  messagesByDayOfWeek: Map<string, number>;
  messageTypes: {
    text: number; photo: number; video: number; emoji: number; link: number;
    other: number;
  };
  topParticipants: Array<{name: string; count: number}>;
  topDates: Array<{date: string; count: number}>;
  topHours: Array<{hour: number; count: number}>;
  mentionsByParticipant: Map<string, number>;
  cryingByParticipant: Map<string, number>;
  laughingByParticipant: Map<string, number>;
  topMentioned: Array<{name: string; count: number}>;
  topCrying: Array<{name: string; count: number}>;
  topLaughing: Array<{name: string; count: number}>;
  avgMessageLengthByParticipant: Array<{name: string; avgLength: number}>;
  topWords: Array<{word: string; count: number}>;
  lateNightParticipants: Array<{name: string; count: number}>;
  spamParticipants: Array<{name: string; maxConsecutive: number}>;
  photoSharing: Array<{name: string; count: number}>;
  videoSharing: Array<{name: string; count: number}>;
  linkSharing: Array<{name: string; count: number}>;
  keywordMentions: Map<string, Array<{name: string; count: number}>>;
  // 새로 추가된 통계
  conversationStarters: Array<{name: string; count: number}>;
  conversationEnders: Array<{name: string; count: number}>;
  emotionAnalysis: {
    positive: Array<{name: string; count: number}>;
    negative: Array<{name: string; count: number}>;
    questions: Array<{name: string; count: number}>;
    exclamations: Array<{name: string; count: number}>;
  };
  activityByTimeSlot: Array<{slot: string; count: number; percentage: number}>;
  messageLengthPattern: {
    oneLine: number; short: number; medium: number; long: number;
    veryLong: number;
    byParticipant: Array<{
      name: string; oneLine: number; short: number; medium: number;
      long: number;
      veryLong: number
    }>;
  };
  conversationDensity: {
    avgMessagesPerDay: number; mostActiveDay: {date: string; count: number};
    quietestDay: {date: string; count: number};
    longestGap: {days: number; startDate: string; endDate: string};
    activeDays: number;
    totalDays: number;
  };
  // 새로 추가된 통계
  participantInteractions: Array<{from: string; to: string; count: number}>;
  timelineHeatmap: {
    byMonth: Array<{month: string; count: number}>;
    byWeek: Array<{week: string; count: number}>;
  };
  participationTrend: {
    monthlyParticipants: Array<{month: string; count: number}>;
    participantActivityPeriod: Array<{
      name: string;
      daysActive: number
    }>;
  };
}

// 간단화를 위해 핵심 함수들만 포함

function parseChatMessage(
    match: RegExpMatchArray, fullText: string, startIndex: number,
    nextStartIndex: number): ChatMessage|null {
  const fullLine = match[0];
  const dateTime = match[1];
  const namePart = match[2];

  const messageStart = match.index! + fullLine.length;
  const messageEnd = nextStartIndex > 0 ? nextStartIndex : fullText.length;
  let message = fullText.substring(messageStart, messageEnd).trim();

  let date = '';
  let time = '';

  const dateTimeMatch = dateTime.match(
      /^(\d+년\s*\d+월\s*\d+일)\s*(오전|오후)\s*(\d+:\d+)/);
  if (dateTimeMatch) {
    date = dateTimeMatch[1];
    time = `${dateTimeMatch[2]} ${dateTimeMatch[3]}`;
  } else {
    const dateOnlyMatch = dateTime.match(/^(\d+년\s*\d+월\s*\d+일)/);
    if (dateOnlyMatch) {
      date = dateOnlyMatch[1];
    } else {
      return null;
    }
  }

  const name = namePart.split('/')[0].trim();
  const fullName = namePart.trim();

  const timestamp = parseDateTime(date, time);
  if (!timestamp) return null;

  return {date, time, name, message, fullName, timestamp};
}

function detectMessageType(message: string): 'text'|'photo'|'video'|'emoji'|
    'link'|'other' {
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

function parseHour(time: string): number {
  const match = time.match(/(오전|오후)\s*(\d+):(\d+)/);
  if (!match) return -1;

  const [, period, hourStr] = match;
  let hour = parseInt(hourStr, 10);

  if (period === '오후' && hour !== 12) {
    hour += 12;
  } else if (period === '오전' && hour === 12) {
    hour = 0;
  }

  return hour;
}

function getDayOfWeek(dateStr: string): string {
  const match = dateStr.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
  if (!match) return '알 수 없음';

  const [, year, month, day] = match;
  const date =
      new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const days =
      ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[date.getDay()];
}

function parseDateTime(dateStr: string, timeStr: string): Date|null {
  const dateMatch = dateStr.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
  if (!dateMatch) return null;

  const [, year, month, day] = dateMatch;
  const timeMatch = timeStr.match(/(오전|오후)\s*(\d+):(\d+)/);
  if (!timeMatch) return null;

  const [, period, hourStr, minuteStr] = timeMatch;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (period === '오후' && hour !== 12) {
    hour += 12;
  } else if (period === '오전' && hour === 12) {
    hour = 0;
  }

  return new Date(
      parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), hour,
      minute);
}

function extractMentionedNames(message: string): string[] {
  const mentionPattern = /@([^/\s@]+)(?:\/[^\s@]*)?/g;
  const names: string[] = [];
  let match;
  while ((match = mentionPattern.exec(message)) !== null) {
    const name = match[1].trim();
    if (name) {
      names.push(name);
    }
  }
  return names;
}

function countCryingExpressions(message: string): number {
  const cryingPattern = /[ㅜㅠ]{1,}/g;
  const matches = message.match(cryingPattern);
  return matches ? matches.length : 0;
}

function countLaughingExpressions(message: string): number {
  const laughingPattern =
      /(ㅋ{1,}|ㅎ{1,}|ㅊ{1,}|하하|호호|헤헤|히히|크크|킥킥)/g;
  const matches = message.match(laughingPattern);
  return matches ? matches.length : 0;
}

function extractWords(message: string): string[] {
  const words: string[] = [];
  const koreanWords = message.match(/[가-힣]{2,}/g) || [];
  const englishWords =
      (message.match(/[a-zA-Z]{2,}/g) || []).map(w => w.toLowerCase());
  words.push(...koreanWords, ...englishWords);
  return words;
}

// analyzeChat 함수를 content를 직접 받도록 수정
// 필터링을 위해 모든 메시지 배열도 반환
interface AnalysisResult {
  stats: Statistics;
  allMessages: ChatMessage[];
  dateRange: {min: Date; max: Date};
}

function analyzeChat(
    content: string, startDate?: Date, endDate?: Date,
    keywords?: string[]): AnalysisResult {
  const messages: ChatMessage[] = [];
  const messagesByParticipant = new Map<string, number>();
  const messagesByDate = new Map<string, number>();
  const messagesByHour = new Map<number, number>();
  const messagesByDayOfWeek = new Map<string, number>();
  const messageTypes =
      {text: 0, photo: 0, video: 0, emoji: 0, link: 0, other: 0};
  const mentionsByParticipant = new Map<string, number>();
  const cryingByParticipant = new Map<string, number>();
  const laughingByParticipant = new Map<string, number>();

  const messageLengthByParticipant = new Map < string, {
    total: number;
    count: number
  }
  >();
  const wordCount = new Map<string, number>();
  const lateNightMessages = new Map<string, number>();
  const photoCount = new Map<string, number>();
  const videoCount = new Map<string, number>();
  const linkCount = new Map<string, number>();
  const keywordMentions = new Map<string, Map<string, number>>();

  // 새로 추가된 통계를 위한 변수
  const conversationStartersCount = new Map<string, number>();
  const conversationEndersCount = new Map<string, number>();
  const positiveExpressions = new Map<string, number>();
  const negativeExpressions = new Map<string, number>();
  const questionExpressions = new Map<string, number>();
  const exclamationExpressions = new Map<string, number>();
  const messagesByTimeSlot = new Map<string, number>();
  const messageLengthByParticipantDetail = new Map < string, {
    oneLine: number;
    short: number;
    medium: number;
    long: number;
    veryLong: number;
  }
  >();
  // 참여자 간 상호작용 (멘션 관계도)
  const mentionRelations = new Map<string, Map<string, number>>();
  // 메시지 타임라인 히트맵
  const messagesByMonth = new Map<string, number>();
  const messagesByWeek = new Map<string, number>();
  // 대화 참여도 변화 추이
  const participantsByMonth = new Map<string, Set<string>>();
  const participantFirstMessage = new Map<string, Date>();
  const participantLastMessage = new Map<string, Date>();
  const participantActiveDates = new Map<string, Set<string>>();

  // 기본 키워드 또는 전달받은 키워드 사용
  const defaultKeywords = [
    '벙', '정모', '술', '맛집', '공연', '연습', '밴드', '음악', '노래',
    '라이브', '락교'
  ];
  const keywordsToUse =
      keywords && keywords.length > 0 ? keywords : defaultKeywords;

  for (const keyword of keywordsToUse) {
    keywordMentions.set(keyword, new Map<string, number>());
  }

  let lastSender = '';
  let lastMessageTime: Date|null = null;
  let consecutiveCount = 0;
  const maxConsecutiveByParticipant = new Map<string, number>();
  const CONSECUTIVE_MESSAGE_THRESHOLD_MS = 5 * 60 * 1000;

  const messagePattern =
      /(\d+년\s*\d+월\s*\d+일\s*(?:오전|오후)\s*\d+:\d+),\s*([^:\n]+?)\s*:\s*/g;

  const matches: RegExpMatchArray[] = [];
  let match;

  while ((match = messagePattern.exec(content)) !== null) {
    matches.push(match);
  }

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;
    const nextStartIndex = nextMatch ? nextMatch.index! : content.length;

    const message = parseChatMessage(
        currentMatch, content, currentMatch.index!, nextStartIndex);
    if (!message || !message.date || !message.timestamp) continue;

    // 날짜 필터링
    if (startDate && message.timestamp < startDate) continue;
    if (endDate && message.timestamp > endDate) continue;

    messages.push(message);

    const participantCount = messagesByParticipant.get(message.name) || 0;
    messagesByParticipant.set(message.name, participantCount + 1);

    const dateCount = messagesByDate.get(message.date) || 0;
    messagesByDate.set(message.date, dateCount + 1);

    // 메시지 타임라인 히트맵 (월별)
    const messageDate = message.timestamp;
    const monthKey =
        `${messageDate.getFullYear()}년 ${messageDate.getMonth() + 1}월`;
    const monthCount = messagesByMonth.get(monthKey) || 0;
    messagesByMonth.set(monthKey, monthCount + 1);

    // 메시지 타임라인 히트맵 (주간별)
    const weekStart = new Date(messageDate);
    weekStart.setDate(messageDate.getDate() - messageDate.getDay());
    const weekKey = `${weekStart.getFullYear()}-${
        String(weekStart.getMonth() + 1).padStart(2, '0')}-${
        String(weekStart.getDate()).padStart(2, '0')}`;
    const weekCount = messagesByWeek.get(weekKey) || 0;
    messagesByWeek.set(weekKey, weekCount + 1);

    // 대화 참여도 변화 추이 (월별 참여자)
    if (!participantsByMonth.has(monthKey)) {
      participantsByMonth.set(monthKey, new Set<string>());
    }
    participantsByMonth.get(monthKey)!.add(message.name);

    // 참여자별 첫/마지막 메시지 날짜
    if (!participantFirstMessage.has(message.name) ||
        message.timestamp < participantFirstMessage.get(message.name)!) {
      participantFirstMessage.set(message.name, message.timestamp);
    }
    if (!participantLastMessage.has(message.name) ||
        message.timestamp > participantLastMessage.get(message.name)!) {
      participantLastMessage.set(message.name, message.timestamp);
    }

    // 참여자별 실제 활동한 날짜 (날짜 문자열로 저장)
    if (!participantActiveDates.has(message.name)) {
      participantActiveDates.set(message.name, new Set<string>());
    }
    participantActiveDates.get(message.name)!.add(message.date);

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

      // 참여자 간 상호작용 (멘션 관계도)
      if (!mentionRelations.has(message.name)) {
        mentionRelations.set(message.name, new Map<string, number>());
      }
      const relationMap = mentionRelations.get(message.name)!;
      const relationCount = relationMap.get(mentionedName) || 0;
      relationMap.set(mentionedName, relationCount + 1);
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
    const lengthData =
        messageLengthByParticipant.get(message.name) || {total: 0, count: 0};
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
    } else if (type === 'video') {
      const count = videoCount.get(message.name) || 0;
      videoCount.set(message.name, count + 1);
    } else if (type === 'link') {
      const count = linkCount.get(message.name) || 0;
      linkCount.set(message.name, count + 1);
    }

    const lowerMessage = message.message.toLowerCase();
    for (const keyword of keywordsToUse) {
      const keywordLower = keyword.toLowerCase().trim();

      // 띄어쓰기가 포함된 키워드도 처리할 수 있도록 패턴 수정
      // 키워드 내부의 띄어쓰기는 그대로 유지하고, 특수문자만 이스케이프
      const escapedKeyword =
          keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // 한국어 특성상 단어 경계가 모호하므로, 단순히 포함 여부만 확인
      // 띄어쓰기 처리 무시 - 메시지에 키워드가 포함되어 있으면 매칭
      const pattern = new RegExp(escapedKeyword, 'g');

      if (pattern.test(lowerMessage)) {
        const keywordMap = keywordMentions.get(keyword)!;
        const count = keywordMap.get(message.name) || 0;
        keywordMap.set(message.name, count + 1);
      }
    }

    // 감정/표현 분석
    const positiveKeywords = [
      '좋아', '최고', '고마워', '사랑', '행복', '즐거', '멋있', '예쁘', '귀여',
      '대박', '완벽', '훌륭', '좋다', '좋은', '좋게'
    ];
    const negativeKeywords = [
      '싫어', '안돼', '아니', '화나', '슬프', '힘들', '짜증', '불편', '나쁘',
      '안좋', '미워', '싫다', '싫은'
    ];
    const questionKeywords = [
      '?', '뭐', '어디', '언제', '누구', '왜', '어떻게', '무엇', '어떤', '몇'
    ];
    const exclamationKeywords =
        ['와', '헐', '대박', '와우', '오', '와!', '헐!', '!'];

    for (const keyword of positiveKeywords) {
      if (lowerMessage.includes(keyword)) {
        const count = positiveExpressions.get(message.name) || 0;
        positiveExpressions.set(message.name, count + 1);
        break;  // 한 메시지당 한 번만 카운트
      }
    }
    for (const keyword of negativeKeywords) {
      if (lowerMessage.includes(keyword)) {
        const count = negativeExpressions.get(message.name) || 0;
        negativeExpressions.set(message.name, count + 1);
        break;
      }
    }
    for (const keyword of questionKeywords) {
      if (lowerMessage.includes(keyword)) {
        const count = questionExpressions.get(message.name) || 0;
        questionExpressions.set(message.name, count + 1);
        break;
      }
    }
    for (const keyword of exclamationKeywords) {
      if (lowerMessage.includes(keyword)) {
        const count = exclamationExpressions.get(message.name) || 0;
        exclamationExpressions.set(message.name, count + 1);
        break;
      }
    }

    // 시간대별 활동 패턴 (새벽, 아침, 점심, 오후, 저녁, 밤)
    let timeSlot = '';
    if (hour >= 0 && hour < 6) {
      timeSlot = '새벽 (0-5시)';
    } else if (hour >= 6 && hour < 12) {
      timeSlot = '아침 (6-11시)';
    } else if (hour >= 12 && hour < 14) {
      timeSlot = '점심 (12-13시)';
    } else if (hour >= 14 && hour < 18) {
      timeSlot = '오후 (14-17시)';
    } else if (hour >= 18 && hour < 22) {
      timeSlot = '저녁 (18-21시)';
    } else {
      timeSlot = '밤 (22-23시)';
    }
    if (timeSlot) {
      const count = messagesByTimeSlot.get(timeSlot) || 0;
      messagesByTimeSlot.set(timeSlot, count + 1);
    }

    // 메시지 길이 패턴
    const hasNewline = message.message.includes('\n');
    const lengthDetail = messageLengthByParticipantDetail.get(message.name) ||
        {oneLine: 0, short: 0, medium: 0, long: 0, veryLong: 0};
    if (!hasNewline && msgLength > 0) {
      lengthDetail.oneLine++;
    }
    if (msgLength <= 5) {
      lengthDetail.short ++;
    } else if (msgLength <= 50) {
      lengthDetail.medium++;
    } else if (msgLength <= 100) {
      lengthDetail.long ++;
    } else {
      lengthDetail.veryLong++;
    }
    messageLengthByParticipantDetail.set(message.name, lengthDetail);

    const currentMessageTime = parseDateTime(message.date, message.time);

    // 대화 주도자 계산 (이전 메시지와 1시간 이상 간격이면 대화 시작)
    const CONVERSATION_START_THRESHOLD_MS = 60 * 60 * 1000;  // 1시간
    if (lastMessageTime && currentMessageTime) {
      const timeDiff = currentMessageTime.getTime() - lastMessageTime.getTime();
      if (timeDiff >= CONVERSATION_START_THRESHOLD_MS) {
        const count = conversationStartersCount.get(message.name) || 0;
        conversationStartersCount.set(message.name, count + 1);
      }
    } else if (!lastMessageTime) {
      // 첫 메시지는 대화 시작으로 간주
      const count = conversationStartersCount.get(message.name) || 0;
      conversationStartersCount.set(message.name, count + 1);
    }

    if (message.name === lastSender && currentMessageTime && lastMessageTime) {
      const timeDiff = currentMessageTime.getTime() - lastMessageTime.getTime();
      if (timeDiff >= 0 && timeDiff <= CONSECUTIVE_MESSAGE_THRESHOLD_MS) {
        consecutiveCount++;
      } else {
        if (consecutiveCount > 0) {
          const currentMax = maxConsecutiveByParticipant.get(lastSender) || 0;
          if (consecutiveCount > currentMax) {
            maxConsecutiveByParticipant.set(lastSender, consecutiveCount);
          }
        }
        consecutiveCount = 1;
      }
      lastMessageTime = currentMessageTime;
    } else {
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
                              .map(([name, count]) => ({name, count}))
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 20);

  const topDates = Array.from(messagesByDate.entries())
                       .map(([date, count]) => ({date, count}))
                       .sort((a, b) => b.count - a.count)
                       .slice(0, 10);

  const topHours = Array.from(messagesByHour.entries())
                       .map(([hour, count]) => ({hour, count}))
                       .sort((a, b) => b.count - a.count)
                       .slice(0, 10);

  const topMentioned = Array.from(mentionsByParticipant.entries())
                           .map(([name, count]) => ({name, count}))
                           .sort((a, b) => b.count - a.count)
                           .slice(0, 20);

  const topCrying = Array.from(cryingByParticipant.entries())
                        .map(([name, count]) => ({name, count}))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 20);

  const topLaughing = Array.from(laughingByParticipant.entries())
                          .map(([name, count]) => ({name, count}))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 20);

  const avgMessageLengthByParticipant =
      Array.from(messageLengthByParticipant.entries())
          .map(
              ([name, data]) =>
                  ({name, avgLength: Math.round(data.total / data.count)}))
          .sort((a, b) => b.avgLength - a.avgLength)
          .slice(0, 20);

  const stopWords = new Set([
    '그리고', '그런데', '그래서', '그러나', '하지만', '그때', '그것', '이것',
    '저것', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'this',
    'that'
  ]);
  const topWords =
      Array.from(wordCount.entries())
          .filter(([word]) => !stopWords.has(word) && word.length >= 2)
          .map(([word, count]) => ({word, count}))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

  const lateNightParticipants = Array.from(lateNightMessages.entries())
                                    .map(([name, count]) => ({name, count}))
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 20);

  const spamParticipants =
      Array.from(maxConsecutiveByParticipant.entries())
          .map(([name, maxConsecutive]) => ({name, maxConsecutive}))
          .sort((a, b) => b.maxConsecutive - a.maxConsecutive)
          .slice(0, 20);

  const photoSharing = Array.from(photoCount.entries())
                           .map(([name, count]) => ({name, count}))
                           .sort((a, b) => b.count - a.count)
                           .slice(0, 20);

  const videoSharing = Array.from(videoCount.entries())
                           .map(([name, count]) => ({name, count}))
                           .sort((a, b) => b.count - a.count)
                           .slice(0, 20);

  const linkSharing = Array.from(linkCount.entries())
                          .map(([name, count]) => ({name, count}))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 20);

  const keywordMentionsResult =
      new Map<string, Array<{name: string; count: number}>>();
  for (const keyword of keywordsToUse) {
    const keywordMap = keywordMentions.get(keyword)!;
    const topMentions = Array.from(keywordMap.entries())
                            .map(([name, count]) => ({name, count}))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 10);
    if (topMentions.length > 0) {
      keywordMentionsResult.set(keyword, topMentions);
    }
  }

  // 대화 종료자 계산 (메시지 후 1시간 동안 아무도 메시지를 보내지 않으면 종료)
  const CONVERSATION_END_THRESHOLD_MS = 1 * 60 * 60 * 1000;  // 1시간
  for (let i = 0; i < messages.length; i++) {
    const currentMessage = messages[i];
    const currentTime = currentMessage.timestamp;
    let isEnd = true;

    // 다음 메시지가 1시간 이내에 있으면 종료가 아님
    for (let j = i + 1; j < messages.length; j++) {
      const nextMessage = messages[j];
      const timeDiff = nextMessage.timestamp.getTime() - currentTime.getTime();
      if (timeDiff > 0 && timeDiff <= CONVERSATION_END_THRESHOLD_MS) {
        isEnd = false;
        break;
      }
      // 1시간을 넘어가면 더 이상 확인할 필요 없음
      if (timeDiff > CONVERSATION_END_THRESHOLD_MS) {
        break;
      }
    }

    if (isEnd) {
      const count = conversationEndersCount.get(currentMessage.name) || 0;
      conversationEndersCount.set(currentMessage.name, count + 1);
    }
  }

  // 대화 주도자/종료자 Top 20
  const conversationStarters = Array.from(conversationStartersCount.entries())
                                   .map(([name, count]) => ({name, count}))
                                   .sort((a, b) => b.count - a.count)
                                   .slice(0, 20);
  const conversationEnders = Array.from(conversationEndersCount.entries())
                                 .map(([name, count]) => ({name, count}))
                                 .sort((a, b) => b.count - a.count)
                                 .slice(0, 20);

  // 감정/표현 분석 Top 20
  const positiveTop = Array.from(positiveExpressions.entries())
                          .map(([name, count]) => ({name, count}))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 20);
  const negativeTop = Array.from(negativeExpressions.entries())
                          .map(([name, count]) => ({name, count}))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 20);
  const questionTop = Array.from(questionExpressions.entries())
                          .map(([name, count]) => ({name, count}))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 20);
  const exclamationTop = Array.from(exclamationExpressions.entries())
                             .map(([name, count]) => ({name, count}))
                             .sort((a, b) => b.count - a.count)
                             .slice(0, 20);

  // 시간대별 활동 패턴
  const totalMessagesForTimeSlot = Array.from(messagesByTimeSlot.values())
                                       .reduce((sum, count) => sum + count, 0);
  const activityByTimeSlot =
      Array.from(messagesByTimeSlot.entries())
          .map(([slot, count]) => ({
                 slot,
                 count,
                 percentage: totalMessagesForTimeSlot > 0 ?
                     (count / totalMessagesForTimeSlot * 100) :
                     0
               }))
          .sort((a, b) => b.count - a.count);

  // 메시지 길이 패턴
  let oneLineCount = 0;
  let shortCount = 0;
  let mediumCount = 0;
  let longCount = 0;
  let veryLongCount = 0;
  for (const detail of messageLengthByParticipantDetail.values()) {
    oneLineCount += detail.oneLine;
    shortCount += detail.short;
    mediumCount += detail.medium;
    longCount += detail.long;
    veryLongCount += detail.veryLong;
  }
  const messageLengthByParticipantDetailArray =
      Array.from(messageLengthByParticipantDetail.entries())
          .map(([name, detail]) => ({
                 name,
                 oneLine: detail.oneLine,
                 short: detail.short,
                 medium: detail.medium,
                 long: detail.long,
                 veryLong: detail.veryLong
               }))
          .sort((a, b) => {
            const totalA = a.oneLine + a.short + a.medium + a.long + a.veryLong;
            const totalB = b.oneLine + b.short + b.medium + b.long + b.veryLong;
            return totalB - totalA;
          })
          .slice(0, 20);

  // 대화 밀도 분석
  const dateArray = Array.from(messagesByDate.entries())
                        .map(([date, count]) => ({date, count}))
                        .sort((a, b) => a.date.localeCompare(b.date));
  const totalDays = dateArray.length;
  const activeDays = dateArray.filter(d => d.count > 0).length;
  const avgMessagesPerDay = totalDays > 0 ? messages.length / totalDays : 0;

  let mostActiveDay = {date: '', count: 0};
  let quietestDay = {date: '', count: Infinity};
  for (const {date, count} of dateArray) {
    if (count > mostActiveDay.count) {
      mostActiveDay = {date, count};
    }
    if (count < quietestDay.count && count > 0) {
      quietestDay = {date, count};
    }
  }
  if (quietestDay.count === Infinity) {
    quietestDay = {date: dateArray[0]?.date || '', count: 0};
  }

  // 가장 긴 공백 기간 계산
  let longestGap = {days: 0, startDate: '', endDate: ''};
  for (let i = 0; i < dateArray.length - 1; i++) {
    const currentDate = new Date(dateArray[i].date);
    const nextDate = new Date(dateArray[i + 1].date);
    const daysDiff = Math.floor(
        (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > longestGap.days) {
      longestGap = {
        days: daysDiff,
        startDate: dateArray[i].date,
        endDate: dateArray[i + 1].date
      };
    }
  }

  // 참여자 간 상호작용 (멘션 관계도) Top 30
  const participantInteractions:
      Array<{from: string; to: string; count: number}> = [];
  for (const [from, toMap] of mentionRelations.entries()) {
    for (const [to, count] of toMap.entries()) {
      participantInteractions.push({from, to, count});
    }
  }
  participantInteractions.sort((a, b) => b.count - a.count);
  const topInteractions = participantInteractions.slice(0, 30);

  // 메시지 타임라인 히트맵
  const timelineByMonth = Array.from(messagesByMonth.entries())
                              .map(([month, count]) => ({month, count}))
                              .sort((a, b) => a.month.localeCompare(b.month));
  const timelineByWeek =
      Array.from(messagesByWeek.entries())
          .map(([weekKey, count]) => {
            const date = new Date(weekKey);
            return {
              week: `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${
                  date.getDate()}일 주`,
              count,
              sortKey: weekKey
            };
          })
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
          .map(({week, count}) => ({week, count}));

  // 대화 참여도 변화 추이
  const monthlyParticipants =
      Array.from(participantsByMonth.entries())
          .map(([month, participants]) => ({month, count: participants.size}))
          .sort((a, b) => {
            // "2024년 1월" 형식을 파싱하여 시간순 정렬
            const parseMonth = (monthStr: string) => {
              const match = monthStr.match(/(\d+)년\s*(\d+)월/);
              if (match) {
                return parseInt(match[1]) * 12 + parseInt(match[2]);
              }
              return 0;
            };
            return parseMonth(a.month) - parseMonth(b.month);
          });

  const participantActivityPeriod =
      Array.from(participantFirstMessage.keys())
          .map(name => {
            // 실제로 메시지를 보낸 날짜만 카운트
            const activeDates =
                participantActiveDates.get(name) || new Set<string>();
            const daysActive = activeDates.size;
            return {
              name,
              daysActive
            };
          })
          .sort((a, b) => b.daysActive - a.daysActive)
          .slice(0, 20);

  // 날짜 범위 계산 (필터링 전 모든 메시지)
  // 전체 메시지를 파싱하여 날짜 범위 계산 (첫 분석 시에만 필요)
  let minDate: Date|null = null;
  let maxDate: Date|null = null;
  const allMessagesForRange: ChatMessage[] = [];

  // 전체 메시지를 파싱하여 날짜 범위 계산
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;
    const nextStartIndex = nextMatch ? nextMatch.index! : content.length;

    const msg = parseChatMessage(
        currentMatch, content, currentMatch.index!, nextStartIndex);
    if (msg && msg.timestamp) {
      allMessagesForRange.push(msg);
      if (!minDate || msg.timestamp < minDate) minDate = msg.timestamp;
      if (!maxDate || msg.timestamp > maxDate) maxDate = msg.timestamp;
    }
  }

  const result: AnalysisResult = {
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
      avgMessageLengthByParticipant,
      topWords,
      lateNightParticipants,
      spamParticipants,
      photoSharing,
      videoSharing,
      linkSharing,
      keywordMentions: keywordMentionsResult,
      conversationStarters,
      conversationEnders,
      emotionAnalysis: {
        positive: positiveTop,
        negative: negativeTop,
        questions: questionTop,
        exclamations: exclamationTop
      },
      activityByTimeSlot,
      messageLengthPattern: {
        oneLine: oneLineCount,
        short: shortCount,
        medium: mediumCount,
        long: longCount,
        veryLong: veryLongCount,
        byParticipant: messageLengthByParticipantDetailArray
      },
      conversationDensity: {
        avgMessagesPerDay: Math.round(avgMessagesPerDay * 10) / 10,
        mostActiveDay,
        quietestDay,
        longestGap,
        activeDays,
        totalDays
      },
      participantInteractions: topInteractions,
      timelineHeatmap: {byMonth: timelineByMonth, byWeek: timelineByWeek},
      participationTrend: {monthlyParticipants, participantActivityPeriod}
    },
    allMessages: allMessagesForRange,
    dateRange: {min: minDate || new Date(), max: maxDate || new Date()}
  };

  return result;
}

// HTML 렌더링 함수
function renderStatistics(stats: Statistics): string {
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
          <div class="label">텍스트 (${
      ((stats.messageTypes.text / stats.totalMessages) * 100)
          .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.photo.toLocaleString()}</div>
          <div class="label">사진 (${
      ((stats.messageTypes.photo / stats.totalMessages) * 100)
          .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.video.toLocaleString()}</div>
          <div class="label">동영상 (${
      ((stats.messageTypes.video / stats.totalMessages) * 100)
          .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.emoji.toLocaleString()}</div>
          <div class="label">이모티콘 (${
      ((stats.messageTypes.emoji / stats.totalMessages) * 100)
          .toFixed(1)}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${stats.messageTypes.link.toLocaleString()}</div>
          <div class="label">링크 (${
      ((stats.messageTypes.link / stats.totalMessages) * 100)
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
    const percentage =
        ((participant.count / stats.totalMessages) * 100).toFixed(1);
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

  // 연속 메시지
  html += `
    <div class="stat-section">
      <h2>💬 연속 메시지 최고 기록 (Top 20)</h2>
      <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">
        같은 사람이 5분 이내에 연속으로 보낸 메시지의 최대 개수입니다.
      </p>
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

  // 대화 주도자와 종료자
  html += `
    <div class="stat-section">
      <h2>🎯 대화 주도자 & 종료자 (Top 20)</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <h3 style="margin-bottom: 10px; color: #4CAF50;">🚀 대화 주도자</h3>
          <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">
            이전 메시지와 1시간 이상 간격이 있을 때 대화를 시작한 사람입니다.
          </p>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>이름</th>
                  <th>시작 횟수</th>
                </tr>
              </thead>
              <tbody>
  `;
  stats.conversationStarters.forEach((person, index) => {
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
        <div>
          <h3 style="margin-bottom: 10px; color: #FF9800;">🏁 대화 종료자</h3>
          <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">
            메시지 후 1시간 동안 아무도 메시지를 보내지 않아 대화를 종료한 사람입니다.
          </p>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>이름</th>
                  <th>종료 횟수</th>
                </tr>
              </thead>
              <tbody>
  `;
  stats.conversationEnders.forEach((person, index) => {
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
      </div>
    </div>
  `;

  // 감정/표현 분석
  html += `
    <div class="stat-section">
      <h2>😊 감정/표현 분석 (Top 20)</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="margin-bottom: 10px; color: #4CAF50;">✨ 긍정 표현</h3>
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
  stats.emotionAnalysis.positive.forEach((person, index) => {
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
        <div>
          <h3 style="margin-bottom: 10px; color: #F44336;">😢 부정 표현</h3>
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
  stats.emotionAnalysis.negative.forEach((person, index) => {
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
        <div>
          <h3 style="margin-bottom: 10px; color: #2196F3;">❓ 질문 표현</h3>
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
  stats.emotionAnalysis.questions.forEach((person, index) => {
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
        <div>
          <h3 style="margin-bottom: 10px; color: #FF9800;">🎉 감탄사</h3>
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
  stats.emotionAnalysis.exclamations.forEach((person, index) => {
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
      </div>
    </div>
  `;

  // 시간대별 활동 패턴
  html += `
    <div class="stat-section">
      <h2>🕐 시간대별 활동 패턴</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>시간대</th>
              <th>메시지 수</th>
              <th>비율</th>
            </tr>
          </thead>
          <tbody>
  `;
  stats.activityByTimeSlot.forEach((slot) => {
    html += `
      <tr>
        <td class="name">${slot.slot}</td>
        <td class="count">${slot.count.toLocaleString()}개</td>
        <td class="count">${slot.percentage.toFixed(1)}%</td>
      </tr>
    `;
  });
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 메시지 길이 패턴
  const totalLengthMessages = stats.messageLengthPattern.oneLine +
      stats.messageLengthPattern.short + stats.messageLengthPattern.medium +
      stats.messageLengthPattern.long + stats.messageLengthPattern.veryLong;
  html += `
    <div class="stat-section">
      <h2>📏 메시지 길이 패턴</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value">${
      stats.messageLengthPattern.oneLine.toLocaleString()}</div>
          <div class="label">한 줄 메시지 (${
      totalLengthMessages > 0 ?
          ((stats.messageLengthPattern.oneLine / totalLengthMessages) * 100)
              .toFixed(1) :
          0}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.messageLengthPattern.short.toLocaleString()}</div>
          <div class="label">짧은 메시지 (5자 이하) (${
      totalLengthMessages > 0 ?
          ((stats.messageLengthPattern.short / totalLengthMessages) * 100)
              .toFixed(1) :
          0}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.messageLengthPattern.medium.toLocaleString()}</div>
          <div class="label">중간 메시지 (6-50자) (${
      totalLengthMessages > 0 ?
          ((stats.messageLengthPattern.medium / totalLengthMessages) * 100)
              .toFixed(1) :
          0}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.messageLengthPattern.long.toLocaleString()}</div>
          <div class="label">긴 메시지 (51-100자) (${
      totalLengthMessages > 0 ?
          ((stats.messageLengthPattern.long / totalLengthMessages) * 100)
              .toFixed(1) :
          0}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.messageLengthPattern.veryLong.toLocaleString()}</div>
          <div class="label">매우 긴 메시지 (100자 이상) (${
      totalLengthMessages > 0 ?
          ((stats.messageLengthPattern.veryLong / totalLengthMessages) * 100)
              .toFixed(1) :
          0}%)</div>
        </div>
      </div>
      <h3 style="margin-top: 30px; margin-bottom: 15px;">참여자별 메시지 길이 패턴 (Top 20)</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>한 줄</th>
              <th>짧은</th>
              <th>중간</th>
              <th>긴</th>
              <th>매우 긴</th>
            </tr>
          </thead>
          <tbody>
  `;
  stats.messageLengthPattern.byParticipant.forEach((person, index) => {
    html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${person.name}</td>
        <td class="count">${person.oneLine.toLocaleString()}</td>
        <td class="count">${person.short.toLocaleString()}</td>
        <td class="count">${person.medium.toLocaleString()}</td>
        <td class="count">${person.long.toLocaleString()}</td>
        <td class="count">${person.veryLong.toLocaleString()}</td>
      </tr>
    `;
  });
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 대화 밀도 분석
  html += `
    <div class="stat-section">
      <h2>📊 대화 밀도 분석</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value">${
      stats.conversationDensity.avgMessagesPerDay.toLocaleString()}</div>
          <div class="label">하루 평균 메시지 수</div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.conversationDensity.activeDays.toLocaleString()}일</div>
          <div class="label">활동한 날 (${
      stats.conversationDensity.totalDays > 0 ?
          ((stats.conversationDensity.activeDays /
            stats.conversationDensity.totalDays) *
           100)
              .toFixed(1) :
          0}%)</div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.conversationDensity.mostActiveDay.count.toLocaleString()}개</div>
          <div class="label">가장 활발한 날<br><span style="font-size: 0.8em; color: #666;">${
      stats.conversationDensity.mostActiveDay.date}</span></div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.conversationDensity.quietestDay.count.toLocaleString()}개</div>
          <div class="label">가장 조용한 날<br><span style="font-size: 0.8em; color: #666;">${
      stats.conversationDensity.quietestDay.date}</span></div>
        </div>
        <div class="stat-card">
          <div class="value">${
      stats.conversationDensity.longestGap.days.toLocaleString()}일</div>
          <div class="label">가장 긴 공백 기간<br><span style="font-size: 0.8em; color: #666;">${
      stats.conversationDensity.longestGap.startDate} ~ ${
      stats.conversationDensity.longestGap.endDate}</span></div>
        </div>
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
    const sortedKeywords =
        keywordEntries
            .map(([keyword, mentions]) => {
              const totalMentions =
                  mentions.reduce((sum, m) => sum + m.count, 0);
              return {keyword, mentions, totalMentions};
            })
            .filter(item => item.mentions.length > 0)
            .sort((a, b) => b.totalMentions - a.totalMentions);

    for (const {keyword, mentions} of sortedKeywords) {
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

  // 참여자 간 상호작용
  if (stats.participantInteractions.length > 0) {
    html += `
    <div class="stat-section">
      <h2>🤝 참여자 간 상호작용 (멘션 관계도 Top 30)</h2>
      <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">
        누가 누구를 가장 많이 멘션했는지 보여줍니다.
      </p>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>멘션한 사람</th>
              <th>멘션당한 사람</th>
              <th>멘션 횟수</th>
            </tr>
          </thead>
          <tbody>
    `;
    stats.participantInteractions.forEach((interaction, index) => {
      html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${interaction.from}</td>
        <td class="name">${interaction.to}</td>
        <td class="count">${interaction.count.toLocaleString()}회</td>
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

  // 메시지 타임라인 히트맵
  html += `
    <div class="stat-section">
      <h2>📅 메시지 타임라인 히트맵</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="margin-bottom: 15px;">월별 메시지 수</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>월</th>
                  <th>메시지 수</th>
                </tr>
              </thead>
              <tbody>
  `;
  stats.timelineHeatmap.byMonth.forEach((item) => {
    html += `
      <tr>
        <td class="name">${item.month}</td>
        <td class="count">${item.count.toLocaleString()}개</td>
      </tr>
    `;
  });
  html += `
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 style="margin-bottom: 15px;">주간별 메시지 수</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>주</th>
                  <th>메시지 수</th>
                </tr>
              </thead>
              <tbody>
  `;
  stats.timelineHeatmap.byWeek.forEach((item) => {
    html += `
      <tr>
        <td class="name">${item.week}</td>
        <td class="count">${item.count.toLocaleString()}개</td>
      </tr>
    `;
  });
  html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // 대화 참여도 변화 추이
  html += `
    <div class="stat-section">
      <h2>📈 대화 참여도 변화 추이</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="margin-bottom: 15px;">월별 참여자 수</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>월</th>
                  <th>참여자 수</th>
                </tr>
              </thead>
              <tbody>
  `;
  stats.participationTrend.monthlyParticipants.forEach((item) => {
    html += `
      <tr>
        <td class="name">${item.month}</td>
        <td class="count">${item.count}명</td>
      </tr>
    `;
  });
  html += `
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 style="margin-bottom: 15px;">참여자별 활동 기간 (Top 20)</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>이름</th>
                  <th>활동 기간</th>
                </tr>
              </thead>
              <tbody>
  `;
  stats.participationTrend.participantActivityPeriod.forEach(
      (participant, index) => {
        html += `
      <tr>
        <td class="rank">${index + 1}</td>
        <td class="name">${participant.name}</td>
        <td class="count">${participant.daysActive}일</td>
      </tr>
    `;
      });
  html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  return html;
}

// 파일 업로드 및 처리
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const fileName = document.getElementById('fileName')!;
  const loading = document.getElementById('loading')!;
  const results = document.getElementById('results')!;
  const error = document.getElementById('error')!;
  const fileInputButton =
      document.querySelector('.file-input-button') as HTMLElement;

  // 파일 선택 버튼 클릭 시 파일 입력 트리거
  if (fileInputButton) {
    fileInputButton.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
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
      let analysisResult: AnalysisResult|null = null;

      // 파일 선택 시점의 키워드 읽기
      const keywordsInputAtUpload =
          document.getElementById('keywordsInput') as HTMLTextAreaElement;
      let keywordsAtUpload: string[]|undefined;
      if (keywordsInputAtUpload && keywordsInputAtUpload.value.trim()) {
        const rawKeywords = keywordsInputAtUpload.value.split(',')
                                .map(k => k.trim())
                                .filter(k => k.length > 0);
        keywordsAtUpload = rawKeywords.length > 0 ? rawKeywords : undefined;
      }

      try {
        analysisResult =
            analyzeChat(content, undefined, undefined, keywordsAtUpload);
      } catch (analyzeError) {
        console.error('분석 중 에러 발생:', analyzeError);
        error.textContent = `분석 중 오류가 발생했습니다: ${
            analyzeError instanceof Error ? analyzeError.message :
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
      const formatDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      const startInput =
          document.getElementById('startDateTime') as HTMLInputElement;
      const endInput =
          document.getElementById('endDateTime') as HTMLInputElement;
      const keywordsInput =
          document.getElementById('keywordsInput') as HTMLTextAreaElement;
      const dateRangeInfo = document.getElementById('dateRangeInfo')!;

      if (startInput) {
        startInput.min = formatDateTime(cachedDateRange.min);
        startInput.max = formatDateTime(cachedDateRange.max);
        startInput.value = formatDateTime(cachedDateRange.min);
        startInput.removeAttribute('disabled');
        startInput.disabled = false;
        startInput.style.backgroundColor = 'white';
        startInput.style.cursor = 'pointer';
        startInput.style.opacity = '1';
      } else {
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
      } else {
        console.error('endInput을 찾을 수 없습니다');
      }

      if (keywordsInput) {
        // textarea의 내용이 없을 때만 기본값 설정
        const currentValue =
            keywordsInput.value || keywordsInput.textContent || '';
        if (!currentValue.trim()) {
          keywordsInput.value =
              '벙, 정모, 술, 맛집, 공연, 연습, 밴드, 음악, 노래, 라이브, 락교';
        }
      } else {
        console.error('keywordsInput을 찾을 수 없습니다');
      }

      if (dateRangeInfo) {
        dateRangeInfo.textContent =
            `파일 범위: ${cachedDateRange.min.toLocaleString('ko-KR')} ~ ${
                cachedDateRange.max.toLocaleString('ko-KR')}`;
      }

      // 버튼 요소 가져오기
      const applyFilterBtn =
          document.getElementById('applyFilterBtn') as HTMLButtonElement;
      const resetFilterBtn =
          document.getElementById('resetFilterBtn') as HTMLButtonElement;

      // 초기 필터 값 저장 (초기화용)
      const initialStartDate = formatDateTime(cachedDateRange.min);
      const initialEndDate = formatDateTime(cachedDateRange.max);
      // 파일 선택 전에 입력된 키워드가 있으면 그것을 사용, 없으면 기본값 사용
      const initialKeywordsValue = keywordsInput && keywordsInput.value.trim() ?
          keywordsInput.value.trim() :
          '벙, 정모, 술, 맛집, 공연, 연습, 밴드, 음악, 노래, 라이브, 락교';

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
          let startDate: Date|undefined;
          let endDate: Date|undefined;

          if (startInput && startInput.value) {
            startDate = new Date(startInput.value);
          }
          if (endInput && endInput.value) {
            endDate = new Date(endInput.value);
          }

          // 키워드 파싱 (띄어쓰기 유지)
          let keywords: string[]|undefined;
          if (keywordsInput && keywordsInput.value.trim()) {
            // 쉼표로 구분하되, 각 키워드의 앞뒤 공백만 제거하고 내부 띄어쓰기는
            // 유지
            const rawKeywords = keywordsInput.value.split(',')
                                    .map(k => k.trim())
                                    .filter(k => k.length > 0);
            keywords = rawKeywords.length > 0 ? rawKeywords : undefined;
          } else {
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
            results.scrollIntoView({behavior: 'smooth', block: 'start'});
            console.log('필터 적용 완료');
          } catch (err) {
            console.error('필터 적용 중 오류 발생:', err);
            error.textContent = `필터 적용 중 오류가 발생했습니다: ${
                err instanceof Error ? err.message : String(err)}`;
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

      filterSection.scrollIntoView({behavior: 'smooth', block: 'start'});
    } catch (err) {
      console.error('오류 발생:', err);
      error.textContent = `오류가 발생했습니다: ${
          err instanceof Error ? err.message : String(err)}`;
      error.classList.add('active');
      loading.classList.remove('active');
    }
  });
});
