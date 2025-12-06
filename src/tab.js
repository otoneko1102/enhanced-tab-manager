export async function saveAndCloseAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const newTabs = tabs
    .filter((tab) => typeof tab.url === "string")
    .map((tab) => ({
      title: tab.title || tab.url,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
    }));

  const res = await chrome.storage.local.get(["closedTabs", "keepWindowOpen"]);
  const existing = res.closedTabs || [];
  const keepWindowOpen = res.keepWindowOpen || false;

  await chrome.storage.local.set({ closedTabs: [...existing, ...newTabs] });

  if (keepWindowOpen) {
    await chrome.tabs.create({});
  }

  const ids = tabs.map((t) => t.id).filter(Number.isInteger);
  if (ids.length > 0) {
    chrome.tabs.remove(ids);
  }
}

export async function restoreAllTabs() {
  const { closedTabs = [] } = await chrome.storage.local.get("closedTabs");
  for (const { url } of closedTabs) {
    chrome.tabs.create({ url, active: false });
  }
  await chrome.storage.local.set({ closedTabs: [] });
}

export async function clearAllSavedTabs() {
  await chrome.storage.local.set({ closedTabs: [] });
}
