import {
  saveAndCloseAllTabs,
  restoreAllTabs,
  clearAllSavedTabs,
} from "./tab.js";
import { scheduleGrouping } from "./group.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(
    [
      "enableManager",
      "enableGrouping",
      "keepWindowOpen",
      "optIgnoreProtocol",
      "optIgnoreWww",
      "optIgnoreQuery",
      "optIgnoreHash",
      "optDomainOnly",
      "optDisableWildcards",
    ],
    (res) => {
      const defaults = {
        enableManager: true,
        enableGrouping: true,
        keepWindowOpen: false,
        optIgnoreProtocol: true,
        optIgnoreWww: true,
        optIgnoreQuery: true,
        optIgnoreHash: true,
        optDomainOnly: false,
        optDisableWildcards: false,
      };

      const updates = {};
      for (const key in defaults) {
        if (res[key] === undefined) {
          updates[key] = defaults[key];
        }
      }
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates);
      }
    },
  );
});

chrome.commands.onCommand.addListener(async (command) => {
  const { enableManager } = await chrome.storage.local.get("enableManager");
  if (enableManager === false) return;

  if (command === "save_and_close_all_tabs") {
    saveAndCloseAllTabs();
  } else if (command === "restore_all_tabs") {
    restoreAllTabs();
  } else if (command === "clear_all_saved_tabs") {
    clearAllSavedTabs();
  }
});

const tryGrouping = async () => {
  const { enableGrouping } = await chrome.storage.local.get("enableGrouping");
  if (enableGrouping !== false) {
    scheduleGrouping();
  }
};

chrome.tabs.onCreated.addListener(tryGrouping);
chrome.runtime.onStartup.addListener(tryGrouping);
chrome.tabs.onRemoved.addListener(tryGrouping);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.groupId == null) {
    tryGrouping();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    const keysToCheck = [
      "groups",
      "enableGrouping",
      "optIgnoreProtocol",
      "optIgnoreWww",
      "optIgnoreQuery",
      "optIgnoreHash",
      "optDomainOnly",
      "optDisableWildcards",
    ];
    if (keysToCheck.some((k) => changes[k])) {
      tryGrouping();
    }
  }
});
