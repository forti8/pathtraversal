const PUBLIC_ROOT = "/revisao-online/public";

const FILES = {
  "/revisao-online/public/index.html": "Revisão Online\n\nPortal de documentos da equipe.",
  "/revisao-online/public/ajuda.txt": "Ajuda\n\nO portal abre arquivos usando o parâmetro file.",
  "/revisao-online/public/pistas.txt": "Os arquivos públicos ficam em /revisao-online/public.\nConfira o código de download para entender como o caminho é montado.",
  "/revisao-online/public/guia.txt": "Ponto de partida\n\nOs arquivos compartilhados ficam um nível acima, na pasta arquivos.\nLeia ../arquivos/orientacao.txt para continuar.",
  "/revisao-online/arquivos/leia-me.txt": "Arquivo compartilhado\n\nO controlador está em ../app/controllers/download.php.\nLeia o código e depois confira ../app/config/arquivos.php.",
  "/revisao-online/arquivos/orientacao.txt": "Próxima etapa\n\nConfira ../app/controllers/download.php para entender como o caminho é montado.\nA configuração está em ../app/config/arquivos.php; leia também ../app/config/LEIA-ME.txt.",
  "/revisao-online/app/controllers/download.php": "<?php\n// Código fictício exibido como texto; nunca é executado.\n$base = '/revisao-online/public';\n$file = $_GET['file'] ?? 'index.html';\n$path = $base . '/' . $file;\n\n// A entrada é concatenada sem conferir se saiu da pasta public.\nreturn file_get_contents($path);\n?>",
  "/revisao-online/app/config/arquivos.php": "<?php\n// Configuração fictícia exibida como texto.\n$publicDir = '/revisao-online/public';\n$reviewDir = '/revisao-online/storage/reviews';\n$finalDocument = 'resultado-final.txt';\n?>",
  "/revisao-online/app/config/LEIA-ME.txt": "Documentos de revisão\n\nA configuração aponta para ../storage/reviews.\nLeia indice.txt nessa pasta para encontrar o documento final.",
  "/revisao-online/storage/reviews/indice.txt": "Índice de revisões\n\nO documento final é resultado-final.txt.\nA pasta fica ao lado de public, não dentro dela.",
  "/revisao-online/storage/reviews/resultado-final.txt": "Parabéns! A frase secreta é: busssssssssss",
  "/revisao-online/storage/reviews/credenciais.txt": "ISCA DE TREINAMENTO\n\nSENHA=EXEMPLO_NAO_REAL\n\nValor fictício, não é uma credencial.",
  "/revisao-online/storage/backup/nota.txt": "Backup fictício do portal de revisão.",
  "/revisao-online/storage/backup/token.txt": "ISCA DE TREINAMENTO\n\nTOKEN=FAKE-DEMO-0000\n\nIsto não é um token real.",
  "/revisao-online/logs/access.log": "[09:10] GET /index.html\n[09:12] GET /download?file=ajuda.txt\n[09:15] Log fictício da aplicação."
};

const PUBLIC_FILES = [
  "index.html",
  "ajuda.txt",
  "pistas.txt",
  "guia.txt"
];

const HONEYPOT_PATHS = new Set([
  "/revisao-online/storage/reviews/credenciais.txt",
  "/revisao-online/storage/backup/token.txt"
]);

const demo = document.querySelector("#presentation");

