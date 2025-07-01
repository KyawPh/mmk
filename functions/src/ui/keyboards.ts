import { InlineKeyboardMarkup, ReplyKeyboardMarkup } from '../utils/telegram';

// Main menu keyboard for quick actions
export const mainMenuKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      { text: '💱 Current Rates', callback_data: 'cmd:rates' },
      { text: '📈 History', callback_data: 'cmd:history' },
    ],
    [
      { text: '🔔 Alerts', callback_data: 'cmd:alert' },
      { text: '📬 Subscribe', callback_data: 'cmd:subscribe' },
    ],
    [
      { text: '🔮 Predict', callback_data: 'cmd:predict' },
      { text: '📊 Compare', callback_data: 'cmd:compare' },
    ],
    [
      { text: '⚙️ Settings', callback_data: 'cmd:settings' },
      { text: '❓ Help', callback_data: 'cmd:help' },
    ],
  ],
});

// Reply keyboard for persistent quick access
export const quickAccessKeyboard = (): ReplyKeyboardMarkup => ({
  keyboard: [
    ['💱 Rates', '📈 History'],
    ['🔔 Set Alert', '📊 Compare'],
    ['⚙️ Settings', '❓ Help'],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  selective: false,
});

// Currency selector keyboard
export const currencyKeyboard = (
  selectedCurrency?: string,
  prefix: string = 'currency'
): InlineKeyboardMarkup => {
  const currencies = ['USD', 'EUR', 'SGD', 'THB', 'CNY', 'GBP', 'JPY', 'AUD'];
  const rows = [];

  // Create 2x4 grid
  for (let i = 0; i < currencies.length; i += 2) {
    const row = [];
    for (let j = 0; j < 2 && i + j < currencies.length; j++) {
      const currency = currencies[i + j];
      if (!currency) {
        continue;
      }
      const isSelected = currency === selectedCurrency;
      row.push({
        text: `${isSelected ? '✅ ' : ''}${getCurrencyFlag(currency)} ${currency}`,
        callback_data: `${prefix}:${currency}`,
      });
    }
    rows.push(row);
  }

  // Add all currencies option
  rows.push([{ text: '🌍 All Currencies', callback_data: `${prefix}:ALL` }]);

  // Add back button
  rows.push([{ text: '« Back', callback_data: 'cmd:back' }]);

  return { inline_keyboard: rows };
};

// Source selector keyboard
export const sourceKeyboard = (
  selectedSource?: string,
  prefix: string = 'source'
): InlineKeyboardMarkup => {
  const sources = [
    { name: 'CBM', emoji: '🏛️', desc: 'Central Bank' },
    { name: 'KBZ', emoji: '🏦', desc: 'KBZ Bank' },
    { name: 'AYA', emoji: '🏦', desc: 'AYA Bank' },
    { name: 'Yoma', emoji: '🏦', desc: 'Yoma Bank' },
    { name: 'CB Bank', emoji: '🏦', desc: 'CB Bank' },
    { name: 'Binance P2P', emoji: '💹', desc: 'Crypto P2P' },
  ];

  const rows = sources.map((source) => {
    const isSelected = source.name === selectedSource;
    return [
      {
        text: `${isSelected ? '✅ ' : ''}${source.emoji} ${source.desc}`,
        callback_data: `${prefix}:${source.name}`,
      },
    ];
  });

  // Add all sources option
  rows.push([{ text: '📊 All Sources', callback_data: `${prefix}:ALL` }]);

  // Add back button
  rows.push([{ text: '« Back', callback_data: 'cmd:back' }]);

  return { inline_keyboard: rows };
};

// Time period selector
export const periodKeyboard = (
  selectedPeriod?: number,
  prefix: string = 'period'
): InlineKeyboardMarkup => {
  const periods = [
    { days: 1, label: '24 Hours' },
    { days: 7, label: '7 Days' },
    { days: 14, label: '14 Days' },
    { days: 30, label: '30 Days' },
  ];

  const rows = periods.map((period) => {
    const isSelected = period.days === selectedPeriod;
    return [
      {
        text: `${isSelected ? '✅ ' : ''}📅 ${period.label}`,
        callback_data: `${prefix}:${period.days}`,
      },
    ];
  });

  // Add back button
  rows.push([{ text: '« Back', callback_data: 'cmd:back' }]);

  return { inline_keyboard: rows };
};

// Alert type selector
export const alertTypeKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      { text: '📈 Above Rate', callback_data: 'alert:type:above' },
      { text: '📉 Below Rate', callback_data: 'alert:type:below' },
    ],
    [{ text: '« Back', callback_data: 'cmd:alert' }],
  ],
});

