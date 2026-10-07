'use strict';

/** Сохранение через localStorage (JSON.stringify / JSON.parse). */
class SaveManager {
  static KEY = 'mashulik_save_v1';
  static SETTINGS_KEY = 'mashulik_settings_v1';

  static defaultSettings() {
    return { music: true, musicVolume: 0.6, sound: true, soundVolume: 0.8 };
  }

  static hasSave() {
    try {
      return !!localStorage.getItem(SaveManager.KEY);
    } catch (e) {
      return false;
    }
  }

  static save(data) {
    try {
      localStorage.setItem(SaveManager.KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Не удалось сохранить игру', e);
      return false;
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(SaveManager.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !data.version) return null;
      return data;
    } catch (e) {
      console.warn('Сохранение повреждено', e);
      return null;
    }
  }

  static reset() {
    try {
      localStorage.removeItem(SaveManager.KEY);
    } catch (e) { /* хранилище недоступно */ }
  }

  static loadSettings() {
    try {
      const raw = localStorage.getItem(SaveManager.SETTINGS_KEY);
      return Object.assign(SaveManager.defaultSettings(), raw ? JSON.parse(raw) : {});
    } catch (e) {
      return SaveManager.defaultSettings();
    }
  }

  static saveSettings(s) {
    try {
      localStorage.setItem(SaveManager.SETTINGS_KEY, JSON.stringify(s));
    } catch (e) { /* хранилище недоступно */ }
  }
}
