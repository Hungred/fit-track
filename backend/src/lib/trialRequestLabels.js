export const CONTACT_TIME_LABELS = {
  morning: '上午（09:00-12:00）',
  afternoon: '下午（12:00-18:00）',
  evening: '晚上（18:00-21:00）',
  anytime: '隨時皆可（文字訊息聯絡即可）',
}

export const COACH_GENDER_LABELS = {
  female: '女教練',
  male: '男教練',
  either: '皆可 / 依時間安排為主',
}

export const TRIAL_TIME_LABELS = {
  weekday_day: '平日白天',
  weekday_night: '平日晚上',
  weekend_day: '假日白天',
  weekend_night: '假日晚上',
  other: '其他特殊指定時間',
}

export function formatSlots(keys, labelMap) {
  return (keys || []).map(k => labelMap[k] || k).join('、')
}