// Subscription type selector
export const subscriptionKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [{ text: '📅 Daily Updates', callback_data: 'subscribe:daily' }],
    [{ text: '📊 Weekly Summary', callback_data: 'subscribe:weekly' }],
    [{ text: '📋 View My Subscriptions', callback_data: 'subscribe:list' }],
    [{ text: '« Back to Menu', callback_data: 'cmd:menu' }],
  ],
});

// Settings menu keyboard
export const settingsKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [{ text: '🌐 Language', callback_data: 'settings:language' }],
    [{ text: '💱 Default Currency', callback_data: 'settings:currency' }],
    [{ text: '🏦 Preferred Source', callback_data: 'settings:source' }],
    [{ text: '🕐 Timezone', callback_data: 'settings:timezone' }],
    [{ text: '🔔 Notification Settings', callback_data: 'settings:notifications' }],
    [{ text: '« Back to Menu', callback_data: 'cmd:menu' }],
  ],
});

// Language selector
export const languageKeyboard = (selectedLang?: string): InlineKeyboardMarkup => {
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  ];

  return {
    inline_keyboard: [
      ...languages.map((lang) => {
        const isSelected = lang.code === selectedLang;
        return [
          {
            text: `${isSelected ? '✅ ' : ''}${lang.flag} ${lang.name}`,
            callback_data: `settings:lang:${lang.code}`,
          },
        ];
      }),
      [{ text: '« Back', callback_data: 'cmd:settings' }],
    ],
  };
};

// Confirmation keyboard
export const confirmKeyboard = (
  confirmData: string,
  cancelData: string = 'cmd:cancel'
): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      { text: '✅ Confirm', callback_data: confirmData },
      { text: '❌ Cancel', callback_data: cancelData },
    ],
  ],
});

// Pagination keyboard
export const paginationKeyboard = (
  currentPage: number,
  totalPages: number,
  prefix: string
): InlineKeyboardMarkup => {
  const buttons = [];

  // Previous button
  if (currentPage > 1) {
    buttons.push({
      text: '« Previous',
      callback_data: `${prefix}:page:${currentPage - 1}`,
    });
  }

  // Page indicator
  buttons.push({
    text: `${currentPage}/${totalPages}`,
    callback_data: 'noop',
  });

  // Next button
  if (currentPage < totalPages) {
    buttons.push({
      text: 'Next »',
      callback_data: `${prefix}:page:${currentPage + 1}`,
    });
  }

  return {
    inline_keyboard: [buttons, [{ text: '🏠 Home', callback_data: 'cmd:menu' }]],
  };
};

// Share keyboard
export const shareKeyboard = (shareData: string): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      {
        text: '📤 Share',
        switch_inline_query: shareData,
      },
    ],
    [{ text: '🔄 Refresh', callback_data: 'refresh' }],
    [{ text: '🏠 Home', callback_data: 'cmd:menu' }],
  ],
});

// Helper function to get currency flag
function getCurrencyFlag(currency: string): string {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    SGD: '🇸🇬',
    THB: '🇹🇭',
    CNY: '🇨🇳',
    GBP: '🇬🇧',
    JPY: '🇯🇵',
    AUD: '🇦🇺',
    MMK: '🇲🇲',
  };
  return flags[currency] ?? '💱';
}

// Helper to create custom keyboard from options
export const createOptionsKeyboard = (
  options: Array<{ text: string; data: string }>,
  columns: number = 1,
  backButton: boolean = true
): InlineKeyboardMarkup => {
  const rows = [];

  for (let i = 0; i < options.length; i += columns) {
    const row = [];
    for (let j = 0; j < columns && i + j < options.length; j++) {
      const option = options[i + j];
      if (option) {
        row.push({
          text: option.text,
          callback_data: option.data,
        });
      }
    }
    rows.push(row);
  }

  if (backButton) {
    rows.push([{ text: '« Back', callback_data: 'cmd:back' }]);
  }

  return { inline_keyboard: rows };
};
