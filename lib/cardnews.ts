export type SlideRole = "Hook" | "Setup" | "Tension" | "Insight" | "Shift" | "Proof" | "Soft CTA" | "Hard CTA";

export type FactoryProject = {
  topic: string;
  brief: {
    targetPersona: string;
    readerDesire: string;
    readerProblem: string;
    contentAngle: string;
    coreMessage: string;
    ctaStrategy: string;
  };
  slides: Array<{
    slideNumber: number;
    role: SlideRole;
    headline: string;
    body: string;
    visualDirection: string;
    openLoop: string;
    saveOrShareTrigger: string;
    hasCta: boolean;
    approved: boolean;
  }>;
  caption: {
    seoFirstSentence: string;
    body: string;
    saveCta: string;
    shareCta: string;
    commentCta: string;
    hashtags: string[];
  };
  reviewChecklist: Array<{
    name: string;
    passed: boolean;
    note: string;
  }>;
  warnings: string[];
};

export function normalizeTopic(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function createMockProject(topicInput: string, source = "", warning = "mock mode"): FactoryProject {
  const topic = normalizeTopic(topicInput || inferTopic(source) || "새 카드뉴스");
  const brief = {
    targetPersona: "1인 창업가, 지식 크리에이터, 퍼스널 브랜딩을 키우는 실무자",
    readerDesire: `${topic}을 막연한 정보가 아니라 바로 실행할 기준으로 정리하고 싶다.`,
    readerProblem: "정보는 많은데 내 콘텐츠로 어떻게 바꿔야 할지 판단 기준이 없다.",
    contentAngle: `${topic}은 더 많이 아는 문제가 아니라 첫 장에서 선택받는 구조의 문제다.`,
    coreMessage: "좋은 카드뉴스는 요약이 아니라 넘김, 저장, 공유, 댓글을 설계한 흐름이다.",
    ctaStrategy: "7번에서 저장을 유도하고 8번에서 주제 댓글 또는 DM을 요청한다."
  };

  const slides: FactoryProject["slides"] = [
    {
      slideNumber: 1,
      role: "Hook",
      headline: `${topic}, 첫 장에서 갈립니다`,
      body: "사람들은 좋은 정보를 기다리지 않습니다.\n자기 이야기라고 느낄 때만 다음 장을 넘깁니다.",
      visualDirection: "큰 제목과 강한 대비",
      openLoop: "첫 장에 무엇을 넣어야 하는지 궁금하게 만든다.",
      saveOrShareTrigger: "공감형 후킹",
      hasCta: false,
      approved: false
    },
    {
      slideNumber: 2,
      role: "Setup",
      headline: "왜 지금 중요할까",
      body: "콘텐츠가 많아질수록 사람들은 더 빨리 거릅니다.\n이제 설명보다 선택받는 구조가 먼저입니다.",
      visualDirection: "정보 과잉과 선택 구조 비교",
      openLoop: "선택받지 못하는 콘텐츠의 공통점을 예고한다.",
      saveOrShareTrigger: "현재 문제를 선명하게 보여줌",
      hasCta: false,
      approved: false
    },
    {
      slideNumber: 3,
      role: "Tension",
      headline: "대부분 여기서 막힙니다",
      body: "열심히 요약하고 예쁘게 디자인합니다.\n하지만 독자의 욕망을 건드리지 못하면 저장도 공유도 일어나지 않습니다.",
      visualDirection: "요약 중심 vs 욕망 중심",
      openLoop: "무엇을 먼저 설계해야 하는지 연결한다.",
      saveOrShareTrigger: "실패 원인 진단",
      hasCta: false,
      approved: false
    },
    {
      slideNumber: 4,
      role: "Insight",
      headline: "PDA로 먼저 잡으세요",
      body: "Persona: 누구에게 말하는가\nDesire: 무엇을 원하는가\nAwareness: 문제를 얼마나 아는가",
      visualDirection: "PDA 3분할 다이어그램",
      openLoop: "이 기준이 카피를 어떻게 바꾸는지 예고한다.",
      saveOrShareTrigger: "템플릿형 저장 포인트",
      hasCta: false,
      approved: false
    },
    {
      slideNumber: 5,
      role: "Shift",
      headline: "관점을 바꾸면 보입니다",
      body: "카드뉴스는 내용을 줄이는 작업이 아닙니다.\n독자가 되고 싶은 모습으로 초대하는 설계입니다.",
      visualDirection: "Before/After 전환",
      openLoop: "저장되는 구조의 공통점으로 넘긴다.",
      saveOrShareTrigger: "아하 모먼트",
      hasCta: false,
      approved: false
    },
    {
      slideNumber: 6,
      role: "Proof",
      headline: "저장되는 카드의 공통점",
      body: "체크리스트, 단계별 가이드, 결정 기준.\n이 셋 중 하나가 있으면 사람들은 나중에 다시 보려고 저장합니다.",
      visualDirection: "체크리스트 UI",
      openLoop: "바로 저장하게 만드는 마지막 기준으로 연결한다.",
      saveOrShareTrigger: "체크리스트",
      hasCta: false,
      approved: false
    },
    {
      slideNumber: 7,
      role: "Soft CTA",
      headline: "이 기준만 저장하세요",
      body: "다음 기획 전에 3가지만 적어보세요.\n누구에게 말하나?\n무엇을 원하나?\n왜 지금 봐야 하나?",
      visualDirection: "저장용 미니 템플릿",
      openLoop: "오늘 바로 할 행동으로 이어진다.",
      saveOrShareTrigger: "명시적 저장 유도",
      hasCta: true,
      approved: false
    },
    {
      slideNumber: 8,
      role: "Hard CTA",
      headline: "당신의 주제는 무엇인가요?",
      body: "댓글에 카드뉴스로 만들고 싶은 주제 1개를 남겨주세요.\n가장 막히는 지점부터 후킹 문장을 잡아보겠습니다.",
      visualDirection: "댓글 입력창과 CTA",
      openLoop: "댓글, DM, 다음 콘텐츠로 연결",
      saveOrShareTrigger: "구체적인 댓글 CTA",
      hasCta: true,
      approved: false
    }
  ];

  return {
    topic,
    brief,
    slides,
    caption: {
      seoFirstSentence: `${topic}을 카드뉴스로 만들 때 가장 먼저 볼 것은 첫 장의 후킹입니다.`,
      body:
        `${brief.contentAngle}\n\n` +
        "좋은 카드뉴스는 정보를 줄인 결과물이 아니라 독자가 넘기고 저장하고 공유하게 만드는 흐름입니다.\n" +
        "오늘 만든 8장 구조를 다음 기획의 체크리스트로 써보세요.",
      saveCta: "저장해두고 다음 카드뉴스 기획 전에 다시 확인하세요.",
      shareCta: "이 주제로 고민하는 동료나 친구에게 보내주세요.",
      commentCta: "댓글에 지금 만들고 싶은 카드뉴스 주제 1개를 남겨주세요.",
      hashtags: buildHashtags(topic)
    },
    reviewChecklist: [
      { name: "1번 슬라이드 후킹", passed: true, note: "문제, 욕망, 대담한 주장 중 하나로 시작" },
      { name: "한 슬라이드 한 포인트", passed: true, note: "각 슬라이드가 하나의 메시지만 전달" },
      { name: "열린 고리", passed: true, note: "다음 장을 보게 만드는 연결 문맥 포함" },
      { name: "저장 트리거", passed: true, note: "체크리스트, 템플릿, 기준 포함" },
      { name: "공유 트리거", passed: true, note: "동료에게 보내고 싶은 공감 포인트 포함" },
      { name: "CTA 2개", passed: true, note: "Soft CTA와 Hard CTA 포함" },
      { name: "캡션 SEO", passed: true, note: "첫 문장에 주제 키워드 포함" },
      { name: "해시태그", passed: true, note: "5~12개 범위 유지" }
    ],
    warnings: [warning]
  };
}

export function projectToJson(project: FactoryProject) {
  return JSON.stringify(project, null, 2);
}

export function projectToMarkdown(project: FactoryProject) {
  return [
    `# ${project.topic}`,
    "",
    "## Brief",
    `- Target: ${project.brief.targetPersona}`,
    `- Desire: ${project.brief.readerDesire}`,
    `- Problem: ${project.brief.readerProblem}`,
    `- Angle: ${project.brief.contentAngle}`,
    "",
    "## Slides",
    ...project.slides.flatMap((slide) => [
      "",
      `### ${slide.slideNumber}. ${slide.role}`,
      `**${slide.headline}**`,
      "",
      slide.body,
      "",
      `- Visual: ${slide.visualDirection}`,
      `- Open loop: ${slide.openLoop}`,
      `- Trigger: ${slide.saveOrShareTrigger}`,
      `- Approved: ${slide.approved}`
    ])
  ].join("\n");
}

function inferTopic(source: string) {
  const first = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return first?.slice(0, 80) || "";
}

function buildHashtags(topic: string) {
  const words = topic.match(/[0-9A-Za-z가-힣]{2,}/g) || [];
  const tags = [...words.slice(0, 3), "카드뉴스", "콘텐츠기획", "퍼스널브랜딩", "인스타그램마케팅", "AI자동화"];
  return [...new Set(tags)].slice(0, 10).map((tag) => `#${tag}`);
}
