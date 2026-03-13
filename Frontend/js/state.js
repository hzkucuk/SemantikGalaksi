/** SemantikGalaksi — Paylaşılan Durum Değişkenleri */

// Uygulama versiyonu (tek kaynak: VERSION dosyası → build sırasında buraya yansır)
var APP_VERSION = '0.39.3';

// Three.js sahne nesneleri
var scene, camera, renderer, composer, ayahMesh, lineSegments, controls, highlightLines, skyMesh;
var bloomPass = null;

// Performans modu
var perfMode = localStorage.getItem('sgx_perf') || 'auto';
var _labelFrame = 0;

// İstatistik verileri
var sceneStats = {
    surahCount: 0, ayahCount: 0,
    uniqueRoots: 0, connectedRoots: 0,
    lineSegmentCount: 0, totalNodes: 0,
    layout: '', fps: 0
};

// Veri yapıları
var nodes = [];
var surahGroups = [];
var ayahNodes = [];
var rootMap = new Map();
var labelSprites = [];
var lineNodePairs = [];
var originalData = null;
var hasCustomData = false;
var currentLayout = 'galaxy';
var rootDictionary = {};

// Etkileşim durumu
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var currentAudio = null;
var audioCache = new Map();
var hoverTimeout = null;
var lastHoveredId = null;
var hudTooltipPinned = false;

// Warp durumu
var warpActive = false;
var warpProgress = 0;
var warpStart = new THREE.Vector3();
var warpEnd = new THREE.Vector3();
var warpTarget = new THREE.Vector3();
var warpMesh = null;
var warpBg = null;
var warpSpeed = 1;
var warpDrift = false;
var warpDriftTime = 0;
var warpDriftDir = new THREE.Vector3();
var warpPhase = 0;
var warpShakeX = 0;
var warpShakeY = 0;

// Cosmos atmosfer nesneleri
var nebulaMeshes = [];
var spaceDust = null;
var cosmicDustLanes = [];

// Ses durumu
var isAudioLoading = false;
var apiKey = null;

// Kimlik doğrulama durumu
var authToken = localStorage.getItem('sgx_auth_token') || '';
var authUser = '', authRole = '', isDesktopMode = false;
var currentUser = localStorage.getItem('sgx_username') || '';

// Veri seti durumu
var activeDatasetName = 'quran_data.json';

// HUD durumu
var currentHudNode = null;
var activeSpeakBtn = null;

// Animasyon durumu
var _lastFrameTime = 0;

// Yükleme ekranı durumu
var _loadStart = Date.now();
var _besmelePlaying = false;
var _besmeleMinTime = 3000;
var _dataReady = false;
var _autoplayBlocked = false;
var introWarp = false;
var introWarpTime = 0;

// WebSocket durumu
var _ws = null, _wsReconnectTimer = null, _onlineUsers = [];

// Not sistemi durumu
var _notes = [];
var _activeNoteId = null;
var _noteSaveTimer = null;
