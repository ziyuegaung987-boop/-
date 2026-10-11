// Thirty short, replayable missions. Each world keeps its own scenery and flight ability.
const chapters = [
  [
    ['第一封信',1,370,.72,.65,'calm','先学会拍翅，收下一封来信。'],
    ['桥边的风',2,400,.78,.85,'calm','沿小桥追上两封来信。'],
    ['金色邮戳',2,420,.85,.9,'golden','金色来信会算作两份心意。'],
    ['屋檐之间',3,440,.92,1,'moving','移动的风筝和俯冲的影隼，需要提前躲开。'],
    ['雨后晴川',3,460,.88,1.1,'shield','拾起羽毛，守住一次碰撞。'],
    ['三连顺风',3,480,1,1,'combo','连续收信，借顺风冲刺。'],
    ['河湾逆风',4,500,1.02,1.25,'crosswind','阵风会改变飞行的节奏。'],
    ['追逐晚霞',4,520,1.08,1.15,'moving','抓住晚霞里的来信，避开影隼的追击。'],
    ['双风筝',4,550,1.15,1.25,'double','交错的风筝考验你的路线。'],
    ['送达云间',5,580,1.22,1.28,'finale','完成江南最后一次送信，开启山海。'],
  ],
  [
    ['折一只纸鹤',2,390,.80,.85,'updraft','纸鹤起飞，试着穿过青色气流。'],
    ['风铃初响',2,410,.87,.9,'updraft','收集风铃，听见山谷的回声。'],
    ['云海升力',3,430,.91,1,'updraft','上升气流会托起纸鹤。'],
    ['雷云来访',3,450,.96,1.06,'moving','会漂移的雷云挡在前方。'],
    ['晚霞回旋',3,470,1.01,1.14,'crosswind','风向往复变化，保持高度。'],
    ['青岚三连',4,490,1.05,1.16,'combo','连续收铃，乘风滑翔。'],
    ['听泉之上',4,510,1.1,1.18,'updraft','在雷云间借气流向上穿行。'],
    ['山口疾风',4,530,1.16,1.3,'crosswind','山口的风变快了。'],
    ['峰回双云',5,550,1.18,1.26,'double','两团雷云交错，观察空隙。'],
    ['云海回响',5,580,1.24,1.32,'finale','唤醒最后一串风铃，去追星光。'],
  ],
  [
    ['第一盏萤灯',2,400,.82,.86,'shield','夜色里，收下第一簇星光。'],
    ['渡月微光',2,420,.87,.94,'shield','蓝色星核能挡住一颗流星。'],
    ['萤溪星群',3,440,.92,1.03,'golden','金色星光更明亮。'],
    ['流星掠过',3,460,.98,1.1,'moving','流星斜掠，跟着它的节奏躲闪。'],
    ['星桥连线',3,480,1.02,1.16,'combo','三连星光点亮额外护盾。'],
    ['夜风回声',4,500,1.07,1.25,'crosswind','夜风像呼吸一样反复。'],
    ['银河碎光',4,520,1.1,1.18,'golden','收起散落的亮星。'],
    ['双星划夜',4,540,1.17,1.24,'double','交错流星之间有安全的路径。'],
    ['黎明之前',5,560,1.2,1.3,'shield','守护萤灯，别让光熄灭。'],
    ['点亮星驿',5,600,1.25,1.34,'finale','把最后的星光送到星驿。'],
  ],
];

const scenes = [
  ['柳岸晨雾','桥影微风','金光水巷','檐下纸鸢','雨后青瓦','桃枝晴日','河湾轻浪','霞染渡口','双鸢归桥','云间长风'],
  ['青岚初醒','松间风铃','云海天阶','雷云山口','晚霞回旋','薄暮青岚','泉声入云','疾风峡谷','双峰云隙','云海回响'],
  ['萤火初亮','月下渡口','萤溪星群','流星夜航','星桥微光','夜风回声','银河碎光','双星划夜','黎明前夜','星驿天明'],
];
const skies = [
  ['morning','mist','gold','clear','rain','blossom','wind','sunset','wind','sunset'],
  ['mist','clear','mist','storm','sunset','clear','mist','wind','storm','gold'],
  ['dusk','moon','sparkle','meteor','moon','wind','sparkle','meteor','dusk','dawn'],
];
// A level's visual landmark, visible challenge, and collectible flight line are authored together.
const features = [
  ['轻拍试飞','桥拱来信','金色双倍','移动风筝','羽毛护盾','三连冲刺','河湾阵风','霞光追逐','双风筝','云门终点'],
  ['上升气流','风铃连线','云海升力','漂移雷云','回旋阵风','三连滑翔','泉上升力','峡谷疾风','双雷云','山海终章'],
  ['星核护盾','月下护盾','金色星光','斜掠流星','三连点盾','夜风回声','碎光双倍','双流星','星核守护','星驿终章'],
];
const flightLines = [
  [[0,0,0],[-.04,-.01,.04],[.03,0,-.03],[0,.06,-.04],[-.05,.02,.05],[.05,0,-.05],[.04,-.04,.03],[-.03,.04,-.02],[.06,-.02,-.06],[-.04,0,.04]],
  [[0,-.03,.03],[-.05,0,.05],[.04,-.02,.04],[.05,0,-.05],[-.03,.04,-.03],[.04,-.04,.04],[.05,.02,-.05],[-.05,.04,0],[.06,-.04,.06],[-.04,.05,-.04]],
  [[-.02,.03,-.02],[.05,0,-.05],[-.05,.02,.05],[.04,-.04,0],[-.04,.05,-.04],[.06,-.02,.03],[.03,-.05,.03],[-.05,.05,-.05],[.04,0,-.04],[-.05,.03,.05]],
];

export const LEVELS = chapters.flatMap((chapter, worldIndex) => chapter.map(([name, goal, distance, danger, wind, special, story], index) => ({
  id: worldIndex * 10 + index + 1,
  world: worldIndex + 1,
  number: index + 1,
  name, goal, distance, danger, wind, special, story,
  scene: scenes[worldIndex][index], sky: skies[worldIndex][index],
  feature: features[worldIndex][index], flightLine: flightLines[worldIndex][index],
})));
export const TOTAL_LEVELS = LEVELS.length;
export function starsFor(level, collected, hearts) {
  if (collected < level.goal || hearts <= 0) return 0;
  return 1 + Number(collected >= level.goal + 2) + Number(collected >= level.goal + 3 && hearts >= 2);
}
