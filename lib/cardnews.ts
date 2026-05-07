export type SlideRole = "Hook" | "Setup" | "Tension" | "Insight" | "Shift" | "Proof" | "Soft CTA" | "Hard CTA";

export type CardnewsOptions = {
  contentType: string;
  targetAudience: string;
  readerDesire: string;
  painPoint: string;
  brandVoice: string;
  ctaGoal: string;
  visualMood: string;
  imageStyle: string;
  colorPalette: string;
  extraInstructions: string;
  imageModel: "fast" | "pro";
  imageScope: "off" | "hero" | "all";
  imageReliability: "persistent" | "balanced" | "fast";
};

export type ContentTypePreset = {
  id: string;
  label: string;
  description: string;
  options: Pick<
    CardnewsOptions,
    "contentType" | "targetAudience" | "readerDesire" | "painPoint" | "brandVoice" | "ctaGoal" | "visualMood" | "imageStyle" | "colorPalette" | "extraInstructions"
  >;
  promptRules: string[];
  visualKeywords: string[];
};

export type FactoryProject = {
  topic: string;
  sourceType: "mock" | "openai" | "gemini";
  options: CardnewsOptions;
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
    imagePrompt?: string;
    imageDataUrl?: string;
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

export const defaultOptions: CardnewsOptions = {
  contentType: "실무 가이드형",
  targetAudience: "혼자 콘텐츠를 만들지만 저장과 공유가 잘 나오지 않아 고민하는 1인 창업가, 지식 크리에이터, 퍼스널 브랜더",
  readerDesire: "내 전문성을 짧고 강한 카드뉴스로 보여주고 저장, 공유, DM으로 이어지는 콘텐츠를 만들고 싶다.",
  painPoint: "정보는 많은데 첫 장 후킹, 흐름, CTA, 비주얼 톤을 어떻게 잡아야 할지 막힌다.",
  brandVoice: "날카롭지만 친절한 실무자 톤. 과장 없이 바로 써먹을 수 있게.",
  ctaGoal: "저장 후 다음 기획 때 다시 보게 만들고, 댓글에 주제 1개를 남기게 유도",
  visualMood: "프리미엄 에디토리얼, 따뜻한 종이 질감, 차분하지만 선명한 대비",
  imageStyle: "인물 없는 오브젝트 중심의 실사풍 배경, 텍스트가 올라갈 여백 확보",
  colorPalette: "오프화이트, 차콜, 코랄, 딥그린 포인트",
  extraInstructions: "한 슬라이드에는 한 가지 메시지만. 첫 장에서 답을 다 말하지 말고 넘기고 싶게 만든다.",
  imageModel: "pro",
  imageScope: "all",
  imageReliability: "persistent"
};

export const contentTypePresets: ContentTypePreset[] = [
  {
    id: "practical-guide",
    label: "실무 가이드형",
    description: "바로 따라 할 단계, 기준, 템플릿을 제공해 저장을 유도합니다.",
    options: {
      contentType: "실무 가이드형",
      targetAudience: "혼자 콘텐츠를 만들지만 저장과 공유가 잘 나오지 않아 고민하는 1인 창업가, 지식 크리에이터, 퍼스널 브랜더",
      readerDesire: "지금 바로 적용할 수 있는 카드뉴스 설계법을 얻고 싶다.",
      painPoint: "좋은 주제는 있는데 첫 장, 흐름, CTA를 매번 새로 고민한다.",
      brandVoice: "명확하고 실무적인 한국어. 과장 없이 바로 써먹을 수 있게.",
      ctaGoal: "저장 후 다음 기획 때 다시 보게 만들고, 댓글에 적용할 주제 1개를 남기게 유도",
      visualMood: "프리미엄 에디토리얼, 따뜻한 종이 질감, 차분하지만 선명한 대비",
      imageStyle: "인물 없는 오브젝트 중심의 실사풍 배경, 텍스트가 올라갈 여백 확보",
      colorPalette: "오프화이트, 차콜, 코랄, 딥그린 포인트",
      extraInstructions: "체크리스트, 순서, 판단 기준을 반드시 포함한다. 한 슬라이드에는 한 가지 실행 포인트만 담는다."
    },
    promptRules: ["단계별 실행 흐름을 만든다", "Slide 6 또는 7에 저장용 체크리스트를 넣는다", "모호한 조언 대신 판단 기준을 쓴다"],
    visualKeywords: ["editorial desk", "paper guide", "checklist", "premium workbook"]
  },
  {
    id: "problem-solving",
    label: "문제 해결형",
    description: "독자의 막힘을 선명하게 진단하고 원인과 해결책을 제시합니다.",
    options: {
      contentType: "문제 해결형",
      targetAudience: "계속 시도하지만 결과가 안 나오는 이유를 찾고 싶은 실무자와 크리에이터",
      readerDesire: "내가 어디서 막히는지 알고, 바로 고칠 수 있는 해결책을 원한다.",
      painPoint: "열심히 만들지만 저장, 공유, 문의로 이어지지 않는 이유를 모른다.",
      brandVoice: "문제를 정확히 짚되 공격적이지 않은 코치 톤.",
      ctaGoal: "자신의 막힌 지점을 댓글로 남기게 유도",
      visualMood: "문제와 해결이 대비되는 명료한 구성, 선명한 포인트 컬러",
      imageStyle: "Before/After 구도가 느껴지는 추상적 실사 배경, 명확한 여백",
      colorPalette: "오프화이트, 차콜, 블루그레이, 코랄 포인트",
      extraInstructions: "Slide 3에서 핵심 갈등을 강하게 만들고, Slide 5에서 관점 전환을 선명하게 보여준다."
    },
    promptRules: ["증상을 먼저 말하고 원인을 뒤에 밝힌다", "독자가 자기 문제라고 느낄 문장을 쓴다", "해결책은 하나의 우선순위로 좁힌다"],
    visualKeywords: ["diagnosis", "before after", "clear path", "problem solving"]
  },
  {
    id: "point-of-view",
    label: "관점 제안형",
    description: "익숙한 믿음을 뒤집어 저장보다 공유와 토론을 유도합니다.",
    options: {
      contentType: "관점 제안형",
      targetAudience: "남들과 비슷한 정보보다 자신만의 해석과 세계관을 만들고 싶은 퍼스널 브랜더",
      readerDesire: "내 생각을 더 선명하게 만들고, 공유하고 싶은 관점을 얻고 싶다.",
      painPoint: "정보는 많지만 내 콘텐츠만의 주장과 색깔이 약하다.",
      brandVoice: "대담하지만 근거 있는 에디토리얼 톤.",
      ctaGoal: "동의/반대 의견을 구체적으로 댓글에 남기게 유도",
      visualMood: "브랜드 매거진, 고급 라이프스타일, 여백이 큰 구성",
      imageStyle: "상징적 오브젝트와 강한 구도, 텍스트 없는 매거진 커버형 배경",
      colorPalette: "아이보리, 먹색, 딥레드, 올리브 포인트",
      extraInstructions: "첫 장은 대담한 주장으로 시작하고, Slide 4에서 독자가 몰랐던 진짜 이유를 제시한다."
    },
    promptRules: ["상식에 반대하거나 재정의하는 문장으로 시작한다", "근거 없는 선동이 아니라 해석의 이유를 준다", "댓글 질문은 찬반이 갈리게 구체화한다"],
    visualKeywords: ["editorial manifesto", "bold composition", "symbolic object", "magazine cover"]
  },
  {
    id: "checklist",
    label: "체크리스트형",
    description: "나중에 다시 보게 만드는 기준표, 질문, 점검표 중심입니다.",
    options: {
      contentType: "체크리스트형",
      targetAudience: "콘텐츠를 만들기 전 빠르게 점검할 기준이 필요한 마케터와 창업가",
      readerDesire: "실수하지 않도록 저장해두고 반복해서 볼 기준표가 필요하다.",
      painPoint: "매번 감으로 판단해서 결과물 품질이 흔들린다.",
      brandVoice: "간결하고 정리된 운영 매뉴얼 톤.",
      ctaGoal: "저장 후 다음 작업 전 체크하게 만들기",
      visualMood: "교육 워크북, 손으로 정리한 노트, 실용적인 체크리스트",
      imageStyle: "정리된 종이, 플래너, 체크박스가 연상되는 깔끔한 배경",
      colorPalette: "오프화이트, 차콜, 세이지그린, 옐로 포인트",
      extraInstructions: "Slide 4~7은 질문, 기준, 체크 항목 위주로 구성한다. 각 항목은 짧고 명확해야 한다."
    },
    promptRules: ["각 슬라이드 제목은 체크 질문처럼 쓴다", "Slide 7은 저장용 최종 체크리스트로 만든다", "추상어보다 확인 가능한 기준을 쓴다"],
    visualKeywords: ["checklist sheet", "planner", "organized desk", "reference card"]
  },
  {
    id: "sales-conversion",
    label: "세일즈 전환형",
    description: "공감에서 신뢰, 행동으로 이어지는 DM/문의 전환 구조입니다.",
    options: {
      contentType: "세일즈 전환형",
      targetAudience: "관심은 있지만 아직 구매나 문의로 움직이지 않는 잠재 고객",
      readerDesire: "내 상황에 맞는 해결책인지 판단하고 부담 없이 다음 행동을 하고 싶다.",
      painPoint: "좋다는 건 알지만 지금 문의해야 할 이유가 선명하지 않다.",
      brandVoice: "압박 없이 신뢰를 쌓는 컨설턴트 톤.",
      ctaGoal: "댓글보다 DM, 상담, 무료 자료 요청으로 전환",
      visualMood: "강한 주장형 포스터, 높은 대비, 대담한 오브젝트",
      imageStyle: "프리미엄 서비스 제안서 느낌의 추상 배경, 고급스럽고 신뢰감 있는 구성",
      colorPalette: "차콜, 크림, 딥그린, 코랄 포인트",
      extraInstructions: "불안 조장보다 선택 기준을 제공한다. Slide 8 CTA는 구체적인 DM 문구 하나로 끝낸다."
    },
    promptRules: ["독자의 현재 상황을 인정한 뒤 선택 기준을 제시한다", "Proof 슬라이드에는 비교, 사례, 신뢰 근거를 넣는다", "CTA는 부담 낮은 DM 문구로 구체화한다"],
    visualKeywords: ["premium proposal", "trust signal", "consulting deck", "conversion"]
  }
];

export function findContentTypePreset(contentType: string) {
  return contentTypePresets.find((preset) => preset.options.contentType === contentType || preset.label === contentType) || contentTypePresets[0];
}

export function normalizeTopic(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeOptions(options?: Partial<CardnewsOptions>): CardnewsOptions {
  return {
    ...defaultOptions,
    ...Object.fromEntries(Object.entries(options || {}).filter(([, value]) => value !== undefined && value !== ""))
  };
}

export function imageModelName(choice: CardnewsOptions["imageModel"]) {
  return choice === "pro" ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";
}

export function createMockProject(
  topicInput: string,
  source = "",
  warning = "mock mode",
  optionInput?: Partial<CardnewsOptions>
): FactoryProject {
  const topic = normalizeTopic(topicInput || inferTopic(source) || "새 카드뉴스");
  const options = normalizeOptions(optionInput);
  const persona = options.targetAudience;
  const desire = options.readerDesire;
  const pain = options.painPoint;

  const brief = {
    targetPersona: persona,
    readerDesire: desire,
    readerProblem: pain,
    contentAngle: `${topic}을 단순 정보가 아니라 독자가 지금 겪는 막힘을 해결하는 ${options.contentType} 콘텐츠로 재구성한다.`,
    coreMessage: "좋은 카드뉴스는 예쁜 요약이 아니라 독자의 욕망, 문제, 행동을 한 흐름으로 연결하는 설계다.",
    ctaStrategy: options.ctaGoal
  };

  const slides: FactoryProject["slides"] = [
    {
      slideNumber: 1,
      role: "Hook",
      headline: `${topic}, 첫 장에서 갈립니다`,
      body: "사람들은 좋은 정보를 기다리지 않습니다.\n자기 이야기라고 느낄 때만 다음 장을 넘깁니다.",
      visualDirection: "큰 제목, 넓은 여백, 강한 대비",
      imagePrompt: visualPrompt(topic, options, "bold opening hook, premium editorial cover, dramatic but clean"),
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
      imagePrompt: visualPrompt(topic, options, "information overload versus clear signal, refined workspace"),
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
      imagePrompt: visualPrompt(topic, options, "split scene, messy notes versus clear audience desire map"),
      openLoop: "무엇을 먼저 설계해야 하는지 연결한다.",
      saveOrShareTrigger: "실패 원인 진단",
      hasCta: false,
      approved: false
    },
    {
      slideNumber: 4,
      role: "Insight",
      headline: "먼저 PDA를 잡으세요",
      body: "Persona: 누구에게 말하는가\nDesire: 무엇을 원하는가\nAwareness: 문제를 얼마나 아는가",
      visualDirection: "PDA 3분할 프레임워크",
      imagePrompt: visualPrompt(topic, options, "three part persona desire awareness framework, premium diagram background"),
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
      imagePrompt: visualPrompt(topic, options, "perspective shift, before after transformation, insight moment"),
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
      visualDirection: "체크리스트와 기준표",
      imagePrompt: visualPrompt(topic, options, "saveable checklist, tactile paper system, useful reference card"),
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
      imagePrompt: visualPrompt(topic, options, "minimal checklist template, bookmark gesture, premium reference card"),
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
      visualDirection: "댓글 입력과 커뮤니티 반응",
      imagePrompt: visualPrompt(topic, options, "community comments, creator conversation, clear call to action"),
      openLoop: "댓글, DM, 다음 콘텐츠로 연결",
      saveOrShareTrigger: "구체적인 댓글 CTA",
      hasCta: true,
      approved: false
    }
  ];

  return {
    topic,
    sourceType: "mock",
    options,
    brief,
    slides,
    caption: {
      seoFirstSentence: `${topic}을 카드뉴스로 만들 때 가장 먼저 볼 것은 첫 장의 후킹입니다.`,
      body:
        `${brief.contentAngle}\n\n` +
        "정보를 줄이는 것보다 중요한 건 독자가 저장하고 싶은 기준을 주는 것입니다. 오늘 만든 8장 구조를 다음 기획의 체크리스트로 써보세요.",
      saveCta: "저장해두고 다음 카드뉴스 기획 전에 다시 확인하세요.",
      shareCta: "이 주제로 고민하는 동료나 친구에게 보내주세요.",
      commentCta: "댓글에 지금 만들고 싶은 카드뉴스 주제 1개를 남겨주세요.",
      hashtags: buildHashtags(topic)
    },
    reviewChecklist: [
      { name: "1번 슬라이드 후킹", passed: true, note: "문제, 호기심, 대담한 주장 중 하나로 시작" },
      { name: "한 슬라이드 한 포인트", passed: true, note: "각 슬라이드가 하나의 메시지만 전달" },
      { name: "열린 고리", passed: true, note: "다음 장을 보게 만드는 연결 문맥 포함" },
      { name: "저장 트리거", passed: true, note: "체크리스트, 템플릿, 기준 포함" },
      { name: "공유 트리거", passed: true, note: "동료에게 보내고 싶은 공감 포인트 포함" },
      { name: "CTA 2개", passed: true, note: "Soft CTA와 Hard CTA 포함" },
      { name: "캡션 SEO", passed: true, note: "첫 문장에 주제 키워드 포함" },
      { name: "해시태그", passed: true, note: "5~12개 범위 유지" }
    ],
    warnings: warning ? [warning] : []
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
    `- CTA: ${project.brief.ctaStrategy}`,
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
      `- Image prompt: ${slide.imagePrompt || ""}`,
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

function visualPrompt(topic: string, options: CardnewsOptions, direction: string) {
  const preset = findContentTypePreset(options.contentType);
  return [
    "Create a square 1:1 premium Instagram carousel background for Korean cardnews.",
    `Topic: ${topic}.`,
    `Content type: ${options.contentType}. Audience: ${options.targetAudience}.`,
    `Scene direction: ${direction}.`,
    `Category visual keywords: ${preset.visualKeywords.join(", ")}.`,
    `Mood: ${options.visualMood}. Image style: ${options.imageStyle}.`,
    `Color palette: ${options.colorPalette}.`,
    "No readable text, no letters, no numbers, no logos, no watermark.",
    "Leave generous clean negative space for large Korean headline overlay.",
    "Commercial editorial quality, crisp composition, not stock-photo-like."
  ].join(" ");
}
