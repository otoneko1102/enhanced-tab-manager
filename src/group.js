let isGrouping = false;

function debounce(fn, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function normalizeUrl(url, settings) {
  let processed = url;

  if (settings.optIgnoreProtocol) {
    processed = processed.replace(/^https?:\/\//, "");
  }

  if (settings.optIgnoreWww) {
    processed = processed.replace(/^www\d*\./, "");
  }

  if (settings.optDomainOnly) {
    const slashIndex = processed.indexOf("/");
    if (slashIndex !== -1) {
      processed = processed.substring(0, slashIndex);
    }
    return processed;
  }

  if (settings.optIgnoreQuery) {
    const qIndex = processed.indexOf("?");
    if (qIndex !== -1) {
      processed = processed.substring(0, qIndex);
    }
  }

  if (settings.optIgnoreHash) {
    const hIndex = processed.indexOf("#");
    if (hIndex !== -1) {
      processed = processed.substring(0, hIndex);
    }
  }

  return processed;
}

function smartIncludes(url, pattern) {
  if (!pattern) return false;

  let searchPos = 0;
  while (searchPos < url.length) {
    const index = url.indexOf(pattern, searchPos);
    if (index === -1) return false;

    const prevChar = index > 0 ? url[index - 1] : null;
    const isBoundaryStart = index === 0 || /[^a-zA-Z0-9]/.test(prevChar);

    if (isBoundaryStart) {
      return true;
    }

    searchPos = index + 1;
  }

  return false;
}

function isMatch(url, pattern, disableWildcards) {
  if (!pattern) return false;

  if (disableWildcards) {
    return smartIncludes(url, pattern);
  }

  if (/^["'].*["']$/.test(pattern)) {
    const clean = pattern.slice(1, -1);
    return url === clean;
  }
  if (pattern.endsWith("*") && !pattern.startsWith("*")) {
    const clean = pattern.slice(0, -1);
    return url.startsWith(clean);
  }
  if (pattern.startsWith("*") && !pattern.endsWith("*")) {
    const clean = pattern.slice(1);
    return url.endsWith(clean);
  }
  const clean = pattern.replace(/^\*|\*$/g, "");
  return smartIncludes(url, clean);
}

export const scheduleGrouping = debounce(() => {
  if (isGrouping) return;

  chrome.storage.local.get(
    [
      "groups",
      "optIgnoreProtocol",
      "optIgnoreWww",
      "optIgnoreQuery",
      "optIgnoreHash",
      "optDomainOnly",
      "optDisableWildcards",
    ],
    (settings) => {
      const groups = settings.groups || [];
      applyTabGrouping(groups, settings);
    },
  );
}, 500);

async function applyTabGrouping(groups, settings) {
  isGrouping = true;
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const usedGroupIds = new Set();
    const processedTabIds = new Set();
    const groupPositions = [];

    const desiredNames = groups.map((g) => g.name).filter(Boolean);

    const allGroupIds = [...new Set(tabs.map((t) => t.groupId))].filter(
      (id) => id !== chrome.tabGroups.TAB_GROUP_ID_NONE,
    );

    for (const gid of allGroupIds) {
      try {
        const tg = await chrome.tabGroups.get(gid);
        if (!desiredNames.includes(tg.title)) {
        }
      } catch {}
    }

    for (const group of groups) {
      if (
        !group.name ||
        !Array.isArray(group.patterns) ||
        group.patterns.length === 0
      )
        continue;

      const matched = tabs.filter((t) => {
        if (processedTabIds.has(t.id) || typeof t.url !== "string")
          return false;
        const cleanUrl = normalizeUrl(t.url, settings);
        return group.patterns.some((p) =>
          isMatch(cleanUrl, p, settings.optDisableWildcards),
        );
      });

      if (matched.length === 0) continue;

      let existingGid = null;
      for (const t of matched) {
        if (
          t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE &&
          !usedGroupIds.has(t.groupId)
        ) {
          try {
            const tg = await chrome.tabGroups.get(t.groupId);
            if (tg.title === group.name) {
              existingGid = t.groupId;
              break;
            }
          } catch {}
        }
      }

      const ids = matched.map((t) => t.id).filter(Number.isInteger);
      let groupId = existingGid;
      const color = group.color || "grey";

      if (groupId != null) {
        await chrome.tabs.group({ groupId, tabIds: ids });
        await chrome.tabGroups.update(groupId, { color, title: group.name });
      } else {
        groupId = await chrome.tabs.group({ tabIds: ids });
        await chrome.tabGroups.update(groupId, { color, title: group.name });
      }
      usedGroupIds.add(groupId);

      groupPositions.push({
        groupId,
        index: Math.min(...matched.map((t) => t.index)),
      });

      ids.forEach((id) => processedTabIds.add(id));
    }

    for (const t of tabs) {
      if (
        !processedTabIds.has(t.id) &&
        t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
      ) {
        let isManagedGroup = false;
        try {
          const tg = await chrome.tabGroups.get(t.groupId);
          if (desiredNames.includes(tg.title)) {
            isManagedGroup = true;
          }
        } catch {}

        if (isManagedGroup) {
          const cleanUrl = normalizeUrl(t.url, settings);
          const matchesAny = groups.some((g) =>
            g.patterns.some((p) =>
              isMatch(cleanUrl, p, settings.optDisableWildcards),
            ),
          );

          if (!matchesAny) {
            try {
              await chrome.tabs.ungroup([t.id]);
            } catch {}
          }
        }
      }
    }

    const updated = await chrome.tabs.query({ currentWindow: true });
    groupPositions.sort((a, b) => a.index - b.index);
    for (const { groupId, index } of groupPositions) {
      try {
        await chrome.tabGroups.move(groupId, { index });
      } catch {}
    }
  } catch (err) {
    console.error("Grouping failed", err);
  } finally {
    isGrouping = false;
  }
}
