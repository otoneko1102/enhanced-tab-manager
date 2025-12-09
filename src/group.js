let isGrouping = false;

function debounce(fn, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function punycodeToUnicode(domain) {
  const base = 36;
  const tMin = 1;
  const tMax = 26;
  const skew = 38;
  const damp = 700;
  const initialBias = 72;
  const initialN = 128;
  const delimiter = "-";

  let output = [];
  let input = domain.split("");
  let i = domain.lastIndexOf(delimiter);
  let n = initialN;
  let bias = initialBias;
  let index = 0;

  if (i > 0) {
    output = input.slice(0, i);
    input = input.slice(i + 1);
  }

  while (input.length > 0) {
    let oldi = index;
    let w = 1;

    for (let k = base; ; k += base) {
      const charCode = input.shift().charCodeAt(0);
      const digit = charCode - (charCode < 58 ? 22 : charCode < 91 ? 65 : 97);
      index += digit * w;

      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;

      if (digit < t) break;
      w *= base - t;
    }

    bias = adapt(index - oldi, output.length + 1, oldi === 0);
    n += Math.floor(index / (output.length + 1));
    index %= output.length + 1;
    output.splice(index++, 0, String.fromCharCode(n));
  }

  return output.join("");

  function adapt(delta, numPoints, firstTime) {
    delta = firstTime ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > ((base - tMin) * tMax) >> 1) {
      delta = Math.floor(delta / (base - tMin));
      k += base;
    }
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
  }
}

function decodePunycodeUrl(url) {
  try {
    const punycodePattern = /\bxn--[a-zA-Z0-9\-]+/i;
    if (!punycodePattern.test(url)) return url;

    try {
      const urlObj = new URL(url.includes("://") ? url : `http://${url}`);
      const hostname = urlObj.hostname;
      if (hostname.includes("xn--")) {
        const decodedHost = hostname
          .split(".")
          .map((part) =>
            part.startsWith("xn--") ? punycodeToUnicode(part.slice(4)) : part,
          )
          .join(".");
        return url.replace(hostname, decodedHost);
      }
    } catch (e) {
      return url
        .split(".")
        .map((part) => {
          if (part.startsWith("xn--")) return punycodeToUnicode(part.slice(4));
          return part;
        })
        .join(".");
    }
    return url;
  } catch (e) {
    return url;
  }
}

function normalizeUrl(url, settings) {
  let processed = decodePunycodeUrl(url);

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
  const clean = pattern.replace(/\*/g, "");
  if (!clean) return false;

  let searchPos = 0;
  while (searchPos < url.length) {
    const index = url.indexOf(clean, searchPos);
    if (index === -1) return false;

    const startChar = clean[0];
    const isPatternStartAlpha = /[a-zA-Z0-9]/.test(startChar);

    let isBoundaryStart = true;
    if (isPatternStartAlpha) {
      const prevChar = index > 0 ? url[index - 1] : null;
      isBoundaryStart = index === 0 || /[^a-zA-Z0-9]/.test(prevChar);
    }

    const endChar = clean[clean.length - 1];
    const isPatternEndAlpha = /[a-zA-Z0-9]/.test(endChar);

    let isBoundaryEnd = true;
    if (isPatternEndAlpha) {
      const nextCharIndex = index + clean.length;
      const nextChar = nextCharIndex < url.length ? url[nextCharIndex] : null;
      isBoundaryEnd =
        nextCharIndex === url.length || /[^a-zA-Z0-9]/.test(nextChar);
    }

    if (isBoundaryStart && isBoundaryEnd) {
      return true;
    }

    searchPos = index + 1;
  }
  return false;
}

function isMatch(url, pattern, disableWildcards) {
  if (!pattern) return false;

  const currentDomain = url;
  const domain = pattern;

  if (domain === currentDomain) {
    return true;
  }

  if (disableWildcards) {
    return smartIncludes(currentDomain, domain);
  }

  if (domain.startsWith("*.")) {
    const cleanPattern = domain.replace("*", "");
    if (`.${currentDomain}`.endsWith(cleanPattern)) {
      return true;
    }
  }

  if (domain.endsWith(".*")) {
    const cleanPattern = domain.replace("*", "");
    if (`${currentDomain}.`.startsWith(cleanPattern)) {
      return true;
    }
  }

  if (domain.startsWith("*.") && domain.endsWith(".*")) {
    const cleanPattern = domain.replace(/\*/g, "");
    if (`${currentDomain}.`.includes(cleanPattern)) {
      return true;
    }
  }
  return smartIncludes(currentDomain, domain);
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