if (demo) {
  const demoBase = "/var/www/app/public";
  const demoFiles = {
    "/var/www/app/public/bem-vindo.txt": "Documento público de exemplo.",
    "/var/www/app/.env": "APP_ENV=demo\nDB_PASSWORD=senha-ficticia\n\nArquivo de demonstração, sem credenciais reais."
  };
  const stages = [
    {
      title: "1. Sem proteção",
      description: "O sistema junta o nome recebido com a pasta pública e abre o resultado sem validar o caminho.",
      code: "$base = '/var/www/app/public';\n$file = $_GET['file'];\nreadfile($base . '/' . $file);",
      example: "../.env",
      mode: "unprotected"
    },
    {
      title: "2. Sanitização incorreta",
      description: "O parâmetro é decodificado uma vez pela aplicação web. O filtro remove ../, mas uma segunda decodificação acontece depois e reintroduz o caminho.",
      code: "$file = $_GET['file']; // primeira decodificação\n$file = str_replace('../', '', $file);\n$file = urldecode($file); // tarde demais\nreadfile($base . '/' . $file);",
      example: "%252e%252e%252f.env",
      mode: "weak-filter"
    },
    {
      title: "3. Caminho protegido",
      description: "Resolva o caminho canônico e confirme que ele continua dentro da pasta permitida antes de abrir o arquivo.",
      code: "$root = realpath('/var/www/app/public');\n$path = realpath($root . DIRECTORY_SEPARATOR . $file);\n\nif ($path === false ||\n    !str_starts_with($path, $root . DIRECTORY_SEPARATOR)) {\n    http_response_code(403);\n    exit;\n}\n\nreadfile($path);",
      example: "../.env",
      mode: "protected"
    }
  ];

  const stageTitle = document.querySelector("#stage-title");
  const stageDescription = document.querySelector("#stage-description");
  const stageCode = document.querySelector("#stage-code");
  const stageCount = document.querySelector("#step-count");
  const progressValue = document.querySelector("#progress-value");
  const demoForm = document.querySelector("#demo-form");
  const demoPath = document.querySelector("#demo-path");
  const demoTrace = document.querySelector("#demo-trace");
  const demoResponse = document.querySelector("#demo-response");
  const previousButton = document.querySelector("#previous-stage");
  const nextButton = document.querySelector("#next-stage");
  let currentStage = 0;

  function normalizePath(path) {
    const parts = [];

    for (const part of path.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") {
        parts.pop();
      } else {
        parts.push(part);
      }
    }

    return `/${parts.join("/")}`;
  }

  function showResult() {
    const stage = stages[currentStage];
    const rawInput = demoPath.value.trim();
    let appInput = rawInput;

    try {
      appInput = decodeURIComponent(rawInput);
      if (stage.mode === "weak-filter") {
        appInput = appInput.replaceAll("../", "");
        appInput = decodeURIComponent(appInput);
      }
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
      demoTrace.textContent = "Entrada com codificação inválida.";
      demoResponse.textContent = "400 Bad Request";
      return;
    }

    const resolvedPath = normalizePath(`${demoBase}/${appInput}`);
    const isInsidePublic = resolvedPath.startsWith(`${demoBase}/`);

    if (stage.mode === "protected" && !isInsidePublic) {
      demoTrace.textContent = `Caminho resolvido fora da pasta permitida: ${resolvedPath}`;
      demoResponse.textContent = "403 Forbidden\nAcesso bloqueado pela validação do caminho.";
      return;
    }

    if (Object.hasOwn(demoFiles, resolvedPath)) {
      const leaked = !isInsidePublic;
      demoTrace.textContent = `Caminho resolvido: ${resolvedPath}`;
      demoResponse.textContent = `${leaked ? "200 OK — arquivo fora da pasta pública" : "200 OK"}\n\n${demoFiles[resolvedPath]}`;
      return;
    }

    demoTrace.textContent = `Caminho resolvido: ${resolvedPath}`;
    demoResponse.textContent = "404 Not Found";
  }

  function showStage() {
    const stage = stages[currentStage];
    stageTitle.textContent = stage.title;
    stageDescription.textContent = stage.description;
    stageCode.textContent = stage.code;
    stageCount.textContent = `Etapa ${currentStage + 1} de ${stages.length}`;
    progressValue.style.width = `${((currentStage + 1) / stages.length) * 100}%`;
    demoPath.value = stage.example;
    previousButton.disabled = currentStage === 0;
    nextButton.textContent = currentStage === stages.length - 1 ? "Recomeçar" : "Continuar";
    showResult();
  }

  demoForm.addEventListener("submit", event => {
    event.preventDefault();
    showResult();
  });

  previousButton.addEventListener("click", () => {
    if (currentStage === 0) return;
    currentStage -= 1;
    showStage();
  });

  nextButton.addEventListener("click", () => {
    currentStage = currentStage === stages.length - 1 ? 0 : currentStage + 1;
    showStage();
  });

  showStage();
}

const form = document.querySelector("#path-form");

if (form) {
  const pathInput = document.querySelector("#file-path");
  const locationLabel = document.querySelector("#location");
  const fileList = document.querySelector("#file-list");
  const fileContent = document.querySelector("#file-content");
  const status = document.querySelector("#status");
  const commandHistory = document.querySelector("#command-history");
  const commands = [];

  function normalizePath(path) {
    const parts = [];

    for (const part of path.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") {
        parts.pop();
      } else {
        parts.push(part);
      }
    }

    return `/${parts.join("/")}`;
  }

  function showPublicFiles() {
    fileList.replaceChildren();

    for (const filename of PUBLIC_FILES) {
      const button = document.createElement("button");
      button.className = "file-entry";
      button.type = "button";

      const icon = document.createElement("span");
      icon.className = "entry-kind";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "📄";

      const name = document.createElement("span");
      name.textContent = filename;

      button.append(icon, name);
      button.addEventListener("click", () => {
        pathInput.value = filename;
        runRequest(filename);
      });
      fileList.append(button);
    }
  }

  function runRequest(path) {
    const requestedPath = path.trim();
    let decodedPath;

    try {
      decodedPath = decodeURIComponent(requestedPath);
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
      status.textContent = "400 Bad Request — caminho codificado inválido.";
      fileContent.textContent = "";
      return;
    }

    const resolvedPath = normalizePath(`${PUBLIC_ROOT}/${decodedPath}`);
    const escapedPublicRoot = !resolvedPath.startsWith(`${PUBLIC_ROOT}/`);
    const urlPath = encodeURI(requestedPath);
    commands.push(`GET https://revisao-online.interno.test/download?file=${urlPath}`);
    commandHistory.replaceChildren();

    for (const command of commands.slice(-20)) {
      const item = document.createElement("li");
      item.textContent = command;
      commandHistory.append(item);
    }

    if (Object.hasOwn(FILES, resolvedPath)) {
      fileContent.textContent = FILES[resolvedPath];
      locationLabel.textContent = `Caminho resolvido: ${resolvedPath}`;
      if (HONEYPOT_PATHS.has(resolvedPath)) {
        status.textContent = "Arquivo-isca da simulação. Nenhum acesso externo foi registrado.";
      } else if (resolvedPath.endsWith(".php")) {
        status.textContent = `200 OK — código PHP fictício exibido como texto${escapedPublicRoot ? " fora da pasta public" : ""}.`;
      } else {
        status.textContent = `200 OK${escapedPublicRoot ? " — path traversal: o caminho saiu de public" : " — arquivo público"}.`;
      }
      return;
    }

    fileContent.textContent = "";
    locationLabel.textContent = `Caminho resolvido: ${resolvedPath}`;
    status.textContent = `404 Not Found — arquivo não encontrado${escapedPublicRoot ? " (o caminho saiu de public)" : ""}.`;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    runRequest(pathInput.value);
  });

  locationLabel.textContent = `Diretório permitido: ${PUBLIC_ROOT}`;
  showPublicFiles();
  runRequest(pathInput.value);
}
